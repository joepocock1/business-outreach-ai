import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@resend.dev";
const SENDER_NAME = process.env.SENDER_NAME || "OutreachAI";

interface ProcessingResult {
  campaignId: string;
  campaignName: string;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

export const processCampaigns = inngest.createFunction(
  {
    id: "process-campaigns",
    name: "Process Active Campaigns",
  },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async () => {
    console.log("[Inngest] Starting campaign processing...");

    const results: ProcessingResult[] = [];
    const completedCampaigns: string[] = [];

    try {
      // Get current time info
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekday = currentDay >= 1 && currentDay <= 5;

      console.log(`[Inngest] Current time: ${now.toISOString()}, Hour: ${currentHour}, Day: ${currentDay}, Weekday: ${isWeekday}`);

      // Find active campaigns
      const campaigns = await db.campaign.findMany({
        where: { status: "Active" },
        include: {
          template: {
            include: {
              variations: {
                where: { isActive: true },
              },
            },
          },
          user: {
            select: {
              name: true,
              email: true,
              portfolioUrl: true,
            },
          },
        },
      });

      console.log(`[Inngest] Found ${campaigns.length} active campaigns`);

      for (const campaign of campaigns) {
        const result: ProcessingResult = {
          campaignId: campaign.id,
          campaignName: campaign.name,
          processed: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
        };

        try {
          // Check send window
          if (currentHour < campaign.sendWindowStart || currentHour >= campaign.sendWindowEnd) {
            console.log(`[Inngest] Campaign ${campaign.name}: Outside send window (${campaign.sendWindowStart}-${campaign.sendWindowEnd}), current: ${currentHour}`);
            continue;
          }

          // Check weekday constraint
          if (campaign.sendWeekdaysOnly && !isWeekday) {
            console.log(`[Inngest] Campaign ${campaign.name}: Weekdays only, today is weekend`);
            continue;
          }

          // Calculate rate limits
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const sentLastHour = await db.email.count({
            where: {
              campaignId: campaign.id,
              status: { in: ["Sent", "Delivered", "Opened", "Clicked", "Replied"] },
              sentAt: { gte: oneHourAgo },
            },
          });

          const sentToday = await db.email.count({
            where: {
              campaignId: campaign.id,
              status: { in: ["Sent", "Delivered", "Opened", "Clicked", "Replied"] },
              sentAt: { gte: startOfDay },
            },
          });

          const availableHourly = Math.max(0, campaign.emailsPerHour - sentLastHour);
          const availableDaily = Math.max(0, campaign.emailsPerDay - sentToday);
          const availableToSend = Math.min(availableHourly, availableDaily);

          console.log(`[Inngest] Campaign ${campaign.name}: Rate limits - hourly: ${availableHourly}, daily: ${availableDaily}, available: ${availableToSend}`);

          if (availableToSend === 0) {
            console.log(`[Inngest] Campaign ${campaign.name}: Rate limit reached`);
            continue;
          }

          // Get queued emails
          const queuedEmails = await db.email.findMany({
            where: {
              campaignId: campaign.id,
              status: "Queued",
            },
            include: {
              lead: true,
              variation: true,
            },
            take: availableToSend,
          });

          console.log(`[Inngest] Campaign ${campaign.name}: Found ${queuedEmails.length} queued emails to process`);

          if (queuedEmails.length === 0) {
            // Check if campaign is complete
            const remainingQueued = await db.email.count({
              where: {
                campaignId: campaign.id,
                status: "Queued",
              },
            });

            if (remainingQueued === 0) {
              console.log(`[Inngest] Campaign ${campaign.name}: No more queued emails, marking as completed`);
              await db.campaign.update({
                where: { id: campaign.id },
                data: {
                  status: "Completed",
                  completedAt: new Date(),
                },
              });
              completedCampaigns.push(campaign.id);
            }
            continue;
          }

          // Process each email
          for (const email of queuedEmails) {
            result.processed++;

            try {
              // Check unsubscribe list
              const unsubscribed = await db.unsubscribe.findUnique({
                where: { email: email.lead.email },
              });

              if (unsubscribed) {
                console.log(`[Inngest] Email ${email.id}: Lead ${email.lead.email} is unsubscribed`);
                await db.email.update({
                  where: { id: email.id },
                  data: { status: "Unsubscribed" },
                });
                result.skipped++;
                continue;
              }

              // Send via Resend
              console.log(`[Inngest] Sending email ${email.id} to ${email.lead.email}...`);

              const sendResult = await resend.emails.send({
                from: `${campaign.user.name || SENDER_NAME} <${SENDER_EMAIL}>`,
                to: email.lead.email,
                subject: email.subject,
                html: email.bodyHtml,
                text: email.bodyText,
                replyTo: campaign.user.email,
                tags: [
                  { name: "campaign_id", value: campaign.id },
                  { name: "variation_id", value: email.variationId },
                  { name: "email_id", value: email.id },
                ],
              });

              if (sendResult.error) {
                throw new Error(sendResult.error.message);
              }

              // Update email record
              await db.email.update({
                where: { id: email.id },
                data: {
                  status: "Sent",
                  sentAt: new Date(),
                  resendId: sendResult.data?.id,
                },
              });

              // Increment variation counter
              await db.emailVariation.update({
                where: { id: email.variationId },
                data: {
                  timesSent: { increment: 1 },
                },
              });

              // Increment campaign counter
              await db.campaign.update({
                where: { id: campaign.id },
                data: {
                  emailsSent: { increment: 1 },
                },
              });

              // Update lead status if first contact
              if (email.lead.status === "New") {
                await db.lead.update({
                  where: { id: email.lead.id },
                  data: { status: "Contacted" },
                });
              }

              console.log(`[Inngest] Email ${email.id}: Sent successfully, Resend ID: ${sendResult.data?.id}`);
              result.sent++;

            } catch (error) {
              console.error(`[Inngest] Email ${email.id}: Send failed`, error);

              // Update email with error
              const currentRetry = email.retryCount || 0;
              const newStatus = currentRetry < 2 ? "Queued" : "Failed"; // Max 3 attempts (0, 1, 2)

              await db.email.update({
                where: { id: email.id },
                data: {
                  status: newStatus,
                  errorMessage: error instanceof Error ? error.message : "Unknown error",
                  retryCount: currentRetry + 1,
                },
              });

              result.failed++;
            }
          }

          // Check if campaign completed after processing
          const remainingAfterProcessing = await db.email.count({
            where: {
              campaignId: campaign.id,
              status: "Queued",
            },
          });

          if (remainingAfterProcessing === 0) {
            console.log(`[Inngest] Campaign ${campaign.name}: Completed after processing`);
            await db.campaign.update({
              where: { id: campaign.id },
              data: {
                status: "Completed",
                completedAt: new Date(),
              },
            });
            completedCampaigns.push(campaign.id);
          }

        } catch (campaignError) {
          console.error(`[Inngest] Campaign ${campaign.id} error:`, campaignError);
        }

        results.push(result);
      }

      // Calculate totals
      const totals = results.reduce(
        (acc, r) => ({
          processed: acc.processed + r.processed,
          sent: acc.sent + r.sent,
          failed: acc.failed + r.failed,
          skipped: acc.skipped + r.skipped,
        }),
        { processed: 0, sent: 0, failed: 0, skipped: 0 }
      );

      console.log(`[Inngest] Processing complete. Totals:`, totals);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        campaigns: results.length,
        totals,
        completed: completedCampaigns,
        details: results,
      };

    } catch (error) {
      console.error("[Inngest] Fatal error:", error);
      throw error;
    }
  }
);

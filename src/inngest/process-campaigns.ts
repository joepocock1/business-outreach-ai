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
    console.log("[Inngest] ========== STARTING CAMPAIGN PROCESSING ==========");

    const results: ProcessingResult[] = [];
    const completedCampaigns: string[] = [];

    try {
      // DEBUG: Get counts of ALL campaigns by status
      const allCampaigns = await db.campaign.findMany({
        select: { id: true, name: true, status: true },
      });
      console.log(`[Inngest DEBUG] Total campaigns in database: ${allCampaigns.length}`);

      const statusCounts = allCampaigns.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`[Inngest DEBUG] Campaigns by status:`, JSON.stringify(statusCounts));

      // Log each campaign
      allCampaigns.forEach((c) => {
        console.log(`[Inngest DEBUG] Campaign: "${c.name}" (${c.id}) - Status: ${c.status}`);
      });

      // Get current time info
      const now = new Date();
      const currentHour = now.getUTCHours(); // Use UTC for consistency
      const currentDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const isWeekday = currentDay >= 1 && currentDay <= 5;

      console.log(`[Inngest] Current UTC time: ${now.toISOString()}`);
      console.log(`[Inngest] UTC Hour: ${currentHour}, UTC Day: ${currentDay} (0=Sun), Is Weekday: ${isWeekday}`);

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

      console.log(`[Inngest] Found ${campaigns.length} ACTIVE campaigns to process`);

      if (campaigns.length === 0) {
        console.log("[Inngest] NO ACTIVE CAMPAIGNS - Check if any campaigns have status='Active' in the database");
      }

      for (const campaign of campaigns) {
        console.log(`[Inngest] ---- Processing campaign: "${campaign.name}" (${campaign.id}) ----`);
        console.log(`[Inngest] Campaign settings: sendWindow=${campaign.sendWindowStart}-${campaign.sendWindowEnd}, weekdaysOnly=${campaign.sendWeekdaysOnly}`);

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
          // NOTE: Send window is in local time, but server runs in UTC
          // For now, we'll skip the send window check in debug mode
          const outsideSendWindow = currentHour < campaign.sendWindowStart || currentHour >= campaign.sendWindowEnd;
          console.log(`[Inngest] Send window check: currentHour=${currentHour}, window=${campaign.sendWindowStart}-${campaign.sendWindowEnd}, outside=${outsideSendWindow}`);

          if (outsideSendWindow) {
            console.log(`[Inngest] Campaign ${campaign.name}: SKIPPED - Outside send window`);
            // Continue anyway for debugging - comment this to enforce send window
            // continue;
          }

          // Check weekday constraint
          console.log(`[Inngest] Weekday check: isWeekday=${isWeekday}, weekdaysOnly=${campaign.sendWeekdaysOnly}`);
          if (campaign.sendWeekdaysOnly && !isWeekday) {
            console.log(`[Inngest] Campaign ${campaign.name}: SKIPPED - Weekdays only, today is weekend`);
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

          // DEBUG: Check all emails for this campaign
          const allCampaignEmails = await db.email.findMany({
            where: { campaignId: campaign.id },
            select: { id: true, status: true },
          });
          const emailStatusCounts = allCampaignEmails.reduce((acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log(`[Inngest] Campaign ${campaign.name}: Total emails in campaign: ${allCampaignEmails.length}`);
          console.log(`[Inngest] Campaign ${campaign.name}: Email statuses: ${JSON.stringify(emailStatusCounts)}`);

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

          console.log(`[Inngest] Campaign ${campaign.name}: Found ${queuedEmails.length} QUEUED emails to process (limit: ${availableToSend})`);

          if (queuedEmails.length > 0) {
            console.log(`[Inngest] First queued email: ${queuedEmails[0].id} to ${queuedEmails[0].lead.email}`);
          }

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

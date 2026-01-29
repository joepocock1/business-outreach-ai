import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Resend } from "resend";

/**
 * Test endpoint to send a single email from an active campaign.
 * Useful for local testing without waiting for cron.
 *
 * Usage: POST /api/test/send-one
 * Body: { campaignId?: string }
 *
 * If campaignId is not provided, picks the first active campaign.
 */
export async function POST(request: NextRequest) {
  // Read env vars inside the function (not at module load time)
  const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@resend.dev";
  const SENDER_NAME = process.env.SENDER_NAME || "OutreachAI";
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log(`[Test] SENDER_EMAIL: ${SENDER_EMAIL}`);
  console.log(`[Test] SENDER_NAME: ${SENDER_NAME}`);

  // Only allow in development or with auth
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV === "production" && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { campaignId } = body as { campaignId?: string };

    // Find campaign
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { status: "Active" };
    if (campaignId) {
      whereClause.id = campaignId;
    }
    if (session?.user?.id) {
      whereClause.userId = session.user.id;
    }

    const campaign = await db.campaign.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            portfolioUrl: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "No active campaign found" }, { status: 404 });
    }

    // Find one queued email
    const email = await db.email.findFirst({
      where: {
        campaignId: campaign.id,
        status: "Queued",
      },
      include: {
        lead: true,
        variation: true,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "No queued emails in campaign" }, { status: 404 });
    }

    // Check unsubscribe
    const unsubscribed = await db.unsubscribe.findUnique({
      where: { email: email.lead.email },
    });

    if (unsubscribed) {
      await db.email.update({
        where: { id: email.id },
        data: { status: "Unsubscribed" },
      });
      return NextResponse.json({
        success: false,
        reason: "Lead is unsubscribed",
        leadEmail: email.lead.email
      });
    }

    // Send via Resend
    console.log(`[Test] Sending email to ${email.lead.email}...`);

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
        { name: "test", value: "true" },
      ],
    });

    if (sendResult.error) {
      console.error("[Test] Send failed:", sendResult.error);

      await db.email.update({
        where: { id: email.id },
        data: {
          errorMessage: sendResult.error.message,
          retryCount: { increment: 1 },
        },
      });

      return NextResponse.json({
        success: false,
        error: sendResult.error.message
      }, { status: 500 });
    }

    // Update records
    await db.email.update({
      where: { id: email.id },
      data: {
        status: "Sent",
        sentAt: new Date(),
        resendId: sendResult.data?.id,
      },
    });

    await db.emailVariation.update({
      where: { id: email.variationId },
      data: { timesSent: { increment: 1 } },
    });

    await db.campaign.update({
      where: { id: campaign.id },
      data: { emailsSent: { increment: 1 } },
    });

    if (email.lead.status === "New") {
      await db.lead.update({
        where: { id: email.lead.id },
        data: { status: "Contacted" },
      });
    }

    console.log(`[Test] Email sent successfully! Resend ID: ${sendResult.data?.id}`);

    return NextResponse.json({
      success: true,
      emailId: email.id,
      resendId: sendResult.data?.id,
      to: email.lead.email,
      subject: email.subject,
      campaign: campaign.name,
      variation: email.variation.variationName,
    });

  } catch (error) {
    console.error("[Test] Error:", error);
    return NextResponse.json({
      error: "Send failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check test status
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV === "production" && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find active campaigns with queue info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = { status: "Active" };
  if (session?.user?.id) {
    whereClause.userId = session.user.id;
  }

  const campaigns = await db.campaign.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      status: true,
      emailsSent: true,
      totalLeads: true,
      _count: {
        select: {
          emails: {
            where: { status: "Queued" },
          },
        },
      },
    },
  });

  return NextResponse.json({
    activeCampaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      sent: c.emailsSent,
      total: c.totalLeads,
      queued: c._count.emails,
    })),
  });
}

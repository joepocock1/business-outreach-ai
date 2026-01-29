import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Resend Webhook Handler
 *
 * Handles email events from Resend:
 * - email.delivered
 * - email.bounced
 * - email.opened
 * - email.clicked
 * - email.complained (spam report)
 *
 * TODO: Add Svix signature verification for production security
 * See: https://resend.com/docs/dashboard/webhooks/verify
 */

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    subject?: string;
    // Additional fields vary by event type
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: ResendWebhookPayload = await request.json();

    console.log(`[Webhook] Received event: ${payload.type}`, {
      email_id: payload.data.email_id,
      created_at: payload.created_at,
    });

    const resendId = payload.data.email_id;
    const eventTime = new Date(payload.created_at);

    // Find the email record by Resend ID
    const email = await db.email.findUnique({
      where: { resendId },
      include: {
        variation: true,
        campaign: true,
      },
    });

    if (!email) {
      console.log(`[Webhook] Email not found for Resend ID: ${resendId}`);
      // Return 200 to prevent Resend from retrying
      return NextResponse.json({ received: true, status: "email_not_found" });
    }

    // Handle based on event type
    switch (payload.type) {
      case "email.delivered":
        await handleDelivered(email.id, eventTime);
        break;

      case "email.bounced":
        await handleBounced(email.id, email.campaignId, eventTime);
        break;

      case "email.opened":
        await handleOpened(email.id, email.variationId, email.campaignId, email.openedAt, eventTime);
        break;

      case "email.clicked":
        await handleClicked(email.id, email.variationId, email.campaignId, eventTime);
        break;

      case "email.complained":
        await handleComplained(email.id, eventTime);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${payload.type}`);
    }

    return NextResponse.json({ received: true, processed: payload.type });

  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    // Still return 200 to prevent Resend from retrying failed webhooks
    return NextResponse.json({ received: true, error: "processing_failed" });
  }
}

async function handleDelivered(emailId: string, eventTime: Date) {
  console.log(`[Webhook] Handling delivered for email ${emailId}`);

  await db.email.update({
    where: { id: emailId },
    data: {
      status: "Delivered",
      deliveredAt: eventTime,
    },
  });
}

async function handleBounced(emailId: string, campaignId: string | null, eventTime: Date) {
  console.log(`[Webhook] Handling bounced for email ${emailId}`);

  await db.$transaction(async (tx) => {
    // Update email status
    await tx.email.update({
      where: { id: emailId },
      data: {
        status: "Bounced",
        bouncedAt: eventTime,
      },
    });

    // Increment campaign bounce counter
    if (campaignId) {
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          emailsBounced: { increment: 1 },
        },
      });
    }
  });
}

async function handleOpened(
  emailId: string,
  variationId: string,
  campaignId: string | null,
  existingOpenedAt: Date | null,
  eventTime: Date
) {
  console.log(`[Webhook] Handling opened for email ${emailId}`);

  // Only count first open
  if (existingOpenedAt) {
    console.log(`[Webhook] Email ${emailId} already opened, skipping counter increment`);
    return;
  }

  await db.$transaction(async (tx) => {
    // Update email status
    await tx.email.update({
      where: { id: emailId },
      data: {
        status: "Opened",
        openedAt: eventTime,
      },
    });

    // Increment variation open counter
    await tx.emailVariation.update({
      where: { id: variationId },
      data: {
        timesOpened: { increment: 1 },
      },
    });

    // Increment campaign open counter
    if (campaignId) {
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          emailsOpened: { increment: 1 },
        },
      });
    }
  });
}

async function handleClicked(
  emailId: string,
  variationId: string,
  campaignId: string | null,
  eventTime: Date
) {
  console.log(`[Webhook] Handling clicked for email ${emailId}`);

  // Get current email to check if already clicked
  const email = await db.email.findUnique({
    where: { id: emailId },
    select: { clickedAt: true },
  });

  const isFirstClick = !email?.clickedAt;

  await db.$transaction(async (tx) => {
    // Always update email status and timestamp
    await tx.email.update({
      where: { id: emailId },
      data: {
        status: "Clicked",
        clickedAt: eventTime,
      },
    });

    // Only increment counters on first click
    if (isFirstClick) {
      // Increment variation click counter
      await tx.emailVariation.update({
        where: { id: variationId },
        data: {
          timesClicked: { increment: 1 },
        },
      });

      // Increment campaign click counter
      if (campaignId) {
        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            emailsClicked: { increment: 1 },
          },
        });
      }
    }
  });
}

async function handleComplained(emailId: string, eventTime: Date) {
  console.log(`[Webhook] Handling spam complaint for email ${emailId}`);

  // Get the lead email to add to unsubscribe list
  const email = await db.email.findUnique({
    where: { id: emailId },
    include: { lead: true },
  });

  if (email) {
    await db.$transaction(async (tx) => {
      // Update email status
      await tx.email.update({
        where: { id: emailId },
        data: {
          status: "Bounced", // Treat complaints like bounces
          bouncedAt: eventTime,
          errorMessage: "Spam complaint",
        },
      });

      // Add to unsubscribe list
      await tx.unsubscribe.upsert({
        where: { email: email.lead.email },
        update: {
          reason: "Spam complaint",
          unsubscribedAt: eventTime,
        },
        create: {
          email: email.lead.email,
          reason: "Spam complaint",
          unsubscribedAt: eventTime,
        },
      });
    });
  }
}

// Allow GET for webhook verification (some services use this)
export async function GET() {
  return NextResponse.json({ status: "Webhook endpoint active" });
}

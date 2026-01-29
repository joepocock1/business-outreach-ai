"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markEmailReplied(
  emailId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Get email and verify ownership through campaign
    const email = await db.email.findFirst({
      where: { id: emailId },
      include: {
        campaign: {
          select: { id: true, userId: true },
        },
        lead: {
          select: { id: true },
        },
        variation: {
          select: { id: true },
        },
      },
    });

    if (!email) {
      return { error: "Email not found" };
    }

    if (email.campaign?.userId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    // Only allow marking reply for certain statuses
    const allowedStatuses = ["Sent", "Delivered", "Opened", "Clicked"];
    if (!allowedStatuses.includes(email.status)) {
      return { error: `Cannot mark as replied: email status is ${email.status}` };
    }

    // Update in transaction
    await db.$transaction(async (tx) => {
      // Update email status
      await tx.email.update({
        where: { id: emailId },
        data: {
          status: "Replied",
          repliedAt: new Date(),
        },
      });

      // Increment variation reply counter
      await tx.emailVariation.update({
        where: { id: email.variationId },
        data: {
          timesReplied: { increment: 1 },
        },
      });

      // Increment campaign reply counter
      if (email.campaignId) {
        await tx.campaign.update({
          where: { id: email.campaignId },
          data: {
            emailsReplied: { increment: 1 },
          },
        });
      }

      // Update lead status to Responded
      await tx.lead.update({
        where: { id: email.leadId },
        data: {
          status: "Responded",
        },
      });
    });

    revalidatePath(`/dashboard/campaigns/${email.campaignId}`);
    return { success: true };

  } catch (error) {
    console.error("Mark email replied error:", error);
    return { error: "Failed to mark email as replied" };
  }
}

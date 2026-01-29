"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteCampaign(
  campaignId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Get campaign and verify ownership
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
    });

    if (!campaign) {
      return { error: "Campaign not found" };
    }

    // Can only delete Draft, Completed, or Cancelled campaigns
    if (!["Draft", "Completed", "Cancelled"].includes(campaign.status)) {
      return { error: "Cannot delete an active or scheduled campaign. Stop it first." };
    }

    // Delete campaign (cascades to CampaignLead and Email records)
    await db.campaign.delete({
      where: { id: campaignId },
    });

    revalidatePath("/dashboard/campaigns");
    return { success: true };
  } catch (error) {
    console.error("Delete campaign error:", error);
    return { error: "Failed to delete campaign" };
  }
}

export async function cancelCampaign(
  campaignId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Get campaign and verify ownership
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
    });

    if (!campaign) {
      return { error: "Campaign not found" };
    }

    // Can only cancel Active, Scheduled, or Paused campaigns
    if (!["Active", "Scheduled", "Paused"].includes(campaign.status)) {
      return { error: "Campaign cannot be cancelled in its current state" };
    }

    // Update campaign status to Cancelled
    await db.$transaction(async (tx) => {
      // Update campaign status
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: "Cancelled",
          completedAt: new Date(),
        },
      });

      // Mark all queued emails as failed/cancelled
      await tx.email.updateMany({
        where: {
          campaignId,
          status: "Queued",
        },
        data: {
          status: "Failed",
          errorMessage: "Campaign cancelled",
        },
      });
    });

    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("Cancel campaign error:", error);
    return { error: "Failed to cancel campaign" };
  }
}

export async function pauseCampaign(
  campaignId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Get campaign and verify ownership
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
    });

    if (!campaign) {
      return { error: "Campaign not found" };
    }

    // Can only pause Active campaigns
    if (campaign.status !== "Active") {
      return { error: "Only active campaigns can be paused" };
    }

    // Update campaign status to Paused
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "Paused" },
    });

    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("Pause campaign error:", error);
    return { error: "Failed to pause campaign" };
  }
}

export async function resumeCampaign(
  campaignId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Get campaign and verify ownership
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
    });

    if (!campaign) {
      return { error: "Campaign not found" };
    }

    // Can only resume Paused campaigns
    if (campaign.status !== "Paused") {
      return { error: "Only paused campaigns can be resumed" };
    }

    // Update campaign status back to Active
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "Active" },
    });

    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("Resume campaign error:", error);
    return { error: "Failed to resume campaign" };
  }
}

"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { campaignSchema, CampaignInput } from "@/lib/validations/campaign";
import { z } from "zod";
import { renderEmail } from "@/lib/email";

export async function createCampaign(
  data: CampaignInput,
  forLaunch: boolean = false
): Promise<{ campaignId?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Validate input
    const validated = campaignSchema.parse(data);

    // Verify template belongs to user and has variations
    const template = await db.template.findFirst({
      where: {
        id: validated.templateId,
        userId: session.user.id,
      },
      include: {
        variations: {
          where: { isActive: true },
        },
      },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    if (forLaunch && template.variations.length === 0) {
      return { error: "Template has no active variations. Generate variations first." };
    }

    // Verify all leads belong to user
    const leads = await db.lead.findMany({
      where: {
        id: { in: validated.leadIds },
        userId: session.user.id,
      },
    });

    if (leads.length !== validated.leadIds.length) {
      return { error: "Some selected leads were not found" };
    }

    // Create campaign and campaign leads in a transaction
    const campaign = await db.$transaction(async (tx) => {
      // Create the campaign
      const newCampaign = await tx.campaign.create({
        data: {
          userId: session.user.id,
          templateId: validated.templateId,
          name: validated.name,
          description: validated.description,
          status: "Draft",
          sendingStrategy: validated.strategy,
          emailsPerHour: validated.emailsPerHour,
          emailsPerDay: validated.emailsPerDay,
          sendWindowStart: validated.sendWindowStart,
          sendWindowEnd: validated.sendWindowEnd,
          sendWeekdaysOnly: validated.sendWeekdaysOnly,
          scheduledFor: validated.scheduledFor,
          totalLeads: leads.length,
        },
      });

      // Create campaign leads
      await tx.campaignLead.createMany({
        data: leads.map((lead) => ({
          campaignId: newCampaign.id,
          leadId: lead.id,
        })),
      });

      return newCampaign;
    });

    return { campaignId: campaign.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Create campaign error:", error);
    return { error: "Failed to create campaign" };
  }
}

export async function launchCampaign(
  campaignId: string,
  startImmediately: boolean
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Get campaign with template, variations, and leads
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
      include: {
        template: {
          include: {
            variations: {
              where: { isActive: true },
            },
          },
        },
        leadSelections: {
          include: {
            lead: true,
          },
        },
      },
    });

    if (!campaign) {
      return { error: "Campaign not found" };
    }

    if (campaign.status !== "Draft") {
      return { error: "Campaign is not in draft status" };
    }

    const variations = campaign.template.variations;
    if (variations.length === 0) {
      return { error: "Template has no active variations" };
    }

    const leads = campaign.leadSelections.map((cl) => cl.lead);
    if (leads.length === 0) {
      return { error: "No leads selected for this campaign" };
    }

    // Get user info for email rendering
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Create emails in a transaction
    await db.$transaction(async (tx) => {
      // Assign variations to leads using strategy
      const emailsToCreate = leads.map((lead, index) => {
        // For balanced strategy, distribute evenly
        // For winner_focused, we'll handle this in the cron job after we have performance data
        const variationIndex = index % variations.length;
        const variation = variations[variationIndex];

        // Render the email with variables
        const variables = {
          businessName: lead.businessName,
          contactName: lead.contactName || lead.businessName,
          yourName: user.name,
          portfolioUrl: user.portfolioUrl || "",
        };

        const rendered = renderEmail({
          subject: variation.subject,
          bodyHtml: variation.bodyHtml,
          bodyText: variation.bodyText,
          variables,
          includeFooter: true,
          senderEmail: user.email,
          senderName: user.name,
          leadEmail: lead.email,
        });

        return {
          leadId: lead.id,
          campaignId: campaign.id,
          variationId: variation.id,
          subject: rendered.subject,
          bodyHtml: rendered.bodyHtml,
          bodyText: rendered.bodyText,
          status: "Queued",
        };
      });

      // Create all email records
      await tx.email.createMany({
        data: emailsToCreate,
      });

      // Update campaign status
      const newStatus = startImmediately ? "Active" : "Scheduled";
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: newStatus,
          startedAt: startImmediately ? new Date() : null,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Launch campaign error:", error);
    return { error: "Failed to launch campaign" };
  }
}

export async function getTemplates() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return [];
  }

  const templates = await db.template.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { variations: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    variationCount: t._count.variations,
  }));
}

export async function getLeads(options?: {
  status?: string;
  industry?: string;
  search?: string;
  excludeContacted?: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return [];
  }

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId: session.user.id };

  if (options?.status && options.status !== "__all__") {
    where.status = options.status;
  }

  if (options?.industry && options.industry !== "__all__") {
    where.industry = options.industry;
  }

  if (options?.search) {
    where.OR = [
      { businessName: { contains: options.search, mode: "insensitive" } },
      { email: { contains: options.search, mode: "insensitive" } },
      { contactName: { contains: options.search, mode: "insensitive" } },
    ];
  }

  if (options?.excludeContacted) {
    where.status = "New";
  }

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      businessName: true,
      contactName: true,
      email: true,
      industry: true,
      status: true,
    },
  });

  return leads;
}

export async function getLeadById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  return db.lead.findFirst({
    where: { id, userId: session.user.id },
  });
}

export async function getTemplateWithVariations(templateId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  return db.template.findFirst({
    where: {
      id: templateId,
      userId: session.user.id,
    },
    include: {
      variations: {
        where: { isActive: true },
        take: 1,
      },
    },
  });
}

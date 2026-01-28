"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadSchema, LeadInput } from "@/lib/validations/lead";
import { z } from "zod";

export async function getLeads(params?: {
  search?: string;
  status?: string;
  industry?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const {
    search = "",
    status,
    industry,
    page = 1,
    pageSize = 20,
  } = params || {};

  const where = {
    userId: session.user.id,
    ...(search && {
      OR: [
        { businessName: { contains: search, mode: "insensitive" as const } },
        { contactName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status }),
    ...(industry && { industry }),
  };

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.lead.count({ where }),
  ]);

  return {
    leads,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

export async function getLead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const lead = await db.lead.findFirst({
    where: { id, userId: session.user.id },
    include: {
      emails: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { variation: true },
      },
    },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  return lead;
}

export async function createLead(data: LeadInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const validated = leadSchema.parse(data);

    // Check for duplicate email
    const existing = await db.lead.findFirst({
      where: { userId: session.user.id, email: validated.email },
    });

    if (existing) {
      return { error: "A lead with this email already exists" };
    }

    const lead = await db.lead.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard/leads");
    return { success: true, lead };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Create lead error:", error);
    return { error: "Failed to create lead" };
  }
}

export async function updateLead(id: string, data: Partial<LeadInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify ownership
    const existing = await db.lead.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return { error: "Lead not found" };
    }

    // If email is changing, check for duplicates
    if (data.email && data.email !== existing.email) {
      const duplicate = await db.lead.findFirst({
        where: {
          userId: session.user.id,
          email: data.email,
          NOT: { id },
        },
      });

      if (duplicate) {
        return { error: "A lead with this email already exists" };
      }
    }

    const lead = await db.lead.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${id}`);
    return { success: true, lead };
  } catch (error) {
    console.error("Update lead error:", error);
    return { error: "Failed to update lead" };
  }
}

export async function deleteLead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify ownership
    const existing = await db.lead.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return { error: "Lead not found" };
    }

    await db.lead.delete({ where: { id } });

    revalidatePath("/dashboard/leads");
    return { success: true };
  } catch (error) {
    console.error("Delete lead error:", error);
    return { error: "Failed to delete lead" };
  }
}

export async function deleteLeads(ids: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await db.lead.deleteMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard/leads");
    return { success: true };
  } catch (error) {
    console.error("Delete leads error:", error);
    return { error: "Failed to delete leads" };
  }
}

export async function updateLeadStatus(id: string, status: string) {
  return updateLead(id, { status: status as LeadInput["status"] });
}

export async function importLeads(
  leads: Array<{
    businessName: string;
    email: string;
    contactName?: string;
    phone?: string;
    address?: string;
    industry?: string;
  }>
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        // Check for duplicate
        const existing = await db.lead.findFirst({
          where: { userId: session.user.id, email: lead.email },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await db.lead.create({
          data: {
            ...lead,
            userId: session.user.id,
            source: "CSV Import",
            status: "New",
            tags: [],
          },
        });

        imported++;
      } catch (err) {
        errors.push(`Failed to import ${lead.email}: ${err}`);
      }
    }

    revalidatePath("/dashboard/leads");
    return {
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 5), // Return first 5 errors
    };
  } catch (error) {
    console.error("Import leads error:", error);
    return { error: "Failed to import leads" };
  }
}

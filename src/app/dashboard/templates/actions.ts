"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { templateSchema, TemplateInput } from "@/lib/validations/template";
import { z } from "zod";

export async function getTemplates() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const templates = await db.template.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      variations: {
        select: {
          id: true,
          isActive: true,
          isWinner: true,
          openRate: true,
          replyRate: true,
        },
      },
      _count: {
        select: { campaigns: true },
      },
    },
  });

  return templates;
}

export async function getTemplate(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const template = await db.template.findFirst({
    where: { id, userId: session.user.id },
    include: {
      variations: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  return template;
}

export async function createTemplate(data: TemplateInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const validated = templateSchema.parse(data);

    const template = await db.template.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard/templates");
    return { success: true, template };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Create template error:", error);
    return { error: "Failed to create template" };
  }
}

export async function updateTemplate(id: string, data: Partial<TemplateInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify ownership
    const existing = await db.template.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return { error: "Template not found" };
    }

    const template = await db.template.update({
      where: { id },
      data,
    });

    revalidatePath("/dashboard/templates");
    revalidatePath(`/dashboard/templates/${id}`);
    return { success: true, template };
  } catch (error) {
    console.error("Update template error:", error);
    return { error: "Failed to update template" };
  }
}

export async function deleteTemplate(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify ownership
    const existing = await db.template.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return { error: "Template not found" };
    }

    await db.template.delete({ where: { id } });

    revalidatePath("/dashboard/templates");
    return { success: true };
  } catch (error) {
    console.error("Delete template error:", error);
    return { error: "Failed to delete template" };
  }
}

export async function duplicateTemplate(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const original = await db.template.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!original) {
      return { error: "Template not found" };
    }

    const template = await db.template.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        masterSubject: original.masterSubject,
        masterBody: original.masterBody,
        targetIndustry: original.targetIndustry,
        tone: original.tone,
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard/templates");
    return { success: true, template };
  } catch (error) {
    console.error("Duplicate template error:", error);
    return { error: "Failed to duplicate template" };
  }
}

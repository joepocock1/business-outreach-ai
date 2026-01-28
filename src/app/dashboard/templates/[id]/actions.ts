"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateEmailVariations } from "@/lib/ai";

export async function generateVariations(templateId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Get the template
    const template = await db.template.findFirst({
      where: { id: templateId, userId: session.user.id },
    });

    if (!template) {
      return { error: "Template not found" };
    }

    // Get user info for context
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Generate variations using AI
    const variations = await generateEmailVariations({
      masterSubject: template.masterSubject,
      masterBody: template.masterBody,
      tone: template.tone,
      targetIndustry: template.targetIndustry,
      userName: user.name,
      businessName: user.businessName || user.name,
      portfolioUrl: user.portfolioUrl || "",
    });

    // Delete existing variations
    await db.emailVariation.deleteMany({
      where: { templateId },
    });

    // Create new variations
    const created = await db.emailVariation.createMany({
      data: variations.map((v) => ({
        templateId,
        variationName: v.variationName,
        subject: v.subject,
        bodyHtml: v.bodyHtml,
        bodyText: v.bodyText,
        copywritingFramework: v.copywritingFramework,
        estimatedLength: v.estimatedLength,
        toneAnalysis: v.toneAnalysis,
        isActive: true,
        isWinner: false,
      })),
    });

    revalidatePath(`/dashboard/templates/${templateId}`);
    return { success: true, count: created.count };
  } catch (error) {
    console.error("Generate variations error:", error);
    return { error: "Failed to generate variations" };
  }
}

export async function toggleVariationActive(variationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const variation = await db.emailVariation.findFirst({
      where: { id: variationId },
      include: { template: true },
    });

    if (!variation || variation.template.userId !== session.user.id) {
      return { error: "Variation not found" };
    }

    await db.emailVariation.update({
      where: { id: variationId },
      data: { isActive: !variation.isActive },
    });

    revalidatePath(`/dashboard/templates/${variation.templateId}`);
    return { success: true };
  } catch (error) {
    console.error("Toggle variation error:", error);
    return { error: "Failed to update variation" };
  }
}

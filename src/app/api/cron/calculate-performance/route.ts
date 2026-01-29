import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Performance Calculator Cron Job
 *
 * Runs daily to:
 * 1. Calculate open/click/reply rates for all variations
 * 2. Identify and mark "winner" variations
 *
 * Winner criteria:
 * - At least 30 sends (statistical significance)
 * - Reply rate >= 5%
 * - Reply rate >= 1.5x the template's average reply rate
 */

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[Performance] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("[Performance] Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Performance] Starting performance calculation...");

  try {
    // Get all variations with sends
    const variations = await db.emailVariation.findMany({
      where: { timesSent: { gt: 0 } },
      include: {
        template: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(`[Performance] Found ${variations.length} variations with sends`);

    let updatedCount = 0;
    let winnersMarked = 0;
    let winnersUnmarked = 0;

    // Calculate rates for each variation
    for (const variation of variations) {
      const openRate = variation.timesOpened / variation.timesSent;
      const clickRate = variation.timesClicked / variation.timesSent;
      const replyRate = variation.timesReplied / variation.timesSent;

      await db.emailVariation.update({
        where: { id: variation.id },
        data: {
          openRate,
          clickRate,
          replyRate,
        },
      });

      updatedCount++;
    }

    console.log(`[Performance] Updated rates for ${updatedCount} variations`);

    // Group variations by template for winner calculation
    const variationsByTemplate = variations.reduce((acc, v) => {
      if (!acc[v.templateId]) {
        acc[v.templateId] = [];
      }
      acc[v.templateId].push(v);
      return acc;
    }, {} as Record<string, typeof variations>);

    // Calculate winners for each template
    for (const [templateId, templateVariations] of Object.entries(variationsByTemplate)) {
      // Calculate average reply rate for this template
      const variationsWithSufficientData = templateVariations.filter(v => v.timesSent >= 30);

      if (variationsWithSufficientData.length === 0) {
        console.log(`[Performance] Template ${templateId}: No variations with 30+ sends`);
        continue;
      }

      const totalReplies = variationsWithSufficientData.reduce((sum, v) => sum + v.timesReplied, 0);
      const totalSends = variationsWithSufficientData.reduce((sum, v) => sum + v.timesSent, 0);
      const avgReplyRate = totalSends > 0 ? totalReplies / totalSends : 0;

      console.log(`[Performance] Template ${templateId}: Avg reply rate = ${(avgReplyRate * 100).toFixed(2)}%`);

      // Determine winners
      for (const variation of templateVariations) {
        const replyRate = variation.timesSent > 0 ? variation.timesReplied / variation.timesSent : 0;

        const meetsMinSends = variation.timesSent >= 30;
        const meetsMinReplyRate = replyRate >= 0.05; // 5%
        const beatsBenchmark = replyRate >= avgReplyRate * 1.5; // 50% better than average

        const shouldBeWinner = meetsMinSends && meetsMinReplyRate && beatsBenchmark;

        if (shouldBeWinner && !variation.isWinner) {
          // Mark as winner
          await db.emailVariation.update({
            where: { id: variation.id },
            data: { isWinner: true },
          });
          winnersMarked++;
          console.log(`[Performance] Marked winner: ${variation.variationName} (${(replyRate * 100).toFixed(2)}% reply rate)`);
        } else if (!shouldBeWinner && variation.isWinner) {
          // Unmark as winner
          await db.emailVariation.update({
            where: { id: variation.id },
            data: { isWinner: false },
          });
          winnersUnmarked++;
          console.log(`[Performance] Unmarked winner: ${variation.variationName}`);
        }
      }
    }

    console.log(`[Performance] Complete. Updated: ${updatedCount}, Winners marked: ${winnersMarked}, Winners unmarked: ${winnersUnmarked}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      variationsUpdated: updatedCount,
      winnersMarked,
      winnersUnmarked,
    });

  } catch (error) {
    console.error("[Performance] Error:", error);
    return NextResponse.json(
      { error: "Calculation failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

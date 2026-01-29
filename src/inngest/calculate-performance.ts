import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db";

/**
 * Performance Calculator
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

export const calculatePerformance = inngest.createFunction(
  {
    id: "calculate-performance",
    name: "Calculate Variation Performance",
  },
  { cron: "0 2 * * *" }, // Daily at 2am UTC
  async () => {
    console.log("[Inngest Performance] Starting performance calculation...");

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

      console.log(`[Inngest Performance] Found ${variations.length} variations with sends`);

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

      console.log(`[Inngest Performance] Updated rates for ${updatedCount} variations`);

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
          console.log(`[Inngest Performance] Template ${templateId}: No variations with 30+ sends`);
          continue;
        }

        const totalReplies = variationsWithSufficientData.reduce((sum, v) => sum + v.timesReplied, 0);
        const totalSends = variationsWithSufficientData.reduce((sum, v) => sum + v.timesSent, 0);
        const avgReplyRate = totalSends > 0 ? totalReplies / totalSends : 0;

        console.log(`[Inngest Performance] Template ${templateId}: Avg reply rate = ${(avgReplyRate * 100).toFixed(2)}%`);

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
            console.log(`[Inngest Performance] Marked winner: ${variation.variationName} (${(replyRate * 100).toFixed(2)}% reply rate)`);
          } else if (!shouldBeWinner && variation.isWinner) {
            // Unmark as winner
            await db.emailVariation.update({
              where: { id: variation.id },
              data: { isWinner: false },
            });
            winnersUnmarked++;
            console.log(`[Inngest Performance] Unmarked winner: ${variation.variationName}`);
          }
        }
      }

      console.log(`[Inngest Performance] Complete. Updated: ${updatedCount}, Winners marked: ${winnersMarked}, Winners unmarked: ${winnersUnmarked}`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        variationsUpdated: updatedCount,
        winnersMarked,
        winnersUnmarked,
      };

    } catch (error) {
      console.error("[Inngest Performance] Error:", error);
      throw error;
    }
  }
);

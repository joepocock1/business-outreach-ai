import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { processCampaigns } from "@/inngest/process-campaigns";
import { calculatePerformance } from "@/inngest/calculate-performance";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processCampaigns, calculatePerformance],
});

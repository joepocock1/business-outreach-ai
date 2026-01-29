import { z } from "zod";

export const campaignStrategies = [
  { value: "balanced", label: "Balanced A/B Test", description: "Distribute emails evenly across all variations" },
  { value: "winner_focused", label: "Winner Focused", description: "After 30 sends per variation, send 70% to best performer" },
] as const;

export type CampaignStrategy = (typeof campaignStrategies)[number]["value"];

export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Name must be under 100 characters"),
  description: z.string().max(500, "Description must be under 500 characters").optional(),
  templateId: z.string().min(1, "Please select a template"),
  leadIds: z.array(z.string()).min(1, "Please select at least one lead"),
  strategy: z.enum(["balanced", "winner_focused"]).default("balanced"),
  emailsPerHour: z.number().min(1).max(50).default(10),
  emailsPerDay: z.number().min(1).max(200).default(50),
  sendWindowStart: z.number().min(0).max(23).default(9), // Hour in 24h format
  sendWindowEnd: z.number().min(0).max(23).default(17),
  sendWeekdaysOnly: z.boolean().default(true),
  scheduledFor: z.date().optional(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

// Validation for creating a draft
export const draftCampaignSchema = campaignSchema.partial({
  leadIds: true,
  strategy: true,
  emailsPerHour: true,
  emailsPerDay: true,
  sendWindowStart: true,
  sendWindowEnd: true,
  sendWeekdaysOnly: true,
});

export type DraftCampaignInput = z.infer<typeof draftCampaignSchema>;

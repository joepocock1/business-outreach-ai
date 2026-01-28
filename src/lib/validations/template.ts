import { z } from "zod";

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  masterSubject: z.string().min(1, "Subject line is required"),
  masterBody: z.string().min(1, "Email body is required"),
  targetIndustry: z.string().optional(),
  tone: z.enum(["professional", "casual", "friendly"]).default("professional"),
});

export type TemplateInput = z.infer<typeof templateSchema>;

export const tones = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "friendly", label: "Friendly" },
] as const;

export const templateVariables = [
  { key: "businessName", description: "The lead's business name" },
  { key: "contactName", description: "The lead's contact person name" },
  { key: "yourName", description: "Your name" },
  { key: "businessName", description: "Your business name" },
  { key: "portfolioUrl", description: "Your portfolio URL" },
  { key: "phone", description: "Your phone number" },
] as const;

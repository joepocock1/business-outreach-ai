import { z } from "zod";

export const leadSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z
    .enum(["New", "Contacted", "Responded", "Qualified", "Won", "Lost"])
    .default("New"),
  notes: z.string().optional(),
  source: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const leadStatuses = [
  { value: "New", label: "New", color: "bg-gray-100 text-gray-800" },
  { value: "Contacted", label: "Contacted", color: "bg-blue-100 text-blue-800" },
  { value: "Responded", label: "Responded", color: "bg-green-100 text-green-800" },
  { value: "Qualified", label: "Qualified", color: "bg-purple-100 text-purple-800" },
  { value: "Won", label: "Won", color: "bg-emerald-100 text-emerald-800" },
  { value: "Lost", label: "Lost", color: "bg-red-100 text-red-800" },
] as const;

export const industries = [
  "Restaurant",
  "Cafe",
  "Retail",
  "Contractor",
  "Health & Fitness",
  "Beauty & Personal Care",
  "Automotive",
  "Legal Services",
  "Cleaning Services",
  "Other",
] as const;

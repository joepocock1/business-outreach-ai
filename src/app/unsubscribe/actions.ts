"use server";

import { unsubscribeEmail } from "@/lib/email";
import { z } from "zod";

const unsubscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  reason: z.string().optional(),
});

export async function unsubscribe(email: string, reason?: string) {
  try {
    const validated = unsubscribeSchema.parse({ email, reason });

    const result = await unsubscribeEmail(validated.email, validated.reason);

    if (!result.success) {
      return { error: result.error || "Failed to unsubscribe" };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Unsubscribe error:", error);
    return { error: "An error occurred. Please try again." };
  }
}

"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export async function signup(data: SignupInput) {
  try {
    const validated = signupSchema.parse(data);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { error: "An account with this email already exists" };
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(validated.password, 12);

    // Create the user
    const user = await db.user.create({
      data: {
        email: validated.email,
        passwordHash,
        name: validated.name,
        businessName: validated.businessName || null,
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Signup error:", error);
    return { error: "An error occurred during signup" };
  }
}

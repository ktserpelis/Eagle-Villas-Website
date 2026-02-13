// shared/auth/schemas.ts
import { z } from "zod";

// ========================
// Login schema
// ========================
export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email" }),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ========================
// Base register fields (shared)
// ========================
const baseRegisterFields = {
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  email: z.string().email({ message: "Invalid email" }),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
};

// ========================
// FRONTEND: Register schema (with confirmPassword)
// ========================
export const registerSchema = z
  .object({
    ...baseRegisterFields,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ========================
// BACKEND: Register body schema (no confirmPassword)
// ========================
export const registerBodySchema = z.object(baseRegisterFields);
export type RegisterBodyInput = z.infer<typeof registerBodySchema>;


import { z } from "zod";

export const contactSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),

  email: z
    .string()
    .email("Please enter a valid email"),

  phone: z
    .string()
    .max(40, "Phone number is too long")
    .optional()
    .or(z.literal("")), // allow empty string

  message: z
    .string()
    .min(10, "Please write at least 10 characters")
    .max(2000, "Message is too long"),
});

export type ContactInput = z.infer<typeof contactSchema>;

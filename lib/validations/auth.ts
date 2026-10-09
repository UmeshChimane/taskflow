import { z } from "zod";

const emailSchema = z.string().trim().email("Enter a valid email address")
  .max(254, "Email is too long").transform(value => value.toLowerCase());

// Keep legacy passwords usable at login; reject bcrypt truncation for new accounts.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128, "Password is too long"),
});

export const registrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
  email: emailSchema,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long")
    .refine(value => new TextEncoder().encode(value).length <= 72,
      "Password must be at most 72 UTF-8 bytes"),
});

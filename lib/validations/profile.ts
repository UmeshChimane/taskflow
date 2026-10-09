import { z } from "zod";
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  jobTitle: z.string().trim().max(80, "Job title is too long").optional().default(""),
  bio: z.string().trim().max(500, "Bio is too long").optional().default(""),
});

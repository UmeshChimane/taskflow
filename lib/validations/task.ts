import { z } from "zod";

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title is too long"),

  description: z
    .string()
    .max(1000, "Description is too long")
    .optional()
    .default(""),

  status: z.enum([
    "todo",
    "in-progress",
    "done",
  ]),

  priority: z.enum([
    "low",
    "medium",
    "high",
  ]),

  dueDate: z
    .string()
    .nullable()
    .optional(),

  // Multiple users can be assigned
  assignees: z
    .array(z.string())
    .default([]),

  tags: z
    .array(z.string())
    .default([]),
});
import { z } from "zod";

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),

  description: z
    .string()
    .max(5000, "Description is too long")
    .optional()
    .default(""),

  status: z
    .enum(["todo", "in-progress", "done"])
    .default("todo"),

  priority: z
    .enum(["low", "medium", "high"])
    .default("medium"),

  dueDate: z
    .string()
    .optional()
    .nullable(),

  assignee: z
    .string()
    .optional()
    .nullable(),

  tags: z
    .array(z.string())
    .default([]),
});

export type TaskInput = z.infer<typeof taskSchema>;
import { z } from "zod";
export const taskStatuses = ["todo", "in-progress", "done"] as const;
export const taskPriorities = ["low", "medium", "high"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T00:00:00Z`);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
export const dateSchema = z.string().refine(validDate, "Enter a valid date");
const optionalDate = z.union([dateSchema, z.literal(""), z.null()]).optional();
export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long").default(""),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  startDate: optionalDate,
  dueDate: optionalDate.default(null),
  assignees: z.array(z.string().trim().email("Select valid assignees")).max(20, "Too many assignees").default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(20, "Too many tags").default([]),
}).superRefine((task, context) => {
  if (task.startDate && task.dueDate && task.startDate > task.dueDate) context.addIssue({ code: "custom", message: "Start date must be on or before due date", path: ["startDate"] });
});

export const commentSchema=z.string().trim().min(1,"Comment is required").max(1000,"Comment must be at most 1000 characters");

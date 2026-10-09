import type { Document } from "mongodb";
import { z } from "zod";
import { dateSchema, taskPriorities, taskStatuses } from "@/lib/validations/task";

export const statuses = taskStatuses;
export const priorities = taskPriorities;
export const statusLabels = { todo: "To Do", "in-progress": "In Progress", done: "Completed" };
export type Status = typeof statuses[number];
export type Task = {
  id: string; title: string; description: string; status: Status;
  priority: typeof priorities[number]; startDate: string | null; dueDate: string | null;
  assignees: string[]; tags: string[]; createdBy: string; createdAt: string;
  isOwner: boolean; canChangeStatus: boolean; workspaceId: string; workspaceName: string; href: string;
};
export type TaskWorkspace = { id: string; name: string };
export type TaskMember = { email: string; name: string };
export type View = "list" | "kanban";

export const filterSchema = z.object({
  search: z.string().max(100).default(""),
  workspaceIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).default([]),
  assignees: z.array(z.string().email()).max(100).default([]),
  relation: z.enum(["all", "created", "assigned"]).default("all"),
  statuses: z.array(z.enum(statuses)).max(3).default([]),
  priorities: z.array(z.enum(priorities)).max(3).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  tagLogic: z.enum(["and", "or"]).default("and"),
  due: z.enum(["all", "overdue", "today", "week", "custom"]).default("all"),
  from: z.union([dateSchema, z.literal("")]).default(""),
  to: z.union([dateSchema, z.literal("")]).default(""),
  sort: z.enum(["newest", "title", "priority", "due"]).default("newest"),
}).superRefine((f, context) => {
  if (f.due === "custom" && !f.from && !f.to) context.addIssue({ code: "custom", message: "Choose at least one date for the custom range", path: ["from"] });
  if (f.due === "custom" && f.from && f.to && f.from > f.to) context.addIssue({ code: "custom", message: "Range start must be on or before range end", path: ["to"] });
});
export type TaskFilter = z.infer<typeof filterSchema>;
export const emptyFilter: TaskFilter = filterSchema.parse({});
export type SavedFilter = { id: string; name: string; filter: TaskFilter; favorite: boolean };
export const savedFilterSchema = z.object({ name: z.string().trim().min(1, "Filter name is required").max(80), filter: filterSchema });

export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(day: string, count: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
export function weekBounds(today: string) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const from = addDays(today, -((weekday + 6) % 7));
  return { from, to: addDays(from, 6) };
}
export function taskSchedule(task: Pick<Task, "startDate" | "dueDate">) {
  if (!task.dueDate || !dateSchema.safeParse(task.dueDate).success) return null;
  if (!task.startDate) return { from: task.dueDate, to: task.dueDate, duration: null };
  if (!dateSchema.safeParse(task.startDate).success || task.startDate > task.dueDate) return null;
  return { from: task.startDate, to: task.dueDate, duration: daysBetween(task.startDate, task.dueDate) + 1 };
}
export function filterTasks(tasks: Task[], filter: TaskFilter, email: string, today: string) {
  const { from: monday, to: sunday } = weekBounds(today);
  return tasks.filter(task => {
    if (filter.search && !`${task.title} ${task.description}`.toLowerCase().includes(filter.search.trim().toLowerCase())) return false;
    if (filter.workspaceIds.length && !filter.workspaceIds.includes(task.workspaceId)) return false;
    if (filter.assignees.length && !filter.assignees.some(email => task.assignees.includes(email))) return false;
    if (filter.relation === "created" && task.createdBy !== email) return false;
    if (filter.relation === "assigned" && !task.assignees.includes(email)) return false;
    if (filter.statuses.length && !filter.statuses.includes(task.status)) return false;
    if (filter.priorities.length && !filter.priorities.includes(task.priority)) return false;
    if (filter.tags.length && !(filter.tagLogic === "and" ? filter.tags.every(tag => task.tags.includes(tag)) : filter.tags.some(tag => task.tags.includes(tag)))) return false;
    if (filter.due !== "all") {
      const due = task.dueDate;
      if (!due || !dateSchema.safeParse(due).success) return false;
      if (filter.due === "overdue" && (task.status === "done" || due >= today)) return false;
      if (filter.due === "today" && due !== today) return false;
      if (filter.due === "week" && (due < monday || due > sunday)) return false;
      if (filter.due === "custom" && ((filter.from && due < filter.from) || (filter.to && due > filter.to))) return false;
    }
    return true;
  }).sort((a, b) => {
    if (filter.sort === "title") return a.title.localeCompare(b.title);
    if (filter.sort === "priority") return priorities.indexOf(b.priority) - priorities.indexOf(a.priority);
    if (filter.sort === "due") return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function serializeTask(task: Document, email: string, workspaceName: string): Task {
  const assignees = Array.isArray(task.assignees) ? task.assignees : task.assignee ? [task.assignee] : [];
  const isOwner = task.createdBy === email;
  const canChangeStatus = isOwner || assignees.includes(email) || task.assignee === email;
  const workspaceId = String(task.workspaceId || "");
  return {
    id: String(task._id), title: String(task.title || "Untitled"), description: String(task.description || ""),
    status: task.status || "todo", priority: task.priority || "medium",
    startDate: task.startDate || null, dueDate: task.dueDate || null, assignees,
    tags: Array.isArray(task.tags) ? task.tags : [], createdBy: String(task.createdBy || ""),
    createdAt: new Date(task.createdAt || 0).toISOString(), isOwner, canChangeStatus, workspaceId, workspaceName,
    href: canChangeStatus ? `/tasks/${task._id}` : `/workspaces/${workspaceId}`,
  };
}

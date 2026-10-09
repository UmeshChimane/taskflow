import { createHash } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import { todayKey } from "@/lib/task-views";
import { dateSchema } from "@/lib/validations/task";

/** Sync only the authenticated user's relevant tasks in their current workspaces. */
export async function syncOverdueNotifications(db: Db, email: string, now = new Date()) {
  const workspaces = await db.collection("workspaces").find(
    { "members.email": email }, { projection: { _id: 1, name: 1 } },
  ).toArray();
  if (!workspaces.length) return;
  const names = new Map(workspaces.map(workspace => [String(workspace._id), String(workspace.name)]));
  const today = todayKey(now);
  const tasks = await db.collection("tasks").find({
    workspaceId: { $in: workspaces.map(workspace => workspace._id) },
    status: { $ne: "done" },
    dueDate: { $type: "string", $ne: "", $lt: today },
    $or: [{ createdBy: email }, { assignees: email }, { assignee: email }],
  }, { projection: { _id: 1, title: 1, workspaceId: 1, dueDate: 1 } }).toArray();
  for (const task of tasks) {
    if (!dateSchema.safeParse(task.dueDate).success) continue;
    // A deterministic ObjectId makes upserts safe across polls, tabs, and servers.
    // Keep the existing ObjectId notification IDs and mark-as-read actions intact.
    const digest = createHash("sha256").update(JSON.stringify(["task-overdue", email, String(task._id), task.dueDate])).digest("hex").slice(0, 24);
    try {
      await db.collection("notifications").updateOne({ _id: new ObjectId(digest) }, {
        $setOnInsert: {
          userEmail: email, taskId: task._id, dueDate: task.dueDate,
          title: "Task overdue",
          message: `“${String(task.title || "Untitled") }” in ${names.get(String(task.workspaceId)) || "your workspace"} was due on ${task.dueDate}.`,
          href: `/tasks/${task._id}`, type: "overdue", read: false, createdAt: now,
        },
      }, { upsert: true });
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== 11000) throw error;
    }
  }
}

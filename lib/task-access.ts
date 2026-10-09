import { ObjectId, type Db } from "mongodb";

export function taskAccessFilter(taskId: string, email: string, ownerOnly = false) {
  return {
    _id: new ObjectId(taskId),
    ...(ownerOnly ? { createdBy: email } : { $or: [{ createdBy: email }, { assignees: email }, { assignee: email }] }),
  };
}

/** A task relationship never substitutes for current workspace membership. */
export async function findAccessibleTask(db: Db, taskId: string, email: string, ownerOnly = false) {
  if (!ObjectId.isValid(taskId)) return null;
  const task = await db.collection("tasks").findOne(taskAccessFilter(taskId, email, ownerOnly));
  if (!task?.workspaceId) return null;
  const workspace = await db.collection("workspaces").findOne(
    { _id: task.workspaceId, "members.email": email },
    { projection: { _id: 1 } },
  );
  return workspace ? task : null;
}

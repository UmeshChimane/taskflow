"use server";
import { ObjectId, type Collection, type Db, type WithId } from "mongodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { workspaceSchema } from "@/lib/validations/workspace";
import { getAllUsers } from "@/lib/user";

type WorkspaceMember = { email: string; role: "owner" | "member"; joinedAt: Date };
type WorkspaceData = {
  name: string;
  description?: string;
  ownerEmail: string;
  joinCode: string;
  members: WorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
};
type WorkspaceDocument = WithId<WorkspaceData>;
type TaskData = {
  workspaceId?: ObjectId;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assignees?: string[];
  assignee?: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: Date | string;
};
type NotificationDocument = {
  userEmail: string;
  title: string;
  message: string;
  href: string | null;
  type: string;
  read: boolean;
  createdAt: Date;
};
type UserDocument = { email: string; name?: string; jobTitle?: string };

type ActionFailure = { success: false; message: string };
type WorkspaceCreateResult = ActionFailure | { success: true; id: string; joinCode: string; message: string };
type WorkspaceJoinResult = ActionFailure | { success: true; id: string; message: string };

function code() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function notify(
  db: Db,
  userEmail: string,
  title: string,
  message: string,
  href?: string,
  type = "info",
) {
  await db.collection<NotificationDocument>("notifications").insertOne({
    userEmail,
    title,
    message,
    href: href ?? null,
    type,
    read: false,
    createdAt: new Date(),
  });
}

function memberEmails(workspace: WorkspaceDocument) {
  return Array.isArray(workspace.members)
    ? workspace.members.map((member) => member.email.toLowerCase()).filter(Boolean)
    : [];
}

function workspacesCollection(db: Db): Collection<WorkspaceData> {
  return db.collection<WorkspaceData>("workspaces");
}

function tasksCollection(db: Db): Collection<TaskData> {
  return db.collection<TaskData>("tasks");
}

export async function getMyWorkspaces() {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email) return { success: false as const, workspaces: [] };

    const db = await getDb();
    const workspaces = await workspacesCollection(db)
      .find({ "members.email": email })
      .sort({ updatedAt: -1 })
      .toArray();

    return {
      success: true as const,
      workspaces: workspaces.map((workspace) => ({
        id: workspace._id.toString(),
        name: workspace.name,
        description: workspace.description || "",
        ownerEmail: workspace.ownerEmail,
        joinCode: workspace.joinCode,
        memberCount: workspace.members.length,
        role: workspace.ownerEmail === email ? "owner" : "member",
      })),
    };
  } catch {
    return { success: false as const, workspaces: [] };
  }
}

export async function createWorkspace(input: unknown): Promise<WorkspaceCreateResult> {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email) return { success: false, message: "You must be logged in" };

    const parsed = workspaceSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid workspace" };

    const db = await getDb();
    const workspaces = workspacesCollection(db);
    let joinCode = code();
    while (await workspaces.findOne({ joinCode })) joinCode = code();

    const now = new Date();
    const result = await workspaces.insertOne({
      name: parsed.data.name,
      description: parsed.data.description || "",
      ownerEmail: email,
      joinCode,
      members: [{ email, role: "owner", joinedAt: now }],
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath("/workspaces");
    return { success: true, id: result.insertedId.toString(), joinCode, message: "Workspace created successfully" };
  } catch {
    return { success: false, message: "Failed to create workspace" };
  }
}

export async function joinWorkspace(joinCode: string): Promise<WorkspaceJoinResult> {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    const name = session?.user?.name || email || "A user";
    if (!email) return { success: false, message: "You must be logged in" };

    const codeValue = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(codeValue)) return { success: false, message: "Enter a valid 6-character workspace code" };

    const db = await getDb();
    const workspaces = workspacesCollection(db);
    const workspace = await workspaces.findOne({ joinCode: codeValue });
    if (!workspace) return { success: false, message: "Workspace not found" };

    if (memberEmails(workspace).includes(email)) {
      return { success: false, message: "You are already a member of this workspace" };
    }

    await workspaces.updateOne(
      { _id: workspace._id },
      { $push: { members: { email, role: "member", joinedAt: new Date() } }, $set: { updatedAt: new Date() } },
    );

    await notify(
      db,
      workspace.ownerEmail,
      "New workspace member",
      `${name} joined ${workspace.name}.`,
      `/workspaces/${workspace._id.toString()}`,
      "workspace",
    );

    revalidatePath("/workspaces");
    revalidatePath(`/workspaces/${workspace._id.toString()}`);
    return { success: true, id: workspace._id.toString(), message: `Joined ${workspace.name}` };
  } catch {
    return { success: false, message: "Failed to join workspace" };
  }
}

export async function getWorkspace(workspaceId: string) {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email || !ObjectId.isValid(workspaceId)) return { success: false as const };

    const db = await getDb();
    const workspace = await workspacesCollection(db).findOne({ _id: new ObjectId(workspaceId), "members.email": email });
    if (!workspace) return { success: false as const };

    const members = await Promise.all(
      workspace.members.map(async (member) => {
        const user = await db.collection<UserDocument>("users").findOne(
          { email: member.email },
          { projection: { name: 1, email: 1, jobTitle: 1 } },
        );
        return {
          email: member.email,
          name: user?.name || member.email,
          jobTitle: user?.jobTitle || "",
          role: member.role,
          joinedAt: member.joinedAt,
        };
      }),
    );

    const tasks = await tasksCollection(db).find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).toArray();
    return {
      success: true as const,
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        description: workspace.description || "",
        ownerEmail: workspace.ownerEmail,
        joinCode: workspace.joinCode,
        role: workspace.ownerEmail === email ? "owner" : "member",
        members,
        tasks: tasks.map((task) => ({
          id: task._id.toString(),
          title: String(task.title || "Untitled"),
          description: String(task.description || ""),
          status: task.status || "todo",
          priority: task.priority || "medium",
          dueDate: task.dueDate || null,
          assignees: Array.isArray(task.assignees) ? task.assignees : task.assignee ? [task.assignee] : [],
          tags: Array.isArray(task.tags) ? task.tags : [],
          createdBy: String(task.createdBy || ""),
          createdAt: new Date(task.createdAt || 0).toISOString(),
          isOwner: task.createdBy === email,
        })),
      },
    };
  } catch {
    return { success: false as const };
  }
}

export async function addWorkspaceMember(workspaceId: string, email: string) {
  try {
    const session = await auth();
    const ownerEmail = session?.user?.email?.toLowerCase();
    const ownerName = session?.user?.name || ownerEmail || "The workspace owner";
    if (!ownerEmail || !ObjectId.isValid(workspaceId)) return { success: false as const, message: "Invalid request" };

    const normalized = email.trim().toLowerCase();
    const db = await getDb();
    const workspaces = workspacesCollection(db);
    const workspace = await workspaces.findOne({ _id: new ObjectId(workspaceId), ownerEmail });
    if (!workspace) return { success: false as const, message: "Only the workspace owner can add members" };

    const user = await db.collection<UserDocument>("users").findOne({ email: normalized }, { projection: { name: 1, email: 1 } });
    if (!user) return { success: false as const, message: "User not found. Ask them to create a TaskFlow account first." };
    if (memberEmails(workspace).includes(normalized)) return { success: false as const, message: "User is already a member" };

    await workspaces.updateOne(
      { _id: workspace._id },
      { $push: { members: { email: normalized, role: "member", joinedAt: new Date() } }, $set: { updatedAt: new Date() } },
    );
    await notify(db, normalized, "You were added to a workspace", `${ownerName} added you to ${workspace.name}.`, `/workspaces/${workspace._id.toString()}`, "workspace");

    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true as const, message: "Member added successfully" };
  } catch {
    return { success: false as const, message: "Failed to add member" };
  }
}

export async function removeWorkspaceMember(workspaceId: string, email: string) {
  try {
    const session = await auth();
    const ownerEmail = session?.user?.email?.toLowerCase();
    if (!ownerEmail || !ObjectId.isValid(workspaceId)) return { success: false as const, message: "Invalid request" };

    const normalized = email.trim().toLowerCase();
    const db = await getDb();
    const workspaces = workspacesCollection(db);
    const workspace = await workspaces.findOne({ _id: new ObjectId(workspaceId), ownerEmail });
    if (!workspace) return { success: false as const, message: "Only the workspace owner can remove members" };
    if (normalized === ownerEmail) return { success: false as const, message: "Owner cannot be removed from the workspace" };

    await workspaces.updateOne({ _id: workspace._id }, { $pull: { members: { email: normalized } }, $set: { updatedAt: new Date() } });
    await tasksCollection(db).updateMany({ workspaceId: workspace._id }, { $pull: { assignees: normalized } });

    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true as const, message: "Member removed" };
  } catch {
    return { success: false as const, message: "Failed to remove member" };
  }
}

export async function updateWorkspace(workspaceId: string, input: unknown) {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email || !ObjectId.isValid(workspaceId)) return { success: false as const, message: "Invalid request" };

    const parsed = workspaceSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message || "Invalid workspace" };

    const db = await getDb();
    const result = await workspacesCollection(db).updateOne(
      { _id: new ObjectId(workspaceId), ownerEmail: email },
      { $set: { ...parsed.data, updatedAt: new Date() } },
    );
    if (!result.matchedCount) return { success: false as const, message: "Workspace not found or you are not the owner" };

    revalidatePath("/workspaces");
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true as const, message: "Workspace updated" };
  } catch {
    return { success: false as const, message: "Failed to update workspace" };
  }
}

export async function deleteWorkspace(workspaceId: string) {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email || !ObjectId.isValid(workspaceId)) return { success: false as const, message: "Invalid request" };

    const db = await getDb();
    const oid = new ObjectId(workspaceId);
    const result = await workspacesCollection(db).deleteOne({ _id: oid, ownerEmail: email });
    if (!result.deletedCount) return { success: false as const, message: "Workspace not found or you are not the owner" };

    const tasks = await tasksCollection(db).find({ workspaceId: oid }, { projection: { _id: 1 } }).toArray();
    if (tasks.length) {
      const ids = tasks.map((task) => task._id);
      await db.collection("comments").deleteMany({ taskId: { $in: ids } });
      await tasksCollection(db).deleteMany({ _id: { $in: ids } });
    }

    revalidatePath("/workspaces");
    revalidatePath("/dashboard");
    return { success: true as const, message: "Workspace deleted" };
  } catch {
    return { success: false as const, message: "Failed to delete workspace" };
  }
}

export async function getWorkspaceUsers(workspaceId: string) {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email || !ObjectId.isValid(workspaceId)) return { success: false as const, users: [] };

    const db = await getDb();
    const workspace = await workspacesCollection(db).findOne({ _id: new ObjectId(workspaceId), "members.email": email });
    if (!workspace) return { success: false as const, users: [] };

    const users = await getAllUsers();
    const members = new Set(memberEmails(workspace));
    return {
      success: true as const,
      users: users.filter((user) => members.has(String(user.email).toLowerCase())).map((user) => ({ name: user.name, email: user.email })),
    };
  } catch {
    return { success: false as const, users: [] };
  }
}

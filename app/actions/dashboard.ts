"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";

const idSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Choose a valid workspace or task");
const announcementSchema = z.object({
  workspaceId: idSchema,
  content: z
    .string()
    .trim()
    .min(1, "Announcement is required")
    .max(1000, "Announcement must be at most 1000 characters"),
});

export async function postAnnouncement(input: unknown) {
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0].message };
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return { success: false, message: "You must be logged in" };
    const db = await getDb();
    const workspaceId = new ObjectId(parsed.data.workspaceId);
    const workspace = await db
      .collection("workspaces")
      .findOne({ _id: workspaceId, ownerEmail: email, "members.email": email });
    if (!workspace)
      return {
        success: false,
        message: "Only workspace owners can post announcements",
      };
    await db
      .collection("announcements")
      .insertOne({
        workspaceId,
        content: parsed.data.content,
        createdBy: email,
        createdAt: new Date(),
      });
    revalidatePath("/dashboard");
    return { success: true, message: "Announcement posted" };
  } catch {
    return {
      success: false,
      message: "Could not post announcement. Please try again.",
    };
  }
}

export async function removeAnnouncement(id: string) {
  if (!idSchema.safeParse(id).success)
    return { success: false, message: "Invalid announcement" };
  try {
    const session = await auth();
    if (!session?.user?.email)
      return { success: false, message: "You must be logged in" };
    const db = await getDb();
    const announcement = await db
      .collection("announcements")
      .findOne({ _id: new ObjectId(id) });
    if (!announcement)
      return { success: false, message: "Announcement no longer exists" };
    const workspace = await db
      .collection("workspaces")
      .findOne({
        _id: announcement.workspaceId,
        ownerEmail: session.user.email,
        "members.email": session.user.email,
      });
    if (!workspace)
      return {
        success: false,
        message: "Only workspace owners can remove announcements",
      };
    await db
      .collection("announcements")
      .deleteOne({ _id: announcement._id, workspaceId: workspace._id });
    revalidatePath("/dashboard");
    return { success: true, message: "Announcement removed" };
  } catch {
    return {
      success: false,
      message: "Could not remove announcement. Please try again.",
    };
  }
}

export async function setDashboardPin(taskId: string, pinned: boolean) {
  if (!idSchema.safeParse(taskId).success || typeof pinned !== "boolean")
    return { success: false, message: "Invalid task" };
  try {
    const session = await auth();
    if (!session?.user?.email)
      return { success: false, message: "You must be logged in" };
    const db = await getDb();
    const task = await db
      .collection("tasks")
      .findOne({ _id: new ObjectId(taskId) });
    if (!task) return { success: false, message: "Task no longer exists" };
    const workspace = await db
      .collection("workspaces")
      .findOne({
        _id: task.workspaceId,
        ownerEmail: session.user.email,
        "members.email": session.user.email,
      });
    if (!workspace)
      return { success: false, message: "Only workspace owners can pin tasks" };
    await db
      .collection("tasks")
      .updateOne(
        { _id: task._id, workspaceId: workspace._id },
        pinned
          ? { $set: { dashboardPinned: true, dashboardPinnedAt: new Date() } }
          : { $unset: { dashboardPinned: "", dashboardPinnedAt: "" } },
      );
    revalidatePath("/dashboard");
    return {
      success: true,
      message: pinned ? "Task pinned for your workspace" : "Task unpinned",
    };
  } catch {
    return {
      success: false,
      message: "Could not update pin. Please try again.",
    };
  }
}

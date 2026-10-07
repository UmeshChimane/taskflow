"use client";

import { useState } from "react";
import {
  deleteTask,
  updateTask,
  getUsersForAssignment,
} from "@/app/actions/task";

type User = {
  name: string;
  email: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate?: string | null;
  assignees?: string[];
  tags?: string[];
};

export default function TaskActions({
  task,
}: {
  task: Task;
}) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  async function handleEdit() {
    setEditing(true);
    setUsersLoading(true);

    const result = await getUsersForAssignment();

    setUsersLoading(false);

    if (result.success) {
      setUsers(result.users);
    } else {
      alert(result.message);
    }
  }

  async function handleUpdate(formData: FormData) {
    setLoading(true);

    /* Tags */
    const tagsInput = String(
      formData.get("tags") || "",
    );

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    /* Multiple assignees */
    const assignees = formData
      .getAll("assignees")
      .map(String);

    const result = await updateTask(task.id, {
      title: String(
        formData.get("title") || "",
      ),

      description: String(
        formData.get("description") || "",
      ),

      status: String(
        formData.get("status") || "todo",
      ),

      priority: String(
        formData.get("priority") || "medium",
      ),

      dueDate:
        String(
          formData.get("dueDate") || "",
        ) || null,

      assignees,

      tags,
    });

    setLoading(false);

    if (result.success) {
      setEditing(false);
      window.location.reload();
    } else {
      alert(result.message);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    const result = await deleteTask(task.id);

    setLoading(false);

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message);
    }
  }

  /* =========================
     EDIT MODE
     ========================= */

  if (editing) {
    return (
      <div className="mt-5 w-full basis-full rounded-xl border border-slate-200 bg-slate-50 p-5">

        <form
          action={handleUpdate}
          className="space-y-4"
        >

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </label>

            <input
              name="title"
              defaultValue={task.title}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>

            <textarea
              name="description"
              defaultValue={task.description}
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-900"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>

              <select
                name="status"
                defaultValue={task.status}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="todo">
                  To Do
                </option>

                <option value="in-progress">
                  In Progress
                </option>

                <option value="done">
                  Done
                </option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Priority
              </label>

              <select
                name="priority"
                defaultValue={task.priority}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
              >
                <option value="low">
                  Low
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="high">
                  High
                </option>
              </select>
            </div>

          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Due Date
            </label>

            <input
              name="dueDate"
              type="date"
              defaultValue={task.dueDate || ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Assignees
            </label>

            <select
              name="assignees"
              multiple
              defaultValue={task.assignees || []}
              disabled={usersLoading}
              className="h-32 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100"
            >
              {usersLoading ? (
                <option>
                  Loading users...
                </option>
              ) : (
                users.map((user) => (
                  <option
                    key={user.email}
                    value={user.email}
                  >
                    {user.name} ({user.email})
                  </option>
                ))
              )}
            </select>

            <p className="mt-1 text-xs text-slate-400">
              Hold Ctrl/Cmd to select multiple users.
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tags
            </label>

            <input
              name="tags"
              type="text"
              defaultValue={
                task.tags?.join(", ") || ""
              }
              placeholder="e.g. frontend, urgent, bug"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-900"
            />

            <p className="mt-1 text-xs text-slate-400">
              Separate multiple tags with commas.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">

            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading || usersLoading
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>

        </form>
      </div>
    );
  }

  /* =========================
     NORMAL MODE
     ========================= */

  return (
    <>
      <button
        type="button"
        onClick={handleEdit}
        disabled={loading}
        className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Edit
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        {loading
          ? "Deleting..."
          : "Delete"}
      </button>
    </>
  );
}
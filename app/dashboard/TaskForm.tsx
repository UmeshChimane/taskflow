"use client";

import { useState } from "react";
import { createTask } from "@/app/actions/task";

export default function TaskForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage("");

    const title = String(formData.get("title") || "");
    const description = String(formData.get("description") || "");
    const status = String(formData.get("status") || "todo");
    const priority = String(formData.get("priority") || "medium");
    const dueDate = String(formData.get("dueDate") || "");
    const tagsInput = String(formData.get("tags") || "");

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const result = await createTask({
      title,
      description,
      status,
      priority,
      dueDate: dueDate || null,
      tags,
    });

    setLoading(false);

    if (result.success) {
      setMessage("Task created successfully!");
      setOpen(false);

      window.location.reload();
    } else {
      setMessage(result.message || "Something went wrong");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        + Create Task
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Create Task
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add a new task to your workspace.
            </p>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="text-xl text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <form action={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Task Title
            </label>

            <input
              name="title"
              type="text"
              placeholder="e.g. Complete login page"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>

            <textarea
              name="description"
              rows={4}
              placeholder="Describe the task..."
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>

              <select
                name="status"
                defaultValue="todo"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Priority
              </label>

              <select
                name="priority"
                defaultValue="medium"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Due Date
            </label>

            <input
              name="dueDate"
              type="date"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Tags
            </label>

            <input
              name="tags"
              type="text"
              placeholder="e.g. frontend, urgent, bug"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />

            <p className="mt-1 text-xs text-slate-400">
              Separate multiple tags with commas.
            </p>
          </div>

          {/* Message */}
          {message && (
            <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

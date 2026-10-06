"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TaskActions from "./TaskActions";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate?: string | null;
  assignee?: string | null;
  tags?: string[];
};

export default function TaskList({ tasks }: { tasks: Task[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("newest");

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();

    tasks.forEach((task) => {
      (task.tags || []).forEach((taskTag) => {
        tagSet.add(taskTag);
      });
    });

    return Array.from(tagSet).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const result = tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        status === "all" || task.status === status;

      const matchesPriority =
        priority === "all" || task.priority === priority;

      const matchesTag =
        tag === "all" || (task.tags || []).includes(tag);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesTag
      );
    });

    return [...result].sort((a, b) => {
      if (sort === "title-asc") {
        return a.title.localeCompare(b.title);
      }

      if (sort === "title-desc") {
        return b.title.localeCompare(a.title);
      }

      if (sort === "priority") {
        const priorityOrder = {
          high: 3,
          medium: 2,
          low: 1,
        };

        return (
          priorityOrder[b.priority] -
          priorityOrder[a.priority]
        );
      }

      return 0;
    });
  }, [
    tasks,
    search,
    status,
    priority,
    tag,
    sort,
  ]);

  return (
    <div>
      {/* Filters */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <h4 className="font-semibold text-slate-900">
            Filter & Search
          </h4>

          <p className="mt-1 text-xs text-slate-500">
            Search and organize your tasks.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-900"
          />

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Tags */}
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
          >
            <option value="all">All Tags</option>

            {availableTags.map((taskTag) => (
              <option key={taskTag} value={taskTag}>
                {taskTag}
              </option>
            ))}
          </select>

          {/* Sorting */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
          >
            <option value="newest">Newest First</option>
            <option value="title-asc">Title A → Z</option>
            <option value="title-desc">Title Z → A</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {/* Result count */}
        <p className="mt-3 text-xs text-slate-500">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </p>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <h4 className="font-semibold text-slate-900">
            No matching tasks
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Try changing your search or filters.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              {/* Header */}
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="mt-2 text-sm text-slate-500">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <StatusBadge status={task.status} />

                  <PriorityBadge priority={task.priority} />
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {task.tags.map((taskTag) => (
                    <span
                      key={taskTag}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      #{taskTag}
                    </span>
                  ))}
                </div>
              )}

              {/* Due Date */}
              {task.dueDate && (
                <p className="mt-4 text-xs text-slate-400">
                  Due: {task.dueDate}
                </p>
              )}




              {/* Actions */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link
                  href={`/tasks/${task.id}`}
                  className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  View Task
                </Link>

                <TaskActions task={task} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "in-progress"
      ? "In Progress"
      : status === "done"
        ? "Done"
        : "To Do";

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

"use client";

import { useState } from "react";
import { updateTask } from "@/app/actions/task";

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

type Props = {
  tasks: Task[];
};

const columns = [
  {
    key: "todo",
    title: "To Do",
    description: "Tasks waiting to be started",
  },
  {
    key: "in-progress",
    title: "In Progress",
    description: "Tasks currently being worked on",
  },
  {
    key: "done",
    title: "Done",
    description: "Completed tasks",
  },
] as const;

export default function KanbanBoard({ tasks }: Props) {
  const [taskList, setTaskList] = useState(tasks);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function changeStatus(
    task: Task,
    newStatus: Task["status"],
  ) {
    if (task.status === newStatus) return;

    setLoadingId(task.id);

    const result = await updateTask(task.id, {
      title: task.title,
      description: task.description,
      status: newStatus,
      priority: task.priority,
      dueDate: task.dueDate || null,
      assignees: task.assignees || [],
      tags: task.tags || [],
    });

    setLoadingId(null);

    if (!result.success) {
      alert(result.message);
      return;
    }

    setTaskList((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: newStatus,
            }
          : item,
      ),
    );
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-xl font-bold text-slate-900">
          Kanban Board
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Manage your tasks by changing their status.
        </p>
      </div>

      {/* Columns */}
      <div className="grid gap-5 lg:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = taskList.filter(
            (task) => task.status === column.key,
          );

          return (
            <div
              key={column.key}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              {/* Column Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">
                    {column.title}
                  </h4>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {columnTasks.length}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {column.description}
                </p>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">
                      No tasks
                    </p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      {/* Title */}
                      <h5 className="font-semibold text-slate-900">
                        {task.title}
                      </h5>

                      {/* Description */}
                      {task.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {task.description}
                        </p>
                      )}

                      {/* Assignees */}
                      {task.assignees &&
                        task.assignees.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-slate-500">
                              Assigned to:
                            </p>

                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {task.assignees.map(
                                (email) => (
                                  <span
                                    key={email}
                                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                  >
                                    {email}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Tags */}
                      {task.tags &&
                        task.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                      {/* Priority + Due Date */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {task.priority
                            .charAt(0)
                            .toUpperCase() +
                            task.priority.slice(1)}
                        </span>

                        {task.dueDate && (
                          <span className="text-xs text-slate-400">
                            {task.dueDate}
                          </span>
                        )}
                      </div>

                      {/* Status Change */}
                      <div className="mt-4">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                          Change Status
                        </label>

                        <select
                          value={task.status}
                          disabled={
                            loadingId === task.id
                          }
                          onChange={(e) =>
                            changeStatus(
                              task,
                              e.target.value as Task["status"],
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:opacity-50"
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

                      {/* Loading */}
                      {loadingId === task.id && (
                        <p className="mt-2 text-xs text-slate-400">
                          Updating...
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
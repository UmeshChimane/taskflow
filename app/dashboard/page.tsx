import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import TaskForm from "./TaskForm";
import TaskActions from "./TaskActions";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name || "User";
  const userEmail = session.user.email || "";

  const db = await getDb();

  const tasks = await db
    .collection("tasks")
    .find({
      createdBy: userEmail,
    })
    .sort({
      createdAt: -1,
    })
    .toArray();

  const totalTasks = tasks.length;

  const todoTasks = tasks.filter(
    (task) => task.status === "todo",
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "in-progress",
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === "done",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 font-bold text-white">
              T
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                TaskFlow
              </h1>

              <p className="text-xs text-slate-500">
                Project Management
              </p>
            </div>
          </div>

          {/* User */}
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {userName}
              </p>

              <p className="text-xs text-slate-500">
                {userEmail}
              </p>
            </div>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            Dashboard
          </p>

          <h2 className="mt-1 text-3xl font-bold text-slate-900">
            Welcome back, {userName}
          </h2>

          <p className="mt-2 text-slate-500">
            Manage your projects and tasks from one place.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tasks"
            value={String(totalTasks)}
            description="All tasks"
          />

          <StatCard
            title="To Do"
            value={String(todoTasks)}
            description="Tasks waiting"
          />

          <StatCard
            title="In Progress"
            value={String(inProgressTasks)}
            description="Currently working"
          />

          <StatCard
            title="Completed"
            value={String(completedTasks)}
            description="Finished tasks"
          />
        </div>

        {/* Tasks */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Your Tasks
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create and manage your project tasks.
              </p>
            </div>

            <TaskForm />
          </div>

          {/* Task List */}
          {tasks.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-xl">
                ✓
              </div>

              <h4 className="mt-4 font-semibold text-slate-900">
                No tasks yet
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Create your first task to get started.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {tasks.map((task) => (
                <div
                  key={task._id.toString()}
                  className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm"
                >
                  {/* Task Header */}
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

                      <PriorityBadge
                        priority={task.priority}
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  {task.dueDate && (
                    <p className="mt-4 text-xs text-slate-400">
                      Due: {task.dueDate}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {/* View Task */}
                    <Link
                      href={`/tasks/${task._id.toString()}`}
                      className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      View Task
                    </Link>

                    {/* Edit / Delete */}
                    <TaskActions
                      task={{
                        id: task._id.toString(),
                        title: task.title,
                        description: task.description || "",
                        status: task.status,
                        priority: task.priority,
                        dueDate: task.dueDate || null,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
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

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  return (
    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
      {priority.charAt(0).toUpperCase() +
        priority.slice(1)}
    </span>
  );
}
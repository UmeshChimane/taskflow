import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import Comments from "./Comments";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskDetailPage({ params }: Props) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    notFound();
  }

  const db = await getDb();

  const task = await db.collection("tasks").findOne({
  _id: new ObjectId(id),
  $or: [
    { createdBy: session.user.email },
    { assignees: session.user.email },
  ],
});

  if (!task) {
    notFound();
  }

  // Fetch comments for this task
  const comments = await db
    .collection("comments")
    .find({
      taskId: new ObjectId(id),
    })
    .sort({
      createdAt: -1,
    })
    .toArray();

  // Convert MongoDB data into serializable props
  const formattedComments = comments.map((comment) => ({
    id: comment._id.toString(),
    content: comment.content,
    createdBy: comment.createdBy,
    createdAt: new Date(comment.createdAt).toISOString(),
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">

        {/* Back */}
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to Dashboard
        </Link>

        {/* Task Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Task
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                {task.title}
              </h1>
            </div>

            <div className="flex gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {formatStatus(task.status)}
              </span>

              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                {formatPriority(task.priority)}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="mt-8 grid gap-4 border-y border-slate-200 py-6 sm:grid-cols-3">

            <div>
              <p className="text-xs font-medium uppercase text-slate-400">
                Status
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatStatus(task.status)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-slate-400">
                Priority
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatPriority(task.priority)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-slate-400">
                Due Date
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {task.dueDate || "No due date"}
              </p>
            </div>

          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-slate-700">
                Tags
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {task.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Description */}
          <section className="mt-8">
            <h2 className="text-lg font-bold text-slate-900">
              Description
            </h2>

            {task.description ? (
              <div className="prose prose-slate mt-4 max-w-none">
                <ReactMarkdown>
                  {task.description}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No description provided.
              </p>
            )}
          </section>

          {/* Metadata */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs text-slate-400">
              Created by {task.createdBy}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Created on{" "}
              {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Comments */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Comments
            taskId={task._id.toString()}
            comments={formattedComments}
            currentUser={session.user.email}
          />
        </div>

      </div>
    </main>
  );
}

function formatStatus(status: string) {
  if (status === "in-progress") {
    return "In Progress";
  }

  if (status === "done") {
    return "Done";
  }

  return "To Do";
}

function formatPriority(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

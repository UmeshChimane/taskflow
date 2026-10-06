"use client";

import { useState } from "react";
import {
  createComment,
  deleteComment,
} from "@/app/actions/task";

type Comment = {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

type Props = {
  taskId: string;
  comments: Comment[];
  currentUser: string;
};

export default function Comments({
  taskId,
  comments,
  currentUser,
}: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!content.trim()) return;

    setLoading(true);

    const result = await createComment(taskId, content);

    setLoading(false);

    if (result.success) {
      setContent("");
      window.location.reload();
    } else {
      alert(result.message);
    }
  }

  async function handleDelete(commentId: string) {
    const confirmed = window.confirm(
      "Delete this comment?",
    );

    if (!confirmed) return;

    const result = await deleteComment(commentId);

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900">
        Comments
      </h2>

      {/* Add Comment */}
      <form
        onSubmit={handleSubmit}
        className="mt-4"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={4}
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
        />

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {content.length}/1000
          </p>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Comment"}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
            <p className="text-sm text-slate-500">
              No comments yet.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {comment.createdBy}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(
                      comment.createdAt,
                    ).toLocaleString()}
                  </p>
                </div>

                {comment.createdBy === currentUser && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(comment.id)
                    }
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
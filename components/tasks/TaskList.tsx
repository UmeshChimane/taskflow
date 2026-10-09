"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateTask } from "@/app/actions/task";
import { taskSchema } from "@/lib/validations/task";
import { statuses, priorities, statusLabels, type Task } from "@/lib/task-views";
import TaskActions from "./TaskActions";

export default function TaskList({ tasks }: { tasks: Task[] }) {
  return <ul className="space-y-3">{tasks.map(task => <TaskRow key={task.id} task={task}/>)}</ul>;
}
function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const input = { ...task, title: String(form.get("title") || ""), description: String(form.get("description") || ""), status: String(form.get("status")), priority: String(form.get("priority")), startDate: String(form.get("startDate") || "") || null, dueDate: String(form.get("dueDate") || "") || null, tags: String(form.get("tags") || "").split(",").map(tag => tag.trim()).filter(Boolean) };
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await updateTask(task.id, input);
      if (!result.success) { setError(result.message || "Could not save task"); return; }
      setEditing(false); setMessage("Task saved"); router.refresh();
    } catch { setError("Could not save task. Please try again."); }
    finally { setBusy(false); }
  }
  return <li className="task-card mb-0">
    {editing ? <form onSubmit={save} aria-label={`Edit ${task.title}`} aria-busy={busy}>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="label">Title *</span><input className="input" name="title" defaultValue={task.title} required maxLength={100} autoFocus/></label>
        <label><span className="label">Status</span><select name="status" className="select" defaultValue={task.status}>{statuses.filter(status => Math.abs(statuses.indexOf(status) - statuses.indexOf(task.status)) <= 1).map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
        <label><span className="label">Priority</span><select name="priority" className="select" defaultValue={task.priority}>{priorities.map(priority => <option key={priority}>{priority}</option>)}</select></label>
        <label><span className="label">Start date</span><input className="input" name="startDate" type="date" defaultValue={task.startDate || ""}/></label>
        <label><span className="label">Due date</span><input className="input" name="dueDate" type="date" defaultValue={task.dueDate || ""}/></label>
        <label className="sm:col-span-2"><span className="label">Description</span><textarea className="textarea" name="description" maxLength={2000} defaultValue={task.description}/></label>
        <label className="sm:col-span-2"><span className="label">Tags (comma separated)</span><input className="input" name="tags" defaultValue={task.tags.join(", ")}/></label>
        <div className="flex gap-2 sm:col-span-2"><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button><button type="button" className="button button-secondary" disabled={busy} onClick={() => { setEditing(false); setError(""); }}>Cancel</button></div>
      </fieldset>
      {error && <p role="alert" className="text-xs text-[var(--danger)] mt-3">{error}</p>}
    </form> : <>
      <div className="flex flex-wrap justify-between items-start gap-3"><Link href={task.href} className="min-w-0 flex-1"><p className="text-sm font-bold break-words">{task.title}</p><p className="text-xs muted mt-1 break-words">{task.workspaceName} · {statusLabels[task.status] || task.status} · <span className={`priority-badge priority-badge-${task.priority}`}>{task.priority}</span></p></Link>{task.isOwner && <div className="flex items-center gap-1"><button className="button button-secondary" onClick={() => { setEditing(true); setMessage(""); }}>Edit inline</button><TaskActions task={task} onDone={() => router.refresh()} afterDelete={() => router.refresh()}/></div>}</div>
      <p className="text-xs muted mt-2 whitespace-pre-wrap break-words">{task.description || "No description"}</p>
      <div className="flex flex-wrap gap-2 mt-3"><span className="tag">{task.startDate ? `Start ${task.startDate}` : "No start date"}</span><span className="tag">{task.dueDate ? `Due ${task.dueDate}` : "No due date"}</span>{task.assignees.map(email => <span key={email} className="tag break-all">{email}</span>)}{task.tags.map(tag => <span key={tag} className="tag">#{tag}</span>)}</div>
      {message && <p role="status" className="text-xs text-[var(--success)] mt-2">{message}</p>}
    </>}
  </li>;
}

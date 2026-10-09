"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { updateTaskStatus } from "@/app/actions/task";
import { statuses, statusLabels, type Status, type Task } from "@/lib/task-views";

export default function KanbanBoard({ tasks, onChanged }: { tasks: Task[]; onChanged?: () => void }) {
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function move(id: string, status: Status) {
    const task = tasks.find(task => task.id === id);
    setDrag(null); setOver(null);
    if (!task?.canChangeStatus || task.status === status || lock.current) return;
    setError(""); setMessage("");
    if (Math.abs(statuses.indexOf(task.status) - statuses.indexOf(status)) !== 1) { setError("Tasks must move one stage at a time."); return; }
    lock.current = true; setBusy(id);
    try {
      const result = await updateTaskStatus(id, status);
      if (result.success) { setMessage("Status updated"); onChanged?.(); }
      else setError(result.message || "Could not update status");
    } catch { setError("Could not update status. Please try again."); }
    finally { lock.current = false; setBusy(null); }
  }
  const unknown = tasks.filter(task => !statuses.includes(task.status));
  return <section aria-label="Kanban board"><p className="text-xs muted mb-3">Creators and assignees can move tasks one stage at a time. Use the status menu or drag a card.</p>
    {error && <p role="alert" className="text-xs text-[var(--danger)] mb-3">{error}</p>}{message && <p role="status" className="text-xs text-[var(--success)] mb-3">{message}</p>}
    <div className="kanban-scroll"><div className="kanban-grid">{statuses.map(status => {
      const items = tasks.filter(task => task.status === status);
      return <section key={status} className={`kanban-col ${over === status ? "drag-over" : ""}`} aria-label={statusLabels[status]} onDragOver={event => { if (drag) { event.preventDefault(); setOver(status); } }} onDrop={event => { event.preventDefault(); if (drag) void move(drag, status); }}>
        <div className="kanban-head"><h3 className="kanban-title">{statusLabels[status]}</h3><span className="count-pill">{items.length}</span></div>
        {items.length ? items.map(task => <article className="task-card" key={task.id} draggable={task.canChangeStatus && !busy} onDragStart={() => setDrag(task.id)} onDragEnd={() => { setDrag(null); setOver(null); }}>
          <Link href={task.href}><p className="text-sm font-bold break-words">{task.title}</p><p className="text-[11px] muted mt-1 break-words">{task.workspaceName}</p></Link>
          <div className="flex flex-wrap gap-2 mt-3"><span className={`priority-badge priority-badge-${task.priority}`}>{task.priority}</span>{task.dueDate && <span className="tag">Due {task.dueDate}</span>}</div>
          {task.canChangeStatus && <select aria-label={`Status for ${task.title}`} className="select mt-3" value={task.status} disabled={Boolean(busy)} onChange={event => void move(task.id, event.target.value as Status)}>{statuses.filter(next => Math.abs(statuses.indexOf(next) - statuses.indexOf(task.status)) <= 1).map(next => <option value={next} key={next}>{statusLabels[next]}</option>)}</select>}
          {busy === task.id && <p className="text-xs muted mt-2">Updating…</p>}
        </article>) : <p className="text-xs muted p-3">No tasks in this status.</p>}
      </section>;
    })}</div></div>
    {unknown.length > 0 && <p className="text-xs muted mt-3">{unknown.length} tasks have unsupported statuses. Use List to review them.</p>}
  </section>;
}

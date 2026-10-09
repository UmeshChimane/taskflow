"use client";

import Link from "next/link";
import { useState } from "react";
import { dateSchema } from "@/lib/validations/task";
import { addDays, daysBetween, taskSchedule, type Task } from "@/lib/task-views";

function TaskLinks({ tasks, empty }: { tasks: Task[]; empty: string }) {
  return tasks.length ? <ul className="space-y-2">{tasks.map(task => <li key={task.id}><Link href={task.href} className="text-xs text-[var(--primary)] break-words">{task.title}</Link><span className="text-[11px] muted"> · {task.workspaceName}{task.startDate ? ` · Starts ${task.startDate}` : ""}{task.dueDate ? ` · Due ${task.dueDate}` : ""}</span></li>)}</ul> : <p className="text-xs muted">{empty}</p>;
}
export function CalendarView({ tasks, today }: { tasks: Task[]; today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  function changeMonth(delta: number) {
    const date = new Date(`${month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(date.toISOString().slice(0, 7));
  }
  const first = `${month}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const gridStart = addDays(first, -((weekday + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const byDate = new Map<string, Task[]>();
  const undated = tasks.filter(task => !task.dueDate || !dateSchema.safeParse(task.dueDate).success);
  for (const task of tasks) if (task.dueDate && dateSchema.safeParse(task.dueDate).success) byDate.set(task.dueDate, [...(byDate.get(task.dueDate) || []), task]);
  const monthTasks = tasks.filter(task => task.dueDate?.startsWith(month) && dateSchema.safeParse(task.dueDate).success).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const outside = tasks.length - undated.length - monthTasks.length;
  return <section aria-label="Task calendar">
    <div className="flex flex-wrap gap-3 items-center justify-between mb-4"><h3 className="section-title">{new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${first}T00:00:00Z`))}</h3><div className="flex gap-2"><button className="button button-secondary" onClick={() => changeMonth(-1)} aria-label="Previous month">←</button><button className="button button-secondary" onClick={() => setMonth(today.slice(0, 7))}>Today</button><button className="button button-secondary" onClick={() => changeMonth(1)} aria-label="Next month">→</button></div></div>
    <p className="text-xs muted mb-3">Tasks appear on their due date. Dates use the IST calendar.</p>
    <div className="hidden sm:block overflow-x-auto"><div className="min-w-[630px]"><div className="grid grid-cols-7 text-center text-xs font-bold muted mb-2">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div><div className="grid grid-cols-7 border-t border-l border-[var(--border)]">{days.map(day => <div key={day} className={`min-h-28 min-w-0 border-b border-r border-[var(--border)] p-2 ${day.startsWith(month) ? "" : "bg-[var(--surface-2)]"}`}><time dateTime={day} className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${day === today ? "bg-[var(--primary)] text-white" : "muted"}`}>{Number(day.slice(8))}</time><ul className="space-y-1 mt-1 max-h-36 overflow-auto">{(byDate.get(day) || []).map(task => <li key={task.id}><Link href={task.href} className="block rounded bg-[var(--primary-soft)] text-[var(--primary)] p-1 text-[11px] break-words" title={`${task.title} · ${task.workspaceName}`}>{task.title}</Link></li>)}</ul></div>)}</div></div></div>
    <div className="sm:hidden"><TaskLinks tasks={monthTasks} empty="No tasks due this month."/></div>
    {monthTasks.length === 0 && <p role="status" className="text-xs muted mt-3 hidden sm:block">No tasks due this month.</p>}
    {outside > 0 && <p className="text-xs muted mt-3">{outside} dated tasks fall outside this month. Use the month arrows to browse.</p>}
    <div className="mt-5 border-t border-[var(--border)] pt-4"><h4 className="text-sm font-bold mb-2">Without a due date ({undated.length})</h4><TaskLinks tasks={undated} empty="All matching tasks have a due date."/></div>
  </section>;
}
export function TimelineView({ tasks, today }: { tasks: Task[]; today: string }) {
  const [start, setStart] = useState(today);
  const [span, setSpan] = useState(30);
  const end = addDays(start, span - 1);
  const schedules = tasks.map(task => ({ task, schedule: taskSchedule(task) }));
  const scheduled = schedules.filter(item => item.schedule !== null);
  const visible = scheduled.filter(({ schedule }) => schedule!.from <= end && schedule!.to >= start);
  const unscheduled = schedules.filter(item => !item.schedule).map(item => item.task);
  const width = span * 28;
  const step = span <= 14 ? 1 : span <= 30 ? 3 : 7;
  return <section aria-label="Task timeline">
    <div className="flex flex-wrap items-center gap-2 mb-3"><button className="button button-secondary" onClick={() => setStart(addDays(start, -span))} aria-label="Previous timeline range">←</button><button className="button button-secondary" onClick={() => setStart(today)}>Today</button><button className="button button-secondary" onClick={() => setStart(addDays(start, span))} aria-label="Next timeline range">→</button><select className="select max-w-36" aria-label="Timeline range" value={span} onChange={event => setSpan(Number(event.target.value))}>{[7, 30, 90].map(days => <option key={days} value={days}>{days} days</option>)}</select>{scheduled.length > 0 && <button className="button button-ghost" onClick={() => setStart(scheduled.map(({ schedule }) => schedule!.from).sort()[0])}>First scheduled task</button>}</div>
    <p className="text-xs muted mb-4">{start} – {end} · Durations include both start and due dates. ◆ marks a due-date milestone with no planned duration.</p>
    {visible.length > 0 ? <div className="overflow-x-auto rounded-xl border border-[var(--border)]" tabIndex={0} aria-label="Scrollable Gantt chart"><div style={{ width: width + 220 }}>
      <div className="flex border-b border-[var(--border)] bg-[var(--surface-2)]"><span className="w-[220px] shrink-0 p-3 text-xs font-bold sticky left-0 bg-[var(--surface-2)] z-10">Task</span><div className="relative h-10" style={{ width }}>{Array.from({ length: Math.ceil(span / step) }, (_, i) => <time key={i} dateTime={addDays(start, i * step)} className="absolute text-[10px] muted top-3" style={{ left: i * step * 28 }}>{addDays(start, i * step).slice(5)}</time>)}</div></div>
      {visible.map(({ task, schedule }) => {
        const left = Math.max(0, daysBetween(start, schedule!.from));
        const right = Math.min(span - 1, daysBetween(start, schedule!.to));
        const description = schedule!.duration === null ? `Due ${schedule!.to}; no start date` : `${schedule!.from} to ${schedule!.to}; ${schedule!.duration} days`;
        return <div className="flex border-b last:border-b-0 border-[var(--border)]" key={task.id}><Link href={task.href} className="w-[220px] shrink-0 p-3 sticky left-0 bg-[var(--surface)] z-10"><p className="truncate text-xs font-bold">{task.title}</p><p className="truncate text-[10px] muted">{task.workspaceName} · {schedule!.duration === null ? "Milestone" : `${schedule!.duration} days`}</p></Link><div className="relative min-h-16" style={{ width, backgroundImage: "repeating-linear-gradient(to right, transparent, transparent 27px, var(--border) 27px, var(--border) 28px)" }}><Link href={task.href} aria-label={`${task.title}: ${description}`} title={`${task.title}: ${description}`} className="absolute top-4 h-7 rounded bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)] text-[10px] flex items-center px-1 overflow-hidden whitespace-nowrap" style={{ left: left * 28 + 2, width: (right - left + 1) * 28 - 4 }}>{schedule!.duration === null ? "◆" : task.title}</Link></div></div>;
      })}
    </div></div> : <div className="empty-state text-xs">No scheduled tasks overlap this range.</div>}
    {scheduled.length > visible.length && <p className="text-xs muted mt-3">{scheduled.length - visible.length} scheduled tasks are outside this range.</p>}
    <div className="mt-5 border-t border-[var(--border)] pt-4"><h4 className="text-sm font-bold mb-2">Incomplete schedules ({unscheduled.length})</h4><p className="text-xs muted mb-3">Add a due date for a milestone, or both start and due dates for a duration.</p><TaskLinks tasks={unscheduled} empty="All matching tasks have a schedule or milestone."/></div>
  </section>;
}

"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/app/actions/task";
import { postAnnouncement, removeAnnouncement, setDashboardPin } from "@/app/actions/dashboard";
import { taskSchema } from "@/lib/validations/task";
import type { DashboardData, DashboardTask, DashboardWorkspace } from "@/lib/dashboard";
import Avatar from "@/components/Avatar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ArrowRight, Plus } from "@/components/icons";

type Result = { success: boolean; message?: string };
const statusLabels: Record<string, string> = { todo: "To Do", "in-progress": "In Progress", done: "Completed" };
function Timestamp({ value }: { value: string }) {
  return value ? <time dateTime={value}>{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(value))} IST</time> : null;
}
function Section({ title, subtitle, children, id }: { title: string; subtitle: string; children: ReactNode; id?: string }) {
  return <section id={id} className="card section-card min-w-0"><h2 className="section-title">{title}</h2><p className="section-subtitle">{subtitle}</p><div className="mt-4">{children}</div></section>;
}
function Feedback({ result }: { result: Result | null }) {
  return result && <p role={result.success ? "status" : "alert"} className={`mt-3 text-xs ${result.success ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{result.message}</p>;
}

function QuickAdd({ workspaces, email }: { workspaces: DashboardWorkspace[]; email: string }) {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const fd = new FormData(form);
    const input = { workspaceId: String(fd.get("workspaceId") || ""), title: String(fd.get("title") || ""), status: "todo", priority: String(fd.get("priority") || "medium"), dueDate: String(fd.get("dueDate") || "") || null, assignees: fd.get("assignMe") ? [email] : [], tags: [], description: "" };
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) { setResult({ success: false, message: parsed.error.issues[0].message }); return; }
    lock.current = true; setBusy(true); setResult(null);
    try {
      const response = await createTask(input);
      setResult(response);
      if (response.success) { form.reset(); router.refresh(); }
    } catch { setResult({ success: false, message: "Could not create task. Please try again." }); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!workspaces.length) return <div className="empty-state text-xs">Join or create a workspace to add tasks. <Link href="/workspaces" className="block mt-3 text-[var(--primary)]">Manage workspaces <ArrowRight size={12} className="inline"/></Link></div>;
  return <form onSubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy} className="space-y-3 min-w-0">
      <div><label className="label" htmlFor="quick-title">Task title *</label><input id="quick-title" name="title" className="input" required maxLength={100} placeholder="What needs to happen next?"/></div>
      <div><label className="label" htmlFor="quick-workspace">Workspace *</label><select id="quick-workspace" name="workspaceId" className="select" required defaultValue={workspaces[0].id}>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="quick-priority">Priority</label><select id="quick-priority" name="priority" className="select" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div><div><label className="label" htmlFor="quick-due">Due date</label><input id="quick-due" name="dueDate" type="date" className="input"/></div></div>
      <label className="flex gap-2 items-center text-xs"><input name="assignMe" type="checkbox" defaultChecked/>Assign to me</label>
      <button className="button button-primary w-full" disabled={busy}><Plus size={15}/>{busy ? "Creating…" : "Add task"}</button>
    </fieldset>
    <Feedback result={result}/>
  </form>;
}

export default function Dashboard({ data, email }: { data: DashboardData; email: string }) {
  const router = useRouter();
  const [focus, setFocus] = useState<keyof DashboardData["focus"]>("assigned");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [result, setResult] = useState<Result | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const owners = data.workspaces.filter(w => w.isOwner);
  async function mutate(action: () => Promise<Result>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setResult(null);
    try {
      const response = await action(); setResult(response);
      if (response.success) router.refresh();
      return response;
    } catch { setResult({ success: false, message: "Something went wrong. Please try again." }); }
    finally { lock.current = false; setBusy(false); }
  }
  async function announce(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, fd = new FormData(form);
    const response = await mutate(() => postAnnouncement({ workspaceId: String(fd.get("workspaceId") || ""), content: String(fd.get("content") || "") }));
    if (response?.success) form.reset();
  }
  function taskRows(tasks: DashboardTask[], empty: string) {
    return tasks.length ? <ul className="space-y-2">{tasks.map(t => <li key={t.id} className="flex gap-2 items-center"><Link href={t.href} className="task-card flex-1 min-w-0 mb-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold break-words min-w-0">{t.title}</p><span className="tag">{statusLabels[t.status] || t.status}</span></div><p className="text-[11px] muted mt-1 break-words">{t.workspaceName}{t.dueDate ? ` · Due ${t.dueDate}` : " · No due date"}</p></Link>{t.canPin && <button type="button" className="button button-ghost shrink-0 px-2" disabled={busy} aria-label={`${t.pinned ? "Unpin" : "Pin"} ${t.title}`} aria-pressed={t.pinned} onClick={() => void mutate(() => setDashboardPin(t.id, !t.pinned))}>{t.pinned ? "Unpin" : "Pin"}</button>}</li>)}</ul> : <div className="empty-state text-xs">{empty}</div>;
  }
  const stats = [{ label: "Total tasks", value: data.stats.total }, { label: "To Do", value: data.stats.todo }, { label: "In Progress", value: data.stats.progress }, { label: "Completed", value: data.stats.done }];
  return <>
    <section aria-labelledby="productivity-heading"><h2 id="productivity-heading" className="section-title">Productivity Stats</h2><p className="section-subtitle mb-3">All tasks across your {data.workspaces.length} workspace{data.workspaces.length === 1 ? "" : "s"}.</p><div className="stat-grid">{stats.map(s => <div className="card stat-card" key={s.label}><p className="stat-label">{s.label}</p><p className="stat-value">{s.value.toLocaleString("en-IN")}</p></div>)}</div>{data.stats.other > 0 && <p className="small muted mt-2">{data.stats.other} tasks have an unrecognized status and are included in the total.</p>}</section>
    {result && <div className="toast max-w-[calc(100vw-40px)]"><Feedback result={result}/><button type="button" className="button button-ghost mt-1" onClick={() => setResult(null)}>Dismiss</button></div>}
    <div className="grid gap-5 mt-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="space-y-5 min-w-0">
        <Section title="My Focus" subtitle="Your assignments. Overdue and Due Soon exclude completed tasks; Due Soon covers today through the next 7 days (IST).">
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Focus filters">{([{ key: "assigned", label: "Assigned to Me" }, { key: "overdue", label: "Overdue" }, { key: "soon", label: "Due Soon" }] as const).map(tab => <button type="button" key={tab.key} aria-pressed={focus === tab.key} className={`button ${focus === tab.key ? "button-primary" : "button-secondary"}`} onClick={() => setFocus(tab.key)}>{tab.label} <span>{data.focusCounts[tab.key]}</span></button>)}</div>
          {taskRows(data.focus[focus], focus === "assigned" ? "No tasks assigned to you yet." : focus === "overdue" ? "No overdue assignments." : "No assignments due in the next 7 days.")}
          {data.focusCounts[focus] > data.focus[focus].length && <p className="small muted mt-3">Showing {data.focus[focus].length} of {data.focusCounts[focus]} tasks.</p>}
          <Link href="/my-tasks" className="button button-ghost mt-3">Open My Tasks <ArrowRight size={14}/></Link>
        </Section>
        <Section title="Due This Week" subtitle={`All workspace tasks due ${data.week.from} – ${data.week.to} (Monday–Sunday, IST). Includes completed tasks.`}>
          {taskRows(data.dueThisWeek,"No tasks due this week.")}
          {data.dueThisWeekCount>data.dueThisWeek.length&&<p className="small muted mt-3">Showing {data.dueThisWeek.length} of {data.dueThisWeekCount} tasks.</p>}
        </Section>
        <Section title="Pinned Tasks" subtitle="Shared workspace priorities. Workspace owners can pin tasks from My Focus or Recent Work.">
          {taskRows(data.pinned, "No pinned tasks yet.")}
          {data.pinnedCount > data.pinned.length && <p className="small muted mt-3">Showing the latest {data.pinned.length} of {data.pinnedCount} pins.</p>}
        </Section>
        <Section title="Team Activity" subtitle="Recent task creations, comments, member joins, and announcements.">
          {data.activity.length ? <ul className="space-y-4">{data.activity.map(a => <li key={a.id} className="flex items-start gap-3"><Avatar name={a.actor} image={a.image}/><div className="min-w-0"><p className="text-xs leading-5 break-words"><b>{a.actor}</b> {a.action} <Link href={a.href} className="font-semibold text-[var(--primary)]">{a.subject}</Link></p><p className="text-[11px] muted mt-1 break-words">{a.workspaceName} · <Timestamp value={a.createdAt}/></p></div></li>)}</ul> : <div className="empty-state text-xs">No recorded team activity yet.</div>}
        </Section>
        <Section title="Recent Work" subtitle="Latest tasks across your workspaces.">{taskRows(data.recent, "No tasks yet. Add your first task to get started.")}</Section>
      </div>
      <div className="space-y-5 min-w-0">
        <Section title="Top Assignees" subtitle="The five teammates with the most assigned tasks across your workspaces. A shared task counts once for each assignee.">
          {data.topAssignees.length?<ol className="space-y-4">{data.topAssignees.map((person,index)=><li key={person.email} className="flex gap-3 items-start"><span className="text-xs muted pt-2">{index+1}</span><Avatar name={person.name} image={person.image}/><div className="min-w-0 flex-1"><p className="text-sm font-bold break-words">{person.name}</p><p className="text-[11px] muted break-all">{person.email}</p><p className="text-xs muted mt-1">{person.count} assigned · {person.open} open · {person.completed} completed</p></div></li>)}</ol>:<div className="empty-state text-xs">No assigned tasks yet.</div>}
        </Section>
        <Section title="Quick-Add Task" subtitle="Create a To Do task in one of your workspaces."><QuickAdd workspaces={data.workspaces} email={email}/></Section>
        <Section id="announcements" title="Workspace Announcements" subtitle="Updates from your workspace owners. Showing the latest 20.">
          {owners.length > 0 && <form onSubmit={announce} className="mb-5" aria-busy={busy}><fieldset disabled={busy} className="space-y-3 min-w-0"><div><label className="label" htmlFor="announcement-workspace">Workspace</label><select id="announcement-workspace" name="workspaceId" className="select" required>{owners.map(w => <option value={w.id} key={w.id}>{w.name}</option>)}</select></div><div><label className="label" htmlFor="announcement-content">Announcement *</label><textarea id="announcement-content" name="content" className="textarea" required maxLength={1000} placeholder="Share an update with your team…"/></div><button className="button button-secondary" disabled={busy}>{busy ? "Working…" : "Post announcement"}</button></fieldset></form>}
          {data.announcements.length ? <ul className="space-y-4">{data.announcements.map(a => <li key={a.id} className="rounded-xl border border-[var(--border)] p-3"><Link href={`/workspaces/${a.workspaceId}`} className="text-xs font-bold text-[var(--primary)]">{a.workspaceName}</Link><p className="text-sm whitespace-pre-wrap break-words mt-2">{a.content}</p><p className="text-[11px] muted mt-3 break-words">{a.author} · <Timestamp value={a.createdAt}/></p>{a.canRemove && <button type="button" disabled={busy} className="button button-ghost mt-2 text-[var(--danger)]" onClick={() => setRemoveId(a.id)}>Remove</button>}</li>)}</ul> : <div className="empty-state text-xs">No announcements yet.</div>}
        </Section>
        <Section title="Your Workspaces" subtitle="Jump into a project.">{data.workspaces.length ? <ul className="space-y-2">{data.workspaces.map(w => <li key={w.id}><Link className="task-card" href={`/workspaces/${w.id}`}><p className="text-sm font-bold break-words">{w.name}</p><p className="text-[11px] muted mt-1">{w.memberCount} members · {w.isOwner ? "Owner" : "Member"}</p></Link></li>)}</ul> : <div className="empty-state text-xs">You are not in a workspace yet. <Link className="block text-[var(--primary)] mt-3" href="/workspaces">Create or join a workspace</Link></div>}</Section>
      </div>
    </div>
    <ConfirmDialog open={Boolean(removeId)} title="Remove announcement?" description="This removes the announcement for all workspace members." confirmLabel="Remove" busy={busy} onCancel={() => setRemoveId(null)} onConfirm={() => { if (removeId) void mutate(() => removeAnnouncement(removeId)).then(response => { if (response?.success) setRemoveId(null); }); }}/>
  </>;
}

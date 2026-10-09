"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyFilter, filterSchema, filterTasks, priorities, statuses, statusLabels, todayKey, type Task, type TaskFilter, type TaskMember, type TaskWorkspace, type View } from "@/lib/task-views";
import FilterPopover from "@/components/FilterPopover";
import TaskList from "./TaskList";
import KanbanBoard from "./KanbanBoard";

type Option = { value: string; label: string; className?: string };
function Choices({ label, options, selected, onChange }: { label: string; options: Option[]; selected: string[]; onChange: (values: string[]) => void }) {
  return <FilterPopover label={label} summary={selected.length?`${selected.length} selected`:"All"}><fieldset aria-label={label} className="space-y-2">{options.length?options.map(option=><label className="flex gap-2 items-start text-xs break-all" key={option.value}><input className="mt-0.5" type="checkbox" checked={selected.includes(option.value)} onChange={()=>onChange(selected.includes(option.value)?selected.filter(value=>value!==option.value):[...selected,option.value])}/><span className={option.className}>{option.label}</span></label>):<p className="text-xs muted">No options yet.</p>}</fieldset></FilterPopover>;
}
export default function TaskViews({ tasks, workspaces, members, email, today: initialToday, assignedOnly = false, defaultView = "list", loadError }: { tasks: Task[]; workspaces: TaskWorkspace[]; members: TaskMember[]; email: string; today: string; assignedOnly?: boolean; defaultView?: View; loadError?: string }) {
  const router = useRouter();
  const [today, setToday] = useState(initialToday);
  const [view, setView] = useState<View>(defaultView);
  const [filter, setFilter] = useState<TaskFilter>(emptyFilter);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  function change<K extends keyof TaskFilter>(key: K, value: TaskFilter[K]) { setFilter(current => ({ ...current, [key]: value })); }
  const parsed = filterSchema.safeParse(filter);
  const filtered = useMemo(() => filterSchema.safeParse(filter).success ? filterTasks(tasks, filter, email, today) : [], [tasks, filter, email, today]);
  const tags = [...new Set([...tasks.flatMap(task => task.tags), ...filter.tags])].sort();
  const workspaceOptions = [...workspaces.map(workspace => ({ value: workspace.id, label: workspace.name })), ...filter.workspaceIds.filter(id => !workspaces.some(workspace => workspace.id === id)).map(id => ({ value: id, label: `Unavailable workspace (${id})` }))];
  const memberMap = new Map(members.map(member => [member.email, member.name]));
  const assigneeOptions = [...new Set([...members.map(member => member.email), ...tasks.flatMap(task => task.assignees), ...filter.assignees])].sort().map(email => ({ value: email, label: memberMap.get(email) ? `${memberMap.get(email)} (${email})` : email }));
  if (loadError) return <div className="card section-card" role="alert"><p>{loadError}</p><button className="button button-secondary mt-3" onClick={() => router.refresh()}>Try again</button></div>;
  return <div className="space-y-4 min-w-0">
    <div className="card p-3 flex flex-wrap gap-2" role="group" aria-label="Task views">{(["list", "kanban"] as const).map(mode => <button className={`button ${view === mode ? "button-primary" : "button-ghost"}`} key={mode} aria-pressed={view === mode} onClick={() => setView(mode)}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}</div>
    <section className="card section-card" aria-label="Task filters">
      <div className="overflow-x-auto pb-2"><div className="grid grid-cols-4 items-start gap-3 min-w-[700px]">
        <label><span className="label">Search tasks</span><input className="input h-10" value={filter.search} maxLength={100} placeholder="Title or description" onChange={event => change("search", event.target.value)}/></label>
        <label><span className="label">Relationship</span><select className="select h-10" value={filter.relation} onChange={event => change("relation", event.target.value as TaskFilter["relation"])}><option value="all">{assignedOnly ? "All my assignments" : "All accessible tasks"}</option><option value="created">Created by me</option><option value="assigned">Assigned to me</option></select></label>
        <label><span className="label">Sort</span><select className="select h-10" value={filter.sort} onChange={event => change("sort", event.target.value as TaskFilter["sort"])}><option value="newest">Newest first</option><option value="title">Title A–Z</option><option value="priority">Highest priority</option><option value="due">Earliest due date</option></select></label>
        <Choices label="Workspaces" options={workspaceOptions} selected={filter.workspaceIds} onChange={values => change("workspaceIds", values)}/>
        <Choices label="Assignees" options={assigneeOptions} selected={filter.assignees} onChange={values => change("assignees", values)}/>
        <Choices label="Statuses" options={statuses.map(status => ({ value: status, label: statusLabels[status] }))} selected={filter.statuses} onChange={values => change("statuses", values as TaskFilter["statuses"])}/>
        <Choices label="Priorities" options={priorities.map(priority => ({ value: priority, label: priority, className: `priority-badge priority-badge-${priority}` }))} selected={filter.priorities} onChange={values => change("priorities", values as TaskFilter["priorities"])}/>
        <Choices label="Tags" options={tags.map(tag => ({ value: tag, label: `#${tag}` }))} selected={filter.tags} onChange={values => change("tags", values)}/>
        <label className="col-span-2"><span className="label">Tag matching</span><select className="select h-10" value={filter.tagLogic} onChange={event => change("tagLogic", event.target.value as TaskFilter["tagLogic"])}><option value="and">AND — every selected tag</option><option value="or">OR — any selected tag</option></select></label>
        <div className="col-span-2"><label><span className="label">Due date</span><select className="select h-10" value={filter.due} onChange={event => change("due", event.target.value as TaskFilter["due"])}><option value="all">Any date / no due date</option><option value="overdue">Overdue (unfinished)</option><option value="today">Today</option><option value="week">This week (Mon–Sun)</option><option value="custom">Custom range</option></select></label>
          {filter.due === "custom" && <div className="mt-2"><FilterPopover label="Custom range" summary="Choose dates"><label className="block mt-2"><span className="label">From (inclusive)</span><input type="date" className="input h-10" value={filter.from} onChange={event => change("from", event.target.value)}/></label><label className="block mt-2"><span className="label">To (inclusive)</span><input type="date" className="input h-10" value={filter.to} onChange={event => change("to", event.target.value)}/></label></FilterPopover></div>}
        </div>
      </div></div>
      {!parsed.success && <p role="alert" className="text-xs text-[var(--danger)] mt-3">{parsed.error.issues[0].message}</p>}
      <div className="flex flex-wrap gap-3 items-center justify-between mt-4"><p role="status" className="text-xs muted">{filtered.length} of {tasks.length} tasks · Date filters use IST.{assignedOnly ? " This view always includes only your assignments." : ""}</p><button className="button button-secondary" onClick={() => setFilter(emptyFilter)}>Clear filters</button></div>
    </section>
    <section className="card section-card" aria-label={`${view} tasks`}>
      {!filtered.length ? <div className="empty-state text-xs">{!tasks.length ? "No tasks in this view yet." : "No tasks match these filters."}</div> : view === "list" ? <TaskList tasks={filtered}/> : <KanbanBoard tasks={filtered} onChanged={() => router.refresh()}/>}
    </section>

  </div>;
}

import { ObjectId, type Document } from "mongodb";
import { weekBounds } from "@/lib/task-views";
import { getDb } from "@/lib/mongodb";

export type DashboardTask = { id: string; title: string; status: string; dueDate: string | null; workspaceName: string; href: string; canPin: boolean; pinned: boolean };
export type DashboardWorkspace = { id: string; name: string; memberCount: number; isOwner: boolean };
export type Announcement = { id: string; workspaceId: string; workspaceName: string; content: string; author: string; createdAt: string; canRemove: boolean };
export type Activity = { image?:string|null; id: string; actor: string; action: string; subject: string; workspaceName: string; href: string; createdAt: string };
export type DashboardData = {
  workspaces: DashboardWorkspace[];
  stats: { total: number; todo: number; progress: number; done: number; other: number };
  focus: { assigned: DashboardTask[]; overdue: DashboardTask[]; soon: DashboardTask[] };
  focusCounts: { assigned: number; overdue: number; soon: number };
  dueThisWeek: DashboardTask[]; dueThisWeekCount: number; week: {from:string;to:string};
  topAssignees: {email:string;name:string;count:number;open:number;completed:number;image:string|null}[];
  recent: DashboardTask[]; pinned: DashboardTask[]; pinnedCount: number;
  announcements: Announcement[]; activity: Activity[];
};

// Task deadlines are date-only strings. Use a single documented calendar zone.
export async function getDashboardData(email: string): Promise<DashboardData> {
  const db = await getDb();
  const workspaces = await db.collection("workspaces").find({ "members.email": email }).sort({ updatedAt: -1 }).toArray();
  const ids = workspaces.map(w => w._id);
  const workspaceMap = new Map(workspaces.map(w => [String(w._id), w]));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 7);
  const week=weekBounds(today);
  const dueThisWeek={dueDate:{$gte:week.from,$lte:week.to}};
  const soonEnd = horizon.toISOString().slice(0, 10);
  // Match the existing array-first assignee serialization, including legacy tasks.
  const assigned = { $or: [{ assignees: email }, { $and: [{ assignee: email }, { $expr: { $not: [{ $isArray: "$assignees" }] } }] }] };
  const active = { status: { $ne: "done" } };
  const overdue = { $and: [assigned, active, { dueDate: { $type: "string", $ne: "", $lt: today } }] };
  const soon = { $and: [assigned, active, { dueDate: { $gte: today, $lte: soonEnd } }] };
  const preview = (filter: Document) => [{ $match: filter }, { $sort: { dueDate: 1, createdAt: -1, _id: -1 } }, { $limit: 8 }];
  const [facets, announcements, comments] = await Promise.all([
    db.collection("tasks").aggregate([{ $match: { workspaceId: { $in: ids } } }, { $facet: {
      counts: [{ $group: { _id: { $ifNull: ["$status", "todo"] }, count: { $sum: 1 } } }],
      assigned: preview(assigned), overdue: preview(overdue), soon: preview(soon),
      assignedCount: [{ $match: assigned }, { $count: "count" }], overdueCount: [{ $match: overdue }, { $count: "count" }], soonCount: [{ $match: soon }, { $count: "count" }],
      dueThisWeek: preview(dueThisWeek),
      dueThisWeekCount: [{$match:dueThisWeek},{$count:"count"}],
      topAssignees: [
        {$project:{status:1,assignees:{$cond:[{$isArray:"$assignees"},{$setUnion:["$assignees",[]]},{$cond:[{$and:[{$ne:["$assignee",null]},{$ne:["$assignee",""]}]},["$assignee"],[]]}]}}},
        {$unwind:"$assignees"},{$match:{assignees:{$type:"string",$ne:""}}},
        {$group:{_id:"$assignees",count:{$sum:1},completed:{$sum:{$cond:[{$eq:["$status","done"]},1,0]}}}},
        {$sort:{count:-1,_id:1}},{$limit:5},
      ],
      recent: [{ $sort: { createdAt: -1, _id: -1 } }, { $limit: 12 }],
      pinned: [{ $match: { dashboardPinned: true } }, { $sort: { dashboardPinnedAt: -1, _id: -1 } }, { $limit: 20 }],
      pinnedCount: [{ $match: { dashboardPinned: true } }, { $count: "count" }],
    } }]).toArray(),
    db.collection("announcements").find({ workspaceId: { $in: ids } }).sort({ createdAt: -1, _id: -1 }).limit(20).toArray(),
    db.collection("comments").aggregate([
      { $lookup: { from: "tasks", localField: "taskId", foreignField: "_id", as: "task" } },
      { $unwind: "$task" }, { $match: { "task.workspaceId": { $in: ids } } },
      { $sort: { createdAt: -1, _id: -1 } }, { $limit: 12 },
      { $project: { createdBy: 1, createdAt: 1, "task._id": 1, "task.title": 1, "task.workspaceId": 1, "task.createdBy": 1, "task.assignees": 1, "task.assignee": 1 } },
    ]).toArray(),
  ]);
  const f = facets[0];
  const assignees = (t: Document): string[] => Array.isArray(t.assignees) ? t.assignees : t.assignee ? [t.assignee] : [];
  const href = (t: Document) => t.createdBy === email || assignees(t).includes(email) ? `/tasks/${t._id}` : `/workspaces/${t.workspaceId}`;
  const task = (t: Document): DashboardTask => ({ id: String(t._id), title: String(t.title || "Untitled"), status: t.status || "todo", dueDate: t.dueDate || null, workspaceName: workspaceMap.get(String(t.workspaceId))?.name || "Workspace", href: href(t), canPin: workspaceMap.get(String(t.workspaceId))?.ownerEmail === email, pinned: t.dashboardPinned === true });
  const events: (Omit<Activity, "actor"> & { email: string })[] = [];
  const date = (value: unknown) => {
    if (!(value instanceof Date) && typeof value !== "string") return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };
  const add = (id: string, actor: string, action: string, subject: string, workspaceId: ObjectId, link: string, timestamp: unknown) => {
    const createdAt = date(timestamp);
    if (createdAt) events.push({ id, email: actor, action, subject, workspaceName: workspaceMap.get(String(workspaceId))?.name || "Workspace", href: link, createdAt });
  };
  for (const t of f.recent) add(`task-${t._id}`, t.createdBy, "created", t.title, t.workspaceId, href(t), t.createdAt);
  for (const c of comments) add(`comment-${c._id}`, c.createdBy, "commented on", c.task.title, c.task.workspaceId, href(c.task), c.createdAt);
  for (const w of workspaces) for (const m of w.members || []) add(`member-${w._id}-${m.email}`, m.email, "joined", w.name, w._id, `/workspaces/${w._id}`, m.joinedAt);
  for (const a of announcements) add(`announcement-${a._id}`, a.createdBy, "posted an announcement in", workspaceMap.get(String(a.workspaceId))?.name || "Workspace", a.workspaceId, "#announcements", a.createdAt);
  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = events.slice(0, 12);
  const actorEmails = [...new Set([...latest.map(e => e.email), ...announcements.map(a => a.createdBy), ...f.topAssignees.map((a:Document)=>a._id)])].filter(Boolean);
  const users = await db.collection("users").find({ email: { $in: actorEmails } }, { projection: { email: 1, name: 1, avatarUpdatedAt:1 } }).toArray();
  const images=new Map(users.map(user=>[user.email,user.avatarUpdatedAt?`/api/avatar/${user._id}?v=${new Date(user.avatarUpdatedAt).getTime()}`:null]));
  const names = new Map(users.map(u => [u.email, String(u.name || u.email)]));
  const counts = new Map<string, number>(f.counts.map((c: Document) => [c._id, c.count]));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const todo = counts.get("todo") || 0, progress = counts.get("in-progress") || 0, done = counts.get("done") || 0;
  return {
    workspaces: workspaces.map(w => ({ id: String(w._id), name: w.name, memberCount: w.members?.length || 0, isOwner: w.ownerEmail === email })),
    stats: { total, todo, progress, done, other: total - todo - progress - done },
    focus: { assigned: f.assigned.map(task), overdue: f.overdue.map(task), soon: f.soon.map(task) },
    focusCounts: { assigned: f.assignedCount[0]?.count || 0, overdue: f.overdueCount[0]?.count || 0, soon: f.soonCount[0]?.count || 0 },
    dueThisWeek:f.dueThisWeek.map(task),dueThisWeekCount:f.dueThisWeekCount[0]?.count||0,week,
    topAssignees:f.topAssignees.map((assignee:Document)=>({email:String(assignee._id),name:names.get(assignee._id)||String(assignee._id),count:assignee.count,completed:assignee.completed,open:assignee.count-assignee.completed,image:images.get(assignee._id)||null})),
    recent: f.recent.slice(0, 6).map(task), pinned: f.pinned.map(task), pinnedCount: f.pinnedCount[0]?.count || 0,
    announcements: announcements.map(a => ({ id: String(a._id), workspaceId: String(a.workspaceId), workspaceName: workspaceMap.get(String(a.workspaceId))?.name || "Workspace", content: a.content, author: names.get(a.createdBy) || a.createdBy, createdAt: date(a.createdAt) || "", canRemove: workspaceMap.get(String(a.workspaceId))?.ownerEmail === email })),
    activity: latest.map(({ email: actorEmail, ...event }) => ({ ...event, actor: names.get(actorEmail) || actorEmail || "Unknown user",image:images.get(actorEmail)||null })),
  };
}

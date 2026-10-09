import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTaskViews } from "@/app/actions/task";
import { todayKey } from "@/lib/task-views";
import AppShell from "@/components/AppShell";
import TaskViews from "./TaskViews";

export default async function TaskPage({ assignedOnly = false }: { assignedOnly?: boolean }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  return <AppShell user={session.user}>
    <div className="page-header"><div><p className="page-kicker">{assignedOnly ? "Assigned work" : "Across your workspaces"}</p><h1 className="page-title">{assignedOnly ? "My Tasks" : "All Tasks"}</h1><p className="page-description">{assignedOnly ? "Your assignments in List and Kanban." : "Plan and filter tasks across all your workspaces."}</p></div><Link href="/workspaces" className="button button-secondary">Manage workspaces</Link></div>
    <Suspense fallback={<div className="card section-card motion-safe:animate-pulse" role="status" aria-busy="true">Loading tasks…</div>}><TaskContent email={session.user.email} assignedOnly={assignedOnly}/></Suspense>
  </AppShell>;
}
async function TaskContent({ email, assignedOnly }: { email: string; assignedOnly: boolean }) {
  const result = await getTaskViews(assignedOnly);
  return <TaskViews email={email} today={todayKey()} tasks={result.success ? result.tasks : []} workspaces={result.success ? result.workspaces : []} members={result.success ? result.members : []} assignedOnly={assignedOnly} defaultView="kanban" loadError={result.success ? undefined : result.message}/>;
}

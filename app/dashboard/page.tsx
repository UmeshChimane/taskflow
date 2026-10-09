import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Dashboard from "@/components/dashboard/Dashboard";
import { getDashboardData } from "@/lib/dashboard";
import { Plus } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const data = await getDashboardData(session.user.email);
  return <AppShell user={session.user}>
    <div className="page-header">
      <div><p className="page-kicker">Overview</p><h1 className="page-title">Good to see you, {session.user.name?.split(" ")[0] || "there"}.</h1><p className="page-description">A focused overview of the work happening across your workspaces.</p></div>
      <Link href="/workspaces" className="button button-primary"><Plus size={16}/>Manage workspaces</Link>
    </div>
    <Dashboard data={data} email={session.user.email}/>
  </AppShell>;
}

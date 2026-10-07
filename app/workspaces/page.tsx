import { auth } from "@/auth";import { redirect } from "next/navigation";import AppShell from "@/components/AppShell";import WorkspaceHub from "@/components/workspace/WorkspaceHub";
export const dynamic="force-dynamic";
export default async function WorkspacesPage(){const s=await auth();if(!s?.user?.email)redirect("/login");return <AppShell user={s.user}><WorkspaceHub/></AppShell>}

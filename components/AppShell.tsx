"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Bell, Briefcase, CheckSquare, LayoutDashboard, LogOut, Menu, Moon, Sun, UserCircle, X, Sparkles } from "./icons";
import { useTheme } from "./ThemeProvider";
import NotificationBell from "./NotificationBell";

const nav=[
 {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard},
 {href:"/my-tasks",label:"My Tasks",icon:CheckSquare},
 {href:"/workspaces",label:"Workspaces",icon:Briefcase},
 {href:"/profile",label:"Profile",icon:UserCircle},
];

type UserInfo={name?:string|null;email?:string|null};

function Sidebar({pathname,user,onNavigate}:{pathname:string;user:UserInfo;onNavigate:()=>void}){
 const name=user.name||user.email?.split("@")[0]||"User";
 const initials=name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
 return <aside className="sidebar"><div className="sidebar-logo"><div className="brand-mark"><Sparkles size={18}/></div><div><div className="brand-name">TaskFlow</div><div className="brand-sub">Work, organized.</div></div></div><div className="sidebar-section"><p className="eyebrow">Workspace</p><nav className="nav-list">{nav.map(item=>{const active=pathname===item.href||pathname.startsWith(item.href+"/");const Icon=item.icon;return <Link key={item.href} href={item.href} onClick={onNavigate} className={`nav-item ${active?"active":""}`}><Icon size={19}/><span>{item.label}</span></Link>})}</nav></div><div className="sidebar-spacer"/><div className="sidebar-bottom"><Link href="/notifications" onClick={onNavigate} className={`nav-item ${pathname.startsWith("/notifications")?"active":""}`}><Bell size={19}/><span>Notifications</span></Link><button className="nav-item" onClick={()=>signOut({callbackUrl:"/login"})}><LogOut size={19}/><span>Sign out</span></button><div className="sidebar-user"><div className="avatar">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-xs text-[var(--muted)]">{user.email}</p></div></div></div></aside>;
}

export default function AppShell({children,user}:{children:React.ReactNode;user:UserInfo}){
 const pathname=usePathname(); const [mobile,setMobile]=useState(false); const {theme,toggle}=useTheme();
 const name=user.name||user.email?.split("@")[0]||"User"; const initials=name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
 return <div className="app-shell"><div className={`mobile-overlay ${mobile?"show":""}`} onClick={()=>setMobile(false)}/><div className={`mobile-sidebar ${mobile?"show":""}`}><div className="flex justify-end p-3"><button className="icon-button" onClick={()=>setMobile(false)}><X size={20}/></button></div><Sidebar pathname={pathname} user={user} onNavigate={()=>setMobile(false)}/></div><div className="desktop-sidebar"><Sidebar pathname={pathname} user={user} onNavigate={()=>{}}/></div><div className="app-main"><header className="topbar"><div className="flex items-center gap-3"><button className="mobile-menu icon-button" onClick={()=>setMobile(true)}><Menu size={20}/></button><div className="mobile-brand"><div className="brand-mark"><Sparkles size={16}/></div><span>TaskFlow</span></div></div><div className="topbar-actions"><NotificationBell/><button className="theme-toggle" onClick={toggle} title={`Switch to ${theme==="light"?"dark":"light"} mode`}>{theme==="light"?<Moon size={18}/>:<Sun size={18}/>}</button><Link href="/profile" className="top-avatar">{initials}</Link></div></header><main className="page-content">{children}</main></div></div>;
}

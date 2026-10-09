"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Bell,
  Briefcase,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserCircle,
  X,
  Sparkles,
} from "./icons";
import { useTheme } from "./ThemeProvider";
import Avatar from "./Avatar";
import Modal from "./Modal";
import NotificationBell from "./NotificationBell";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "All Tasks", icon: CheckSquare },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/workspaces", label: "Workspaces", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

type UserInfo = { name?: string | null; email?: string | null; image?: string | null };

function Sidebar({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string;
  user: UserInfo;
  onNavigate: () => void;
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const result = await signOut({ redirect: false, redirectTo: "/login" });
      if (!result?.url || new URL(result.url, window.location.origin).pathname !== "/login") {
        throw new Error("Sign out failed");
      }
      window.location.replace("/login");
    } catch {
      setLogoutError("Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }
  const name = user.name || user.email?.split("@")[0] || "User";
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="brand-mark">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="brand-name">TaskFlow</div>
          <div className="brand-sub">Work, organized.</div>
        </div>
      </div>
      <div className="sidebar-section">
        <p className="eyebrow">Workspace</p>
        <nav className="nav-list">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`nav-item ${active ? "active" : ""}`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="sidebar-spacer" />
      <div className="sidebar-bottom">
        <Link
          href="/notifications"
          onClick={onNavigate}
          className={`nav-item ${pathname.startsWith("/notifications") ? "active" : ""}`}
        >
          <Bell size={19} />
          <span>Notifications</span>
        </Link>
        <button
          className="nav-item"
          onClick={logout}
          disabled={loggingOut}
        >
          <LogOut size={19} />
          <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
        </button>
        {logoutError && <p role="alert" className="text-xs text-[var(--danger)] px-2">{logoutError}</p>}
        <div className="sidebar-user">
          <Avatar name={name} image={user.image}/>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: UserInfo;
}) {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const { theme, toggle } = useTheme();
  // Server authorization remains authoritative. Re-check cached screens when
  // navigating, returning to a tab, or receiving an Auth.js sign-out broadcast.
  useEffect(() => {
    const controller = new AbortController();
    let checking = false;
    async function checkSession() {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return; // A network/service failure is not a logout.
        const session = await response.json();
        if (!session?.user?.email) window.location.replace("/login");
        else if (session.user.email !== user.email) window.location.replace("/dashboard");
      } catch { /* Retry on the next focus or interval after transient failures. */ }
      finally { checking = false; }
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("next-auth") : null;
    channel?.addEventListener("message", checkSession);
    void checkSession();
    const timer = window.setInterval(checkSession, 60_000);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkSession);
    return () => {
      controller.abort();
      channel?.close();
      window.clearInterval(timer);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", checkSession);
    };
  }, [pathname, user.email]);
  const name = user.name || user.email?.split("@")[0] || "User";
  return (
    <div className="app-shell">
      {mobile&&<Modal label="Navigation" onClose={()=>setMobile(false)}><div className="mobile-navigation"><button className="mobile-navigation-close icon-button" aria-label="Close navigation" onClick={()=>setMobile(false)}><X size={20}/></button><Sidebar pathname={pathname} user={user} onNavigate={()=>setMobile(false)}/></div></Modal>}
      <div className="desktop-sidebar">
        <Sidebar pathname={pathname} user={user} onNavigate={() => {}} />
      </div>
      <div className="app-main">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <div className="mobile-brand">
              <div className="brand-mark">
                <Sparkles size={16} />
              </div>
              <span>TaskFlow</span>
            </div>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
            <button
              className="theme-toggle"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={toggle}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link href="/profile" aria-label="Your profile"><Avatar name={name} image={user.image} className="top-avatar"/></Link>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

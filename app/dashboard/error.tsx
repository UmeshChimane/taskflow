"use client";

import Link from "next/link";

export default function DashboardError({ retry }: { retry: () => void }) {
  return <main className="page-content"><section className="card section-card" role="alert"><h1 className="page-title">Dashboard unavailable</h1><p className="page-description">We couldn’t load your workspace data. Please try again.</p><div className="mt-4 flex flex-wrap gap-3"><button className="button button-primary" onClick={retry}>Try again</button><Link className="button button-secondary" href="/workspaces">Open workspaces</Link></div></section></main>;
}

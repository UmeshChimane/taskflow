export default function DashboardLoading() {
  return <main className="page-content" aria-busy="true" aria-label="Loading dashboard">
    <p role="status" className="page-description mb-5">Loading your dashboard…</p>
    <div className="stat-grid" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="card stat-card h-28 motion-safe:animate-pulse bg-[var(--surface-2)]"/>)}</div>
    <div className="grid gap-5 mt-5 lg:grid-cols-2" aria-hidden="true"><div className="card h-72 motion-safe:animate-pulse bg-[var(--surface-2)]"/><div className="card h-72 motion-safe:animate-pulse bg-[var(--surface-2)]"/></div>
  </main>;
}

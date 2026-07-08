export function StatCard({ label, valor, hint }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-display text-lg font-bold text-accent">{valor}</div>
      {hint && <div className="text-[11px] font-medium text-muted">{hint}</div>}
    </div>
  )
}

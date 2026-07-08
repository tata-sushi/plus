import { TrendingUp, TrendingDown } from 'lucide-react'

export function StatCard({ label, valor, hint, trend }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 hstack gap-1.5">
        <span className="font-display text-lg font-bold text-accent">{valor}</span>
        {trend === 'up' && <TrendingUp size={14} className="text-accent" />}
        {trend === 'down' && <TrendingDown size={14} className="text-danger" />}
      </div>
      {hint && <div className="text-[11px] font-medium text-muted">{hint}</div>}
    </div>
  )
}

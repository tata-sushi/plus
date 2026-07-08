import { cn } from '../lib/cn'

export function ProgressBar({ value, className, showLabel = false }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={cn('vstack gap-1.5', className)}>
      <div className="h-2 w-full overflow-hidden rounded-pill bg-white/10">
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-muted">{Math.round(pct)}%</span>
      )}
    </div>
  )
}

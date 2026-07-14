export function ProgressRing({ value, size = 120, stroke = 10, label, sublabel }) {
  const pct = Math.max(0, Math.min(1, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)
  const big = size >= 80

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-line" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-accent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display font-bold leading-none ${big ? 'text-2xl' : 'text-[13px]'}`}>
          {label ?? `${Math.round(pct * 100)}%`}
        </span>
        {sublabel && <span className="mt-0.5 text-[11px] font-medium text-muted">{sublabel}</span>}
      </div>
    </div>
  )
}

export function ProgressRing({ value, size = 120, stroke = 10, label, sublabel }) {
  const pct = Math.max(0, Math.min(1, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#00E676"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold leading-none">{label ?? `${Math.round(pct * 100)}%`}</span>
        {sublabel && <span className="mt-1 text-[11px] font-medium text-muted">{sublabel}</span>}
      </div>
    </div>
  )
}

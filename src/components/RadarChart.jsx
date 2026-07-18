// Gráfico de radar em SVG puro (sem lib externa), no estilo dos demais
// componentes de visualização (ProgressRing/ProgressBar).
//
// props:
//   axes   — array de rótulos (um por eixo)
//   series — [{ label, color, values: number[] }]  (values na escala 0..max)
//   max    — valor máximo do eixo (default 5)
//   levels — nº de anéis da grade (default 4)
//   size   — lado do desenho em px (viewBox)
export function RadarChart({ axes, series, max = 5, levels = 4, size = 280 }) {
  const cx = size / 2
  const cy = size / 2
  const R = size / 2 - 46 // deixa margem para os rótulos
  const N = axes.length

  const ang = (i) => (Math.PI * 2 * i) / N - Math.PI / 2
  const point = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]
  const raio = (v) => (Math.max(0, Math.min(v, max)) / max) * R
  const polygon = (vals) => vals.map((v, i) => point(i, raio(v)).join(',')).join(' ')

  return (
    <div className="px-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full text-muted-2"
        style={{ overflow: 'visible' }}
        role="img"
        aria-label="Gráfico de radar de feedback"
      >
        {/* anéis da grade */}
        {Array.from({ length: levels }, (_, l) => {
          const r = (R * (l + 1)) / levels
          const pts = axes.map((_, i) => point(i, r).join(',')).join(' ')
          return (
            <polygon
              key={l}
              points={pts}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.14"
            />
          )
        })}

        {/* eixos (centro → vértice) */}
        {axes.map((_, i) => {
          const [x, y] = point(i, R)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.14"
            />
          )
        })}

        {/* séries */}
        {series.map((s) => (
          <g key={s.label}>
            <polygon
              points={polygon(s.values)}
              fill={s.color}
              fillOpacity="0.18"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => {
              const [x, y] = point(i, raio(v))
              return <circle key={i} cx={x} cy={y} r="3" fill={s.color} />
            })}
          </g>
        ))}

        {/* rótulos dos eixos */}
        {axes.map((label, i) => {
          const [x, y] = point(i, R + 15)
          const c = Math.cos(ang(i))
          const anchor = Math.abs(c) < 0.3 ? 'middle' : c > 0 ? 'start' : 'end'
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-text"
              style={{ fontSize: 11, fontWeight: 500 }}
            >
              {label}
            </text>
          )
        })}
      </svg>

      {/* legenda */}
      <div className="mt-3 hstack flex-wrap justify-center gap-x-5 gap-y-1.5">
        {series.map((s) => (
          <span key={s.label} className="hstack gap-1.5 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

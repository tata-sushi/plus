import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, RotateCcw, X, ChevronRight } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste).
//   centro: Tatá · anel 1: Sócios · anel 2: Unidades · anel 3: Gerentes (GIRATÓRIO).
// Ao girar os gerentes, quando um gerente "casa" com uma unidade, as fotos dos
// líderes daquele gerente naquela unidade aparecem no anel externo (e somem
// quando não casa). Relação chefe→líder por id_superior. RPC organograma_lideres().

const UNIDADES = [
  { u: 'Itaim', cor: '#3b82f6', curto: 'Itaim' },
  { u: 'Pinheiros', cor: '#14b8a6', curto: 'Pinheiros' },
  { u: 'Poke - Pinheiros', cor: '#f0a92b', curto: 'Poke' },
  { u: 'Tatá House', cor: '#ec4899', curto: 'Tatá House' },
  { u: 'Administrativo', cor: '#64748b', curto: 'ADM' },
]

const OURO = '#eab308'
const ROXO = '#a855f7'

const VB = 380
const CX = 190
const CY = 190
const R_CENTRO = 22
const S_IN = 22
const S_OUT = 60
const S_LAB = 42
const U_IN = 60
const U_OUT = 100
const U_LAB = 81
const G_IN = 100
const G_OUT = 138
const G_LAB = 120
const R_LIDER = 168
const AV_L = 28
const TAU = 2 * Math.PI

function polar(r, a) {
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}
function arc(rIn, rOut, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p0 = polar(rOut, a0)
  const p1 = polar(rOut, a1)
  const p2 = polar(rIn, a1)
  const p3 = polar(rIn, a0)
  return `M${p0[0]} ${p0[1]}A${rOut} ${rOut} 0 ${large} 1 ${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}A${rIn} ${rIn} 0 ${large} 0 ${p3[0]} ${p3[1]}Z`
}
function primeiro(nome) {
  return String(nome || '').trim().split(/\s+/)[0]
}
function setorDe(a, n, off = 0) {
  let x = a + Math.PI / 2 - off
  x = ((x % TAU) + TAU) % TAU
  return Math.floor(x / (TAU / n)) % n
}

export function OrganogramaAneis() {
  const navigate = useNavigate()
  const [gente, setGente] = useState(null)
  const [rot, setRot] = useState(0)
  const [sel, setSel] = useState(null)
  const [w, setW] = useState(0)
  const svgRef = useRef(null)
  const drag = useRef(null)

  useEffect(() => {
    let ativo = true
    supabase.rpc('organograma_lideres').then(({ data }) => {
      if (ativo) setGente(Array.isArray(data) ? data : [])
    })
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    const elx = svgRef.current
    if (!elx) return
    const medir = () => setW(elx.getBoundingClientRect().width || 0)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(elx)
    return () => ro.disconnect()
  }, [gente])

  const { socios, gerentes, lideres } = useMemo(() => {
    const g = gente || []
    const porFaixa = (f) =>
      g
        .filter((p) => p.faixa === f)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome, 'pt'))
    return { socios: porFaixa(1), gerentes: porFaixa(2), lideres: porFaixa(3) }
  }, [gente])

  const N_S = Math.max(1, socios.length)
  const N_U = UNIDADES.length
  const N_G = Math.max(1, gerentes.length)
  const k = w ? w / VB : 0

  // Casamentos atuais (dependem da rotação): para cada gerente, qual unidade o
  // centro dele aponta agora e quais líderes dele há nessa unidade.
  const reveals = useMemo(() => {
    const out = []
    gerentes.forEach((g, i) => {
      const center = -Math.PI / 2 + ((i + 0.5) / N_G) * TAU + rot
      const uIdx = setorDe(center, N_U)
      const unidade = UNIDADES[uIdx].u
      const lids = lideres.filter((l) => l.id_superior === g.id_pessoa && l.unidade === unidade)
      if (!lids.length) return
      const step = 0.34
      const start = center - ((lids.length - 1) / 2) * step
      out.push({
        g,
        center,
        uIdx,
        cor: UNIDADES[uIdx].cor,
        nodes: lids.map((l, j) => ({ l, ang: start + j * step })),
      })
    })
    return out
  }, [gerentes, lideres, rot, N_G, N_U])

  const unidadesCasadas = new Set(reveals.map((r) => r.uIdx))
  const gerentesCasados = new Set(reveals.map((r) => r.g.matricula))

  // ── gesto único no SVG ─────────────────────────────────────────────────────
  function ponto(e) {
    const r = svgRef.current.getBoundingClientRect()
    const sx = ((e.clientX - r.left) / r.width) * VB
    const sy = ((e.clientY - r.top) / r.height) * VB
    return { r: Math.hypot(sx - CX, sy - CY), a: Math.atan2(sy - CY, sx - CX) }
  }
  function regiao(rr) {
    if (rr <= R_CENTRO + 3) return 'centro'
    if (rr <= S_OUT) return 'socios'
    if (rr <= U_OUT) return 'uni'
    if (rr <= G_OUT + 12) return 'ger'
    return 'fora'
  }
  function onDown(e) {
    const { r, a } = ponto(e)
    drag.current = { reg: regiao(r), last: a, moved: false }
    svgRef.current.setPointerCapture?.(e.pointerId)
  }
  function onMove(e) {
    const d0 = drag.current
    if (!d0 || d0.reg !== 'ger') return
    const { a } = ponto(e)
    let d = a - d0.last
    if (d > Math.PI) d -= TAU
    if (d < -Math.PI) d += TAU
    if (Math.abs(d) > 0.01) d0.moved = true
    d0.last = a
    setRot((v) => v + d)
  }
  function onUp(e) {
    const d0 = drag.current
    drag.current = null
    if (!d0 || d0.moved) return
    const { r, a } = ponto(e)
    const reg = regiao(r)
    if (reg === 'centro') return setSel(null)
    if (reg === 'socios' && socios.length) {
      tapHaptic()
      return setSel(socios[setorDe(a, N_S)])
    }
    if (reg === 'ger' && gerentes.length) {
      tapHaptic()
      return setSel(gerentes[setorDe(a, N_G, rot)])
    }
  }

  return (
    <>
      <Header title="Organograma" />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="mt-3 hstack gap-2 rounded-card border border-line bg-surface px-3 py-2 text-[11px] text-muted">
          <RotateCcw size={14} className="shrink-0 text-accent" />
          <span>Gire os gerentes: ao casar com uma unidade, os líderes daquele gerente ali aparecem. Toque num nome/foto pra ver a pessoa.</span>
        </div>
      </div>

      {gente === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="px-4 pt-3">
          <div className="relative mx-auto w-full select-none" style={{ maxWidth: 380 }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VB} ${VB}`}
              className="w-full"
              role="img"
              aria-label="Organograma em anéis"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => (drag.current = null)}
              style={{ touchAction: 'none', cursor: 'pointer' }}
            >
              {/* conectores gerente → líderes revelados */}
              {reveals.map((r) =>
                r.nodes.map((nd, j) => {
                  const [x1, y1] = polar(G_OUT + 2, r.center)
                  const [x2, y2] = polar(R_LIDER - 15, nd.ang)
                  return <line key={`cn-${r.g.matricula}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: r.cor, strokeWidth: 1.8, opacity: 0.7, strokeLinecap: 'round' }} />
                }),
              )}

              {/* anel 2 — unidades */}
              {UNIDADES.map((u, i) => {
                const a0 = -Math.PI / 2 + (i / N_U) * TAU
                const a1 = -Math.PI / 2 + ((i + 1) / N_U) * TAU
                const [lx, ly] = polar(U_LAB, (a0 + a1) / 2)
                const cas = unidadesCasadas.has(i)
                return (
                  <g key={`u-${u.u}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(U_IN, U_OUT, a0, a1)} style={{ fill: u.cor, fillOpacity: cas ? 0.4 : 0.14, stroke: cas ? u.cor : 'rgb(var(--bg))', strokeWidth: cas ? 2.5 : 2 }} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{ fill: 'rgb(var(--text))', fontSize: 9, fontWeight: 700 }}>
                      {u.curto}
                    </text>
                  </g>
                )
              })}

              {/* anel 1 — sócios */}
              {socios.map((p, i) => {
                const a0 = -Math.PI / 2 + (i / N_S) * TAU
                const a1 = -Math.PI / 2 + ((i + 1) / N_S) * TAU
                const [lx, ly] = polar(S_LAB, (a0 + a1) / 2)
                const on = sel?.matricula === p.matricula
                return (
                  <g key={`s-${p.matricula}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(S_IN, S_OUT, a0, a1)} style={{ fill: OURO, fillOpacity: on ? 0.4 : 0.15, stroke: on ? OURO : 'rgb(var(--bg))', strokeWidth: on ? 2.5 : 2 }} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{ fill: 'rgb(var(--text))', fontSize: 10, fontWeight: 700 }}>
                      {primeiro(p.nome)}
                    </text>
                  </g>
                )
              })}

              {/* anel 3 — gerentes (giratório) */}
              {gerentes.map((p, i) => {
                const a0 = -Math.PI / 2 + (i / N_G) * TAU + rot
                const a1 = -Math.PI / 2 + ((i + 1) / N_G) * TAU + rot
                const [lx, ly] = polar(G_LAB, (a0 + a1) / 2)
                const on = sel?.matricula === p.matricula || gerentesCasados.has(p.matricula)
                return (
                  <g key={`g-${p.matricula}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(G_IN, G_OUT, a0, a1)} style={{ fill: ROXO, fillOpacity: on ? 0.4 : 0.18, stroke: on ? ROXO : 'rgb(var(--bg))', strokeWidth: on ? 2.5 : 2 }} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{ fill: 'rgb(var(--text))', fontSize: 10, fontWeight: 700 }}>
                      {primeiro(p.nome)}
                    </text>
                  </g>
                )
              })}

              {/* centro Tatá */}
              <circle cx={CX} cy={CY} r={R_CENTRO} style={{ fill: 'rgb(var(--accent))', stroke: 'rgb(var(--surface))', strokeWidth: 2.5, pointerEvents: 'none' }} />
              <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" style={{ fill: 'rgb(var(--bg))', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, pointerEvents: 'none' }}>
                TATÁ
              </text>
            </svg>

            {/* Fotos dos líderes revelados (DOM) */}
            {k > 0 && (
              <div className="pointer-events-none absolute inset-0">
                {reveals.map((r) =>
                  r.nodes.map((nd) => {
                    const [x, y] = polar(R_LIDER, nd.ang)
                    const size = Math.max(22, Math.round(AV_L * k))
                    return (
                      <button
                        key={`lid-${nd.l.matricula}`}
                        onClick={() => {
                          tapHaptic()
                          setSel(nd.l)
                        }}
                        aria-label={nd.l.nome}
                        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full tap"
                        style={{ left: x * k, top: y * k }}
                      >
                        <span className="block rounded-full" style={{ boxShadow: `0 0 0 2.5px ${r.cor}, 0 2px 7px rgba(0,0,0,.3)` }}>
                          <Avatar name={nd.l.nome} src={nd.l.avatar_url} size={size} />
                        </span>
                      </button>
                    )
                  }),
                )}
              </div>
            )}
          </div>

          {/* Cartão da pessoa selecionada */}
          {sel && (
            <div className="mx-auto mt-3 max-w-[380px]">
              <div className="card hstack gap-3 p-3">
                <Avatar name={sel.nome} src={sel.avatar_url} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{sel.nome}</div>
                  <div className="truncate text-[11px] text-muted">
                    {sel.cargo}
                    {sel.faixa === 1 ? ' · Sócio' : sel.faixa === 2 ? ' · Gerência' : sel.unidade ? ` · ${sel.unidade}` : ''}
                  </div>
                  <button
                    onClick={() => {
                      tapHaptic()
                      navigate(`/perfil/${sel.matricula}`)
                    }}
                    className="mt-1.5 hstack gap-1 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold text-accent tap"
                  >
                    Ver perfil <ChevronRight size={13} />
                  </button>
                </div>
                <button onClick={() => setSel(null)} aria-label="Fechar" className="grid h-7 w-7 place-items-center rounded-full text-muted-2 tap hover:bg-fill">
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Legenda */}
          <div className="mx-auto mt-3 flex max-w-[380px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: OURO }} /><b className="text-text">Sócios</b></span>
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted-2" />Unidades</span>
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ROXO }} /><b className="text-text">Gerentes</b> (gira)</span>
          </div>

          {rot !== 0 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => { tapHaptic(); setRot(0) }}
                className="hstack mx-auto gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted tap"
              >
                <RotateCcw size={13} /> Realinhar anel
              </button>
            </div>
          )}

          <p className="mx-auto mt-4 max-w-[380px] px-1 pb-10 text-center text-[11px] text-muted-2">
            Protótipo — gire os gerentes pra revelar os líderes de cada unidade.
          </p>
        </div>
      )}
    </>
  )
}

export default OrganogramaAneis

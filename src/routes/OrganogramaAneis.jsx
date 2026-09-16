import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, RotateCcw, X, ChevronRight } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste).
//   centro: Tatá · anel 1: Sócios · anel 2: Unidades · anel 3: Gerentes (GIRATÓRIO).
// Gesto único no SVG (com touch-action:none) e hit-test por ângulo/raio — sem
// captura por fatia, pra não travar o toque. Dados: RPC organograma_lideres().

const UNIDADES = [
  { u: 'Itaim', cor: '#3b82f6', curto: 'Itaim' },
  { u: 'Pinheiros', cor: '#14b8a6', curto: 'Pinheiros' },
  { u: 'Poke - Pinheiros', cor: '#f0a92b', curto: 'Poke' },
  { u: 'Tatá House', cor: '#ec4899', curto: 'Tatá House' },
  { u: 'Administrativo', cor: '#64748b', curto: 'ADM' },
]

const OURO = '#eab308'
const ROXO = '#a855f7'

const VB = 340
const CX = 170
const CY = 170
const R_CENTRO = 26
const S_IN = 26
const S_OUT = 78
const S_LAB = 52
const U_IN = 78
const U_OUT = 122
const U_LAB = 100
const G_IN = 122
const G_OUT = 164
const G_LAB = 143
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
// índice do setor sob o ângulo `a` (topo = 0), com deslocamento de rotação
function setorDe(a, n, off = 0) {
  let x = a + Math.PI / 2 - off
  x = ((x % TAU) + TAU) % TAU
  return Math.floor(x / (TAU / n)) % n
}

export function OrganogramaAneis() {
  const navigate = useNavigate()
  const [gente, setGente] = useState(null)
  const [rot, setRot] = useState(0) // rotação do anel de gerentes (rad)
  const [sel, setSel] = useState(null) // pessoa selecionada (cartão)
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

  const { socios, gerentes } = useMemo(() => {
    const g = gente || []
    const porFaixa = (f) =>
      g
        .filter((p) => p.faixa === f)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome, 'pt'))
    return { socios: porFaixa(1), gerentes: porFaixa(2) }
  }, [gente])

  const N_S = Math.max(1, socios.length)
  const N_U = UNIDADES.length
  const N_G = Math.max(1, gerentes.length)

  // ── gesto único no SVG ─────────────────────────────────────────────────────
  function ponto(e) {
    const r = svgRef.current.getBoundingClientRect()
    const sx = ((e.clientX - r.left) / r.width) * VB
    const sy = ((e.clientY - r.top) / r.height) * VB
    const dx = sx - CX
    const dy = sy - CY
    return { r: Math.hypot(dx, dy), a: Math.atan2(dy, dx) }
  }
  function regiao(rr) {
    if (rr <= R_CENTRO + 3) return 'centro'
    if (rr <= S_OUT) return 'socios'
    if (rr <= U_OUT) return 'uni'
    if (rr <= 176) return 'ger'
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
    if (!d0 || d0.moved) return // girou → não seleciona
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
          <span>Versão de teste. Arraste o anel de fora (gerentes) pra girar. Toque num nome pra ver a pessoa.</span>
        </div>
      </div>

      {gente === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="px-4 pt-3">
          <div className="mx-auto w-full select-none" style={{ maxWidth: 360 }}>
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
              {/* anel 2 — unidades (mesma proporção) */}
              {UNIDADES.map((u, i) => {
                const a0 = -Math.PI / 2 + (i / N_U) * TAU
                const a1 = -Math.PI / 2 + ((i + 1) / N_U) * TAU
                const [lx, ly] = polar(U_LAB, (a0 + a1) / 2)
                return (
                  <g key={`u-${u.u}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(U_IN, U_OUT, a0, a1)} style={{ fill: u.cor, fillOpacity: 0.16, stroke: 'rgb(var(--bg))', strokeWidth: 2 }} />
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
                const on = sel?.matricula === p.matricula
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
              <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" style={{ fill: 'rgb(var(--bg))', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, pointerEvents: 'none' }}>
                TATÁ
              </text>
            </svg>
          </div>

          {/* Cartão da pessoa selecionada */}
          {sel && (
            <div className="mx-auto mt-3 max-w-[360px]">
              <div className="card hstack gap-3 p-3">
                <Avatar name={sel.nome} src={sel.avatar_url} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{sel.nome}</div>
                  <div className="truncate text-[11px] text-muted">
                    {sel.cargo}
                    {sel.faixa === 1 ? ' · Sócio' : sel.faixa === 2 ? ' · Gerência' : ''}
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
          <div className="mx-auto mt-3 flex max-w-[360px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted">
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

          <p className="mx-auto mt-4 max-w-[360px] px-1 pb-10 text-center text-[11px] text-muted-2">
            Protótipo — próximos passos: alinhar cada gerente à sua unidade e abrir os líderes.
          </p>
        </div>
      )}
    </>
  )
}

export default OrganogramaAneis

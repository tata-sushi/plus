import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste).
//   centro: Tatá
//   anel 1: Sócios (Tito, Luiz, Léo)
//   anel 2: Unidades (mesma proporção)
//   anel 3: Gerentes — GIRATÓRIO (arraste pra rodar)
// Sócios/Gerentes vêm da RPC organograma_lideres() (faixas 1 e 2), com foto real.
// "Depois a gente desenvolve outra parte" (líderes etc.).

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
const R1_IN = 26
const R1_OUT = 74 // sócios
const R2_IN = 74
const R2_OUT = 120 // unidades
const R_SOCIO = 50
const R_UNI_LAB = 97
const R_GER = 142 // gerentes (giratório)

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

export function OrganogramaAneis() {
  const navigate = useNavigate()
  const [gente, setGente] = useState(null)
  const [w, setW] = useState(0)
  const [rot, setRot] = useState(0) // rotação do anel de gerentes (rad)
  const boxRef = useRef(null)
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
    const elx = boxRef.current
    if (!elx) return
    const medir = () => setW(elx.clientWidth || 0)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(elx)
    return () => ro.disconnect()
  }, [gente])

  const { socios, gerentes } = useMemo(() => {
    const g = gente || []
    const porFaixa = (f) =>
      g.filter((p) => p.faixa === f).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome, 'pt'))
    return { socios: porFaixa(1), gerentes: porFaixa(2) }
  }, [gente])

  const k = w ? w / VB : 0

  // ── arrastar pra girar o anel de gerentes ──────────────────────────────────
  function angDe(e) {
    const r = boxRef.current.getBoundingClientRect()
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
  }
  function onDown(e) {
    drag.current = { last: angDe(e), moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onMove(e) {
    if (!drag.current) return
    const a = angDe(e)
    let d = a - drag.current.last
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    if (Math.abs(d) > 0.01) drag.current.moved = true
    drag.current.last = a
    setRot((r) => r + d)
  }
  function onUp(e, mat) {
    const moved = drag.current?.moved
    drag.current = null
    if (!moved && mat) {
      tapHaptic()
      navigate(`/perfil/${mat}`)
    }
  }

  const dragHandlers = (mat) => ({
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: (e) => onUp(e, mat),
    onPointerCancel: () => (drag.current = null),
  })

  return (
    <>
      <Header title="Organograma" />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="mt-3 hstack gap-2 rounded-card border border-line bg-surface px-3 py-2 text-[11px] text-muted">
          <RotateCcw size={14} className="shrink-0 text-accent" />
          <span>Versão de teste. Arraste o anel de fora (gerentes) pra girar. Toque numa pessoa pra abrir o perfil.</span>
        </div>
      </div>

      {gente === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="px-4 pt-3">
          <div ref={boxRef} className="relative mx-auto w-full select-none" style={{ maxWidth: 360 }}>
            <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="Organograma em anéis">
              {/* anel 2 — unidades (mesma proporção) */}
              {UNIDADES.map((u, i) => {
                const N = UNIDADES.length
                const a0 = -Math.PI / 2 + (i / N) * 2 * Math.PI
                const a1 = -Math.PI / 2 + ((i + 1) / N) * 2 * Math.PI
                return (
                  <path
                    key={`u-${u.u}`}
                    d={arc(R2_IN, R2_OUT, a0, a1)}
                    style={{ fill: u.cor, fillOpacity: 0.16, stroke: 'rgb(var(--bg))', strokeWidth: 2 }}
                  />
                )
              })}
              {/* anel 1 — sócios (fundo) */}
              {socios.map((_, i) => {
                const N = Math.max(1, socios.length)
                const a0 = -Math.PI / 2 + (i / N) * 2 * Math.PI
                const a1 = -Math.PI / 2 + ((i + 1) / N) * 2 * Math.PI
                return (
                  <path
                    key={`sb-${i}`}
                    d={arc(R1_IN, R1_OUT, a0, a1)}
                    style={{ fill: OURO, fillOpacity: 0.14, stroke: 'rgb(var(--bg))', strokeWidth: 2 }}
                  />
                )
              })}
              {/* rótulos das unidades */}
              {UNIDADES.map((u, i) => {
                const N = UNIDADES.length
                const mid = -Math.PI / 2 + ((i + 0.5) / N) * 2 * Math.PI
                const [x, y] = polar(R_UNI_LAB, mid)
                return (
                  <text
                    key={`ul-${u.u}`}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fill: 'rgb(var(--text))', fontSize: 9, fontWeight: 700, pointerEvents: 'none' }}
                  >
                    {u.curto}
                  </text>
                )
              })}
              {/* faixa do anel de gerentes (fundo giratório) */}
              <circle cx={CX} cy={CY} r={R_GER} fill="none" style={{ stroke: 'rgb(var(--line))', strokeWidth: 1.4, strokeDasharray: '2 4' }} />
              {/* centro Tatá */}
              <circle cx={CX} cy={CY} r={R_CENTRO} style={{ fill: 'rgb(var(--accent))', stroke: 'rgb(var(--surface))', strokeWidth: 2.5 }} />
              <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" style={{ fill: 'rgb(var(--bg))', fontSize: 10, fontWeight: 800, letterSpacing: 0.5, pointerEvents: 'none' }}>
                TATÁ
              </text>
            </svg>

            {/* Camada de fotos (DOM) */}
            {k > 0 && (
              <div className="absolute inset-0">
                {/* Sócios (fixos) */}
                {socios.map((p, i) => {
                  const N = Math.max(1, socios.length)
                  const mid = -Math.PI / 2 + ((i + 0.5) / N) * 2 * Math.PI
                  const [x, y] = polar(R_SOCIO, mid)
                  return (
                    <button
                      key={p.matricula}
                      onClick={() => {
                        tapHaptic()
                        navigate(`/perfil/${p.matricula}`)
                      }}
                      aria-label={p.nome}
                      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 tap"
                      style={{ left: x * k, top: y * k }}
                    >
                      <span className="block rounded-full" style={{ boxShadow: `0 0 0 2.5px ${OURO}, 0 2px 6px rgba(0,0,0,.28)` }}>
                        <Avatar name={p.nome} src={p.avatar_url} size={Math.round(34 * k)} />
                      </span>
                      <span className="rounded-full bg-surface/90 px-1 text-[9px] font-semibold leading-tight text-text">
                        {primeiro(p.nome)}
                      </span>
                    </button>
                  )
                })}

                {/* Gerentes (anel giratório) */}
                {gerentes.map((p, i) => {
                  const N = Math.max(1, gerentes.length)
                  const mid = -Math.PI / 2 + ((i + 0.5) / N) * 2 * Math.PI + rot
                  const [x, y] = polar(R_GER, mid)
                  return (
                    <button
                      key={p.matricula}
                      {...dragHandlers(p.matricula)}
                      aria-label={p.nome}
                      className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none flex-col items-center gap-0.5 active:cursor-grabbing"
                      style={{ left: x * k, top: y * k }}
                    >
                      <span className="block rounded-full" style={{ boxShadow: `0 0 0 2.5px ${ROXO}, 0 2px 7px rgba(0,0,0,.3)` }}>
                        <Avatar name={p.nome} src={p.avatar_url} size={Math.round(40 * k)} />
                      </span>
                      <span className="rounded-full bg-surface/90 px-1 text-[9px] font-semibold leading-tight text-text">
                        {primeiro(p.nome)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Legenda */}
          <div className="mx-auto mt-3 flex max-w-[360px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: OURO }} /><b className="text-text">Sócios</b></span>
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted-2" />Unidades</span>
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ROXO }} /><b className="text-text">Gerentes</b> (gira)</span>
          </div>

          {rot !== 0 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  tapHaptic()
                  setRot(0)
                }}
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

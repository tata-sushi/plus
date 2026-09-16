import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, X, ChevronRight, RotateCcw } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste).
//   centro: logo Tatá (fundo preto) + Sócios · anel: Unidades (nome na curva).
//   Gerência (Cíntia/Fábio/Victor): fotos GIRATÓRIAS (sem anel). Ao entrar numa
//   unidade, as ramificações (líderes daquele gerente ali) nascem dele — recursivo.
// "Líder" = tem colaborador ativo abaixo. Paleta: carbon + citric + p&b.

const UNIDADES = [
  { u: 'Itaim', curto: 'Itaim' },
  { u: 'Pinheiros', curto: 'Pinheiros' },
  { u: 'Poke - Pinheiros', curto: 'Poke' },
  { u: 'Tatá House', curto: 'Tatá House' },
  { u: 'Administrativo', curto: 'Administrativo' },
]

const CITRIC = 'rgb(var(--accent))'
const CARBON = 'rgb(var(--carbon))'

const VB = 380
const CX = 190
const CY = 190
const R_CENTRO = 26
const S_IN = 26
const S_OUT = 54
const S_LAB = 40
const U_IN = 54
const U_OUT = 84
const U_LAB = 69
const R_GER = 106
const AV_GER = 30
const R_L1 = 140
const AV1 = 22
const R_L2 = 168
const AV2 = 18
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
function textArc(r, a0, a1) {
  const flip = Math.sin((a0 + a1) / 2) > 0
  const [x0, y0] = polar(r, flip ? a1 : a0)
  const [x1, y1] = polar(r, flip ? a0 : a1)
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0
  return `M${x0} ${y0} A${r} ${r} 0 ${large} ${flip ? 0 : 1} ${x1} ${y1}`
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

  // Cada gerente na sua posição (base + rotação); a unidade sob ele; e os líderes
  // dele naquela unidade (nível 1) + os líderes abaixo deles (nível 2).
  const reveals = useMemo(() => {
    const kidsDe = (idp) => (idp ? lideres.filter((c) => c.id_superior === idp) : [])
    return gerentes.map((g, i) => {
      const gAng = -Math.PI / 2 + (i / N_G) * TAU + rot
      const uIdx = setorDe(gAng, N_U)
      const unidade = UNIDADES[uIdx].u
      const acende = (g.unidades_alcance || []).includes(unidade) // alcance total (direto+indireto)
      const l1 = lideres.filter((l) => l.id_superior === g.id_pessoa && l.unidade === unidade)
      const step1 = 0.32
      const start1 = gAng - ((l1.length - 1) / 2) * step1
      const nivel1 = l1.map((l, j) => {
        const ang = start1 + j * step1
        const kids = kidsDe(l.id_pessoa)
        const step2 = 0.24
        const start2 = ang - ((kids.length - 1) / 2) * step2
        return { l, ang, kids: kids.map((c, m) => ({ l: c, ang: start2 + m * step2 })) }
      })
      return { g, gAng, uIdx, acende, nivel1 }
    })
  }, [gerentes, lideres, rot, N_G, N_U])

  const unidadesCasadas = new Set(reveals.filter((r) => r.acende).map((r) => r.uIdx))

  // ── girar a gerência (arrasta) ─────────────────────────────────────────────
  function angPtr(e) {
    const r = svgRef.current.getBoundingClientRect()
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2))
  }
  function onDownRot(e) {
    drag.current = { last: angPtr(e), moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onMoveRot(e) {
    const d0 = drag.current
    if (!d0) return
    const a = angPtr(e)
    let d = a - d0.last
    if (d > Math.PI) d -= TAU
    if (d < -Math.PI) d += TAU
    if (Math.abs(d) > 0.01) d0.moved = true
    d0.last = a
    setRot((v) => v + d)
  }
  function onUpRot(e, pessoa) {
    const d0 = drag.current
    drag.current = null
    if (!d0 || d0.moved) return
    if (pessoa) {
      tapHaptic()
      setSel(pessoa)
    }
  }
  const rotHandlers = (pessoa) => ({
    onPointerDown: onDownRot,
    onPointerMove: onMoveRot,
    onPointerUp: (e) => onUpRot(e, pessoa),
    onPointerCancel: () => (drag.current = null),
    style: { touchAction: 'none' },
  })

  return (
    <>
      <Header title="Organograma" />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="mt-3 rounded-card border border-line bg-surface px-3 py-2 text-[11px] text-muted">
          Gire a gerência (Cíntia, Fábio, Victor): ao entrar numa unidade, os líderes dela nascem do gerente. Toque numa pessoa pra ver o perfil.
        </div>
      </div>

      {gente === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="px-4 pt-3">
          <div className="relative mx-auto w-full select-none" style={{ maxWidth: 380 }}>
            <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="Organograma em anéis" style={{ touchAction: 'none' }}>
              {/* conectores (ramos que nascem do gerente) */}
              {reveals.map((r) =>
                r.nivel1.map((n1, j) => {
                  const [gx, gy] = polar(R_GER + AV_GER / 2 - 2, r.gAng)
                  const [ax, ay] = polar(R_L1 - AV1 / 2, n1.ang)
                  return (
                    <g key={`cn-${r.g.matricula}-${j}`}>
                      <line x1={gx} y1={gy} x2={ax} y2={ay} style={{ stroke: CARBON, strokeWidth: 1.7, opacity: 0.6, strokeLinecap: 'round' }} />
                      {n1.kids.map((c, m) => {
                        const [p1x, p1y] = polar(R_L1, n1.ang)
                        const [p2x, p2y] = polar(R_L2 - AV2 / 2, c.ang)
                        return <line key={`k-${m}`} x1={p1x} y1={p1y} x2={p2x} y2={p2y} style={{ stroke: CARBON, strokeWidth: 1.5, opacity: 0.5, strokeLinecap: 'round' }} />
                      })}
                    </g>
                  )
                }),
              )}

              {/* órbita giratória (guia) + área de arraste */}
              <circle cx={CX} cy={CY} r={R_GER} fill="none" style={{ stroke: CARBON, strokeWidth: 1.2, strokeDasharray: '2 5', opacity: 0.4 }} />
              <circle
                cx={CX}
                cy={CY}
                r={R_GER}
                fill="none"
                stroke="transparent"
                strokeWidth={38}
                onPointerDown={onDownRot}
                onPointerMove={onMoveRot}
                onPointerUp={(e) => onUpRot(e, null)}
                onPointerCancel={() => (drag.current = null)}
                style={{ cursor: 'grab', touchAction: 'none' }}
              />

              {/* anel — unidades (nome na curva) */}
              {UNIDADES.map((u, i) => {
                const a0 = -Math.PI / 2 + (i / N_U) * TAU
                const a1 = -Math.PI / 2 + ((i + 1) / N_U) * TAU
                const on = unidadesCasadas.has(i)
                return (
                  <g key={`u-${u.u}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(U_IN, U_OUT, a0, a1)} style={{ fill: on ? CITRIC : CARBON, fillOpacity: on ? 0.3 : 0.12, stroke: on ? CITRIC : 'rgb(var(--bg))', strokeWidth: on ? 2.5 : 2 }} />
                    <path id={`uarc-${i}`} d={textArc(U_LAB, a0 + 0.04, a1 - 0.04)} fill="none" />
                    <text style={{ fill: 'rgb(var(--text))', fontSize: 9, fontWeight: 700 }}>
                      <textPath href={`#uarc-${i}`} startOffset="50%" textAnchor="middle">
                        {u.curto}
                      </textPath>
                    </text>
                  </g>
                )
              })}

              {/* centro — sócios */}
              {socios.map((p, i) => {
                const a0 = -Math.PI / 2 + (i / N_S) * TAU
                const a1 = -Math.PI / 2 + ((i + 1) / N_S) * TAU
                const [lx, ly] = polar(S_LAB, (a0 + a1) / 2)
                const on = sel?.matricula === p.matricula
                return (
                  <g key={`s-${p.matricula}`} onClick={() => { tapHaptic(); setSel(p) }} style={{ cursor: 'pointer' }}>
                    <path d={arc(S_IN, S_OUT, a0, a1)} style={{ fill: CITRIC, fillOpacity: on ? 0.42 : 0.16, stroke: on ? CITRIC : 'rgb(var(--bg))', strokeWidth: on ? 2.5 : 2 }} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{ fill: 'rgb(var(--text))', fontSize: 8.5, fontWeight: 700, pointerEvents: 'none' }}>
                      {primeiro(p.nome)}
                    </text>
                  </g>
                )
              })}

              {/* núcleo preto (fundo do logo) */}
              <circle cx={CX} cy={CY} r={R_CENTRO} onClick={() => setSel(null)} style={{ fill: '#000', stroke: CITRIC, strokeWidth: 2, cursor: 'pointer' }} />
            </svg>

            {/* Camada DOM: logo + fotos */}
            {k > 0 && (
              <div className="pointer-events-none absolute inset-0">
                {/* logo Tatá (20% menor, no preto) */}
                <button
                  onClick={() => setSel(null)}
                  aria-label="Tatá"
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center"
                  style={{ left: CX * k, top: CY * k, width: 2 * R_CENTRO * k, height: 2 * R_CENTRO * k }}
                >
                  <img src="/icons/logo-mark.png" alt="Tatá" style={{ width: 30 * k, height: 'auto' }} />
                </button>

                {/* gerência (fotos giratórias) */}
                {reveals.map((r) => {
                  const [x, y] = polar(R_GER, r.gAng)
                  const size = Math.max(22, Math.round(AV_GER * k))
                  return (
                    <button
                      key={`ger-${r.g.matricula}`}
                      {...rotHandlers(r.g)}
                      aria-label={r.g.nome}
                      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing"
                      style={{ ...rotHandlers(r.g).style, left: x * k, top: y * k }}
                    >
                      <span className="block rounded-full" style={{ boxShadow: `0 0 0 2.5px ${CITRIC}, 0 2px 7px rgba(0,0,0,.3)` }}>
                        <Avatar name={r.g.nome} src={r.g.avatar_url} size={size} />
                      </span>
                    </button>
                  )
                })}

                {/* líderes revelados (nível 1 e 2) */}
                {reveals.flatMap((r) =>
                  r.nivel1.flatMap((n1) => [
                    { p: n1.l, ang: n1.ang, rad: R_L1, av: AV1 },
                    ...n1.kids.map((c) => ({ p: c.l, ang: c.ang, rad: R_L2, av: AV2 })),
                  ]),
                ).map((node) => {
                  const [x, y] = polar(node.rad, node.ang)
                  const size = Math.max(16, Math.round(node.av * k))
                  return (
                    <button
                      key={`ph-${node.p.matricula}`}
                      onClick={() => { tapHaptic(); setSel(node.p) }}
                      aria-label={node.p.nome}
                      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full tap"
                      style={{ left: x * k, top: y * k }}
                    >
                      <span className="block rounded-full" style={{ boxShadow: `0 0 0 2px ${CARBON}, 0 2px 5px rgba(0,0,0,.3)` }}>
                        <Avatar name={node.p.nome} src={node.p.avatar_url} size={size} />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cartão da pessoa */}
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
                    onClick={() => { tapHaptic(); navigate(`/perfil/${sel.matricula}`) }}
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
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CITRIC }} /><b className="text-text">Sócios e gerência</b></span>
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CARBON }} />Líderes</span>
          </div>

          {rot !== 0 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => { tapHaptic(); setRot(0) }}
                className="hstack mx-auto gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted tap"
              >
                <RotateCcw size={13} /> Realinhar
              </button>
            </div>
          )}

          <p className="mx-auto mt-4 max-w-[380px] px-1 pb-10 text-center text-[11px] text-muted-2">
            Protótipo — gire a gerência pra revelar os líderes de cada unidade.
          </p>
        </div>
      )}
    </>
  )
}

export default OrganogramaAneis

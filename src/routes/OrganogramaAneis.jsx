import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, X, ChevronRight, RotateCcw, ArrowDown } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste).
//   centro: logo Tatá + Sócios · anel: Unidades (GIRA) · gerência: fotos (GIRA).
//   Ao girar, a unidade acende pelo alcance do gerente; brotam os líderes.
//   Alinhando UMA unidade + UM gerente no FUNDO (↓), abre o TIME COMPLETO
//   (todos, não só líderes) embaixo. Paleta: carbon + citric + p&b.

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
const BOTTOM = Math.PI / 2

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
function difBottom(a) {
  let d = ((a - BOTTOM) % TAU + TAU) % TAU
  if (d > Math.PI) d -= TAU
  return Math.abs(d)
}
// apelidos dos sócios (só exibição)
const AP_SOCIO = { 8: 'Tito', 9: 'Luizinho', 10: 'Léo' }
function angIn(a, a0, a1) {
  const n = (x) => ((x % TAU) + TAU) % TAU
  return n(a - a0) <= n(a1 - a0)
}
// Tito: fatia maior no topo; Léo à esquerda-baixo; Luizinho à direita-baixo.
function fatiasSocios(socios) {
  const N = socios.length
  if (N === 3) {
    const big = TAU * 0.4
    const small = (TAU - big) / 2
    const t0 = -Math.PI / 2 - big / 2
    const t1 = -Math.PI / 2 + big / 2
    return [
      { p: socios[0], a0: t0, a1: t1 }, // Tito (topo, maior)
      { p: socios[1], a0: t1, a1: t1 + small }, // Luizinho (direita-baixo)
      { p: socios[2], a0: t0 - small, a1: t0 }, // Léo (esquerda-baixo)
    ]
  }
  return socios.map((p, i) => ({ p, a0: -Math.PI / 2 + (i / Math.max(1, N)) * TAU, a1: -Math.PI / 2 + ((i + 1) / Math.max(1, N)) * TAU }))
}
// achata a árvore do time (id_superior) em linhas indentadas
function achatarTime(rows) {
  const byId = {}
  rows.forEach((r) => (byId[r.id_pessoa] = { r, kids: [] }))
  const roots = []
  rows.forEach((r) => {
    const pai = r.id_superior ? byId[r.id_superior] : null
    if (pai) pai.kids.push(byId[r.id_pessoa])
    else roots.push(byId[r.id_pessoa])
  })
  const flat = []
  const cmp = (a, b) => a.r.nome.localeCompare(b.r.nome, 'pt')
  const walk = (n, d) => {
    flat.push({ r: n.r, depth: d })
    n.kids.sort(cmp).forEach((k) => walk(k, d + 1))
  }
  roots.sort(cmp).forEach((r) => walk(r, 0))
  return flat
}

export function OrganogramaAneis() {
  const navigate = useNavigate()
  const [gente, setGente] = useState(null)
  const [rot, setRot] = useState(0) // gerência
  const [rotU, setRotU] = useState(0) // unidades
  const [sel, setSel] = useState(null)
  const [time, setTime] = useState(null) // { key, ger, unidade, rows }
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
  const socioSlices = useMemo(() => fatiasSocios(socios), [socios])

  const reveals = useMemo(() => {
    const kidsDe = (idp) => (idp ? lideres.filter((c) => c.id_superior === idp) : [])
    return gerentes.map((g, i) => {
      const gAng = -Math.PI / 2 + (i / N_G) * TAU + rot
      const uIdx = setorDe(gAng, N_U, rotU)
      const unidade = UNIDADES[uIdx].u
      const acende = (g.unidades_alcance || []).includes(unidade)
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
  }, [gerentes, lideres, rot, rotU, N_G, N_U])

  const unidadesCasadas = new Set(reveals.filter((r) => r.acende).map((r) => r.uIdx))

  // Alinhamento no fundo: uma unidade + um gerente perto de ↓ e com alcance.
  let bUniIdx = -1
  let bUniD = 0.42
  UNIDADES.forEach((u, i) => {
    const c = -Math.PI / 2 + ((i + 0.5) / N_U) * TAU + rotU
    const d = difBottom(c)
    if (d < bUniD) {
      bUniD = d
      bUniIdx = i
    }
  })
  let bGer = null
  let bGerD = 0.42
  reveals.forEach((r) => {
    const d = difBottom(r.gAng)
    if (d < bGerD) {
      bGerD = d
      bGer = r.g
    }
  })
  const bUnidade = bUniIdx >= 0 ? UNIDADES[bUniIdx].u : null
  const timeAtivo =
    bGer && bUnidade && (bGer.unidades_alcance || []).includes(bUnidade)
      ? { gid: bGer.id_pessoa, unidade: bUnidade, ger: bGer }
      : null
  const timeKey = timeAtivo ? `${timeAtivo.gid}|${timeAtivo.unidade}` : null

  useEffect(() => {
    if (!timeKey) {
      setTime(null)
      return
    }
    const [gid, unidade] = timeKey.split('|')
    let ativo = true
    supabase.rpc('organograma_time', { p_id: gid, p_unidade: unidade }).then(({ data }) => {
      if (ativo) setTime({ key: timeKey, ger: timeAtivo.ger, unidade, rows: Array.isArray(data) ? data : [] })
    })
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeKey])

  const timeFlat = useMemo(() => (time?.rows?.length ? achatarTime(time.rows) : []), [time])

  // ── gesto: gira unidades (banda) ou gerência (órbita) ───────────────────────
  function ponto(e) {
    const r = svgRef.current.getBoundingClientRect()
    const sx = ((e.clientX - r.left) / r.width) * VB
    const sy = ((e.clientY - r.top) / r.height) * VB
    return { r: Math.hypot(sx - CX, sy - CY), a: Math.atan2(sy - CY, sx - CX) }
  }
  function regiao(rr) {
    if (rr <= R_CENTRO + 3) return 'centro'
    if (rr <= S_OUT) return 'socios'
    if (rr <= U_OUT + 2) return 'uni'
    if (rr <= R_GER + 20) return 'ger'
    return 'fora'
  }
  function onDown(e) {
    const { r, a } = ponto(e)
    drag.current = { reg: regiao(r), last: a, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onMove(e) {
    const d0 = drag.current
    if (!d0 || (d0.reg !== 'uni' && d0.reg !== 'ger')) return
    const { a } = ponto(e)
    let d = a - d0.last
    if (d > Math.PI) d -= TAU
    if (d < -Math.PI) d += TAU
    if (Math.abs(d) > 0.01) d0.moved = true
    d0.last = a
    if (d0.reg === 'uni') setRotU((v) => v + d)
    else setRot((v) => v + d)
  }
  function onUp(e) {
    const d0 = drag.current
    drag.current = null
    if (!d0 || d0.moved) return
    const { r, a } = ponto(e)
    const reg = regiao(r)
    if (reg === 'centro') return setSel(null)
    if (reg === 'socios' && socios.length) {
      const s = socioSlices.find((x) => angIn(a, x.a0, x.a1))
      if (s) {
        tapHaptic()
        setSel(s.p)
      }
      return
    }
  }
  // arrastar numa foto de gerente também gira a gerência (e toque seleciona)
  function gerDown(e) {
    drag.current = { reg: 'ger', last: ponto(e).a, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function gerUp(e, g) {
    const d0 = drag.current
    drag.current = null
    if (!d0 || d0.moved) return
    tapHaptic()
    setSel(g)
  }

  return (
    <>
      <Header title="Organograma" />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="mt-3 rounded-card border border-line bg-surface px-3 py-2 text-[11px] text-muted">
          Gire as unidades e a gerência. Ao alinhar uma unidade e um gerente no fundo (↓), abre o time completo embaixo.
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
              {/* captura de gestos (fundo) */}
              <rect x="0" y="0" width={VB} height={VB} fill="transparent" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)} style={{ pointerEvents: 'all', touchAction: 'none', cursor: 'grab' }} />

              {/* eixo do fundo (slot de alinhamento) */}
              {(() => {
                const [ax, ay] = polar(R_CENTRO, BOTTOM)
                const [bx, by] = polar(R_GER + 16, BOTTOM)
                return <line x1={ax} y1={ay} x2={bx} y2={by} style={{ stroke: CITRIC, strokeWidth: timeAtivo ? 2.4 : 1.4, strokeDasharray: timeAtivo ? 'none' : '2 5', opacity: timeAtivo ? 0.9 : 0.35, pointerEvents: 'none' }} />
              })()}

              {/* conectores (ramos) */}
              {reveals.map((r) =>
                r.nivel1.map((n1, j) => {
                  const [gx, gy] = polar(R_GER + AV_GER / 2 - 2, r.gAng)
                  const [ax, ay] = polar(R_L1 - AV1 / 2, n1.ang)
                  return (
                    <g key={`cn-${r.g.matricula}-${j}`} style={{ pointerEvents: 'none' }}>
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

              {/* órbita da gerência (guia) */}
              <circle cx={CX} cy={CY} r={R_GER} fill="none" style={{ stroke: CARBON, strokeWidth: 1.2, strokeDasharray: '2 5', opacity: 0.4, pointerEvents: 'none' }} />

              {/* anel — unidades (gira; nome na curva) */}
              {UNIDADES.map((u, i) => {
                const a0 = -Math.PI / 2 + (i / N_U) * TAU + rotU
                const a1 = -Math.PI / 2 + ((i + 1) / N_U) * TAU + rotU
                const on = unidadesCasadas.has(i)
                const noFundo = i === bUniIdx
                return (
                  <g key={`u-${u.u}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(U_IN, U_OUT, a0, a1)} style={{ fill: on ? CITRIC : CARBON, fillOpacity: on ? 0.3 : 0.12, stroke: on || noFundo ? CITRIC : 'rgb(var(--bg))', strokeWidth: on || noFundo ? 2.5 : 2 }} />
                    <path id={`uarc-${i}`} d={textArc(U_LAB, a0 + 0.04, a1 - 0.04)} fill="none" />
                    <text style={{ fill: 'rgb(var(--text))', fontSize: 9, fontWeight: 700 }}>
                      <textPath href={`#uarc-${i}`} startOffset="50%" textAnchor="middle">
                        {u.curto}
                      </textPath>
                    </text>
                  </g>
                )
              })}

              {/* centro — sócios (Tito maior no topo) */}
              {socioSlices.map(({ p, a0, a1 }) => {
                const [lx, ly] = polar(S_LAB, (a0 + a1) / 2)
                const on = sel?.matricula === p.matricula
                return (
                  <g key={`s-${p.matricula}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(S_IN, S_OUT, a0, a1)} style={{ fill: CITRIC, fillOpacity: on ? 0.42 : 0.16, stroke: on ? CITRIC : 'rgb(var(--bg))', strokeWidth: on ? 2.5 : 2 }} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" style={{ fill: 'rgb(var(--text))', fontSize: 8.5, fontWeight: 700 }}>
                      {AP_SOCIO[p.matricula] || primeiro(p.nome)}
                    </text>
                  </g>
                )
              })}

              {/* núcleo preto (fundo do logo) */}
              <circle cx={CX} cy={CY} r={R_CENTRO} style={{ fill: '#000', stroke: CITRIC, strokeWidth: 2, pointerEvents: 'none' }} />
            </svg>

            {/* Camada DOM: logo + fotos */}
            {k > 0 && (
              <div className="pointer-events-none absolute inset-0">
                <button onClick={() => setSel(null)} aria-label="Tatá" className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center" style={{ left: CX * k, top: CY * k, width: 2 * R_CENTRO * k, height: 2 * R_CENTRO * k }}>
                  <img src="/icons/logo-mark.png" alt="Tatá" style={{ width: 30 * k, height: 'auto' }} />
                </button>

                {/* gerência (fotos giratórias) */}
                {reveals.map((r) => {
                  const [x, y] = polar(R_GER, r.gAng)
                  const size = Math.max(22, Math.round(AV_GER * k))
                  const noFundo = bGer?.matricula === r.g.matricula && timeAtivo
                  return (
                    <button
                      key={`ger-${r.g.matricula}`}
                      onPointerDown={gerDown}
                      onPointerMove={onMove}
                      onPointerUp={(e) => gerUp(e, r.g)}
                      onPointerCancel={() => (drag.current = null)}
                      aria-label={r.g.nome}
                      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing"
                      style={{ left: x * k, top: y * k, touchAction: 'none' }}
                    >
                      <span className="block rounded-full" style={{ boxShadow: `0 0 0 ${noFundo ? 3 : 2.5}px ${CITRIC}, 0 2px 7px rgba(0,0,0,.3)` }}>
                        <Avatar name={r.g.nome} src={r.g.avatar_url} size={size} />
                      </span>
                    </button>
                  )
                })}

                {/* líderes revelados */}
                {reveals.flatMap((r) =>
                  r.nivel1.flatMap((n1) => [
                    { p: n1.l, ang: n1.ang, rad: R_L1, av: AV1 },
                    ...n1.kids.map((c) => ({ p: c.l, ang: c.ang, rad: R_L2, av: AV2 })),
                  ]),
                ).map((node) => {
                  const [x, y] = polar(node.rad, node.ang)
                  const size = Math.max(16, Math.round(node.av * k))
                  return (
                    <button key={`ph-${node.p.matricula}`} onClick={() => { tapHaptic(); setSel(node.p) }} aria-label={node.p.nome} className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full tap" style={{ left: x * k, top: y * k }}>
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
                  <button onClick={() => { tapHaptic(); navigate(`/perfil/${sel.matricula}`) }} className="mt-1.5 hstack gap-1 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-bold text-accent tap">
                    Ver perfil <ChevronRight size={13} />
                  </button>
                </div>
                <button onClick={() => setSel(null)} aria-label="Fechar" className="grid h-7 w-7 place-items-center rounded-full text-muted-2 tap hover:bg-fill">
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Legenda + realinhar */}
          <div className="mx-auto mt-3 flex max-w-[380px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CITRIC }} /><b className="text-text">Sócios e gerência</b></span>
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CARBON }} />Líderes</span>
            {(rot !== 0 || rotU !== 0) && (
              <button onClick={() => { tapHaptic(); setRot(0); setRotU(0) }} className="hstack gap-1 rounded-full border border-line bg-surface px-2.5 py-1 font-semibold text-muted tap">
                <RotateCcw size={12} /> Realinhar
              </button>
            )}
          </div>

          {/* Time completo (alinhamento no fundo) */}
          {timeAtivo && (
            <div className="mx-auto mt-4 max-w-[380px]">
              <div className="hstack gap-2 px-1 pb-2 text-xs">
                <ArrowDown size={14} className="text-accent" />
                <span className="font-bold text-text">Time de {primeiro(timeAtivo.ger.nome)}</span>
                <span className="text-muted">· {timeAtivo.unidade}</span>
                <span className="ml-auto text-muted-2">{timeFlat.length}</span>
              </div>
              {time && time.key === timeKey ? (
                timeFlat.length ? (
                  <div className="card divide-y divide-line overflow-hidden">
                    {timeFlat.map(({ r, depth }) => (
                      <button key={r.matricula} onClick={() => { tapHaptic(); navigate(`/perfil/${r.matricula}`) }} className="hstack w-full gap-2.5 py-2 pr-3 text-left tap" style={{ paddingLeft: 12 + Math.min(depth, 5) * 16 }}>
                        {depth > 0 && <span className="h-4 w-2 shrink-0 border-l border-line" />}
                        <Avatar name={r.nome} src={r.avatar_url} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">{r.nome}</div>
                          <div className="truncate text-[10.5px] text-muted">{r.cargo}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-1 text-[11px] text-muted">Sem colaboradores nessa unidade.</p>
                )
              ) : (
                <div className="hstack justify-center py-4 text-muted-2"><Loader2 size={16} className="animate-spin" /></div>
              )}
            </div>
          )}

          <p className="mx-auto mt-4 max-w-[380px] px-1 pb-10 text-center text-[11px] text-muted-2">
            Protótipo — no fundo (↓) abre o time inteiro; nas outras posições, só os líderes.
          </p>
        </div>
      )}
    </>
  )
}

export default OrganogramaAneis

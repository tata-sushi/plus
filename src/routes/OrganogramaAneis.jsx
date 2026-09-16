import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, X, ChevronRight, RotateCcw } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste).
//   centro: logo Tatá + Sócios · anel: Unidades (GIRA) · gerência: fotos (GIRA).
//   Ramificação ORGÂNICA: os líderes da unidade sob o gerente abrem num leque
//   a partir dele (nível 1), os líderes deles no nível 2 — e, quando o gerente
//   está alinhado no FUNDO, a MESMA recursão continua até o fim com todo mundo.
//   Paleta: carbon + citric + p&b.

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
const TAU = 2 * Math.PI
const BOTTOM = Math.PI / 2

// raio e passo angular por nível (nível 1 = 140/0.32, nível 2 = 168/0.24 — o padrão original)
const rNivel = (d) => R_GER + 34 + (d - 1) * 28
const stepNivel = (d) => 0.32 * Math.pow(0.76, d - 1)
const avNivel = (d) => Math.max(12, 24 - (d - 1) * 3)

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
const AP_SOCIO = { 8: 'Tito', 9: 'Luizinho', 10: 'Léo' }
function angIn(a, a0, a1) {
  const n = (x) => ((x % TAU) + TAU) % TAU
  return n(a - a0) <= n(a1 - a0)
}
function fatiasSocios(socios) {
  const N = socios.length
  if (N === 3) {
    const big = TAU * 0.4
    const small = (TAU - big) / 2
    const t0 = -Math.PI / 2 - big / 2
    const t1 = -Math.PI / 2 + big / 2
    return [
      { p: socios[0], a0: t0, a1: t1 },
      { p: socios[1], a0: t1, a1: t1 + small },
      { p: socios[2], a0: t0 - small, a1: t0 },
    ]
  }
  return socios.map((p, i) => ({ p, a0: -Math.PI / 2 + (i / Math.max(1, N)) * TAU, a1: -Math.PI / 2 + ((i + 1) / Math.max(1, N)) * TAU }))
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
    return () => { ativo = false }
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
      g.filter((p) => p.faixa === f).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome, 'pt'))
    return { socios: porFaixa(1), gerentes: porFaixa(2), lideres: porFaixa(3) }
  }, [gente])

  const N_S = Math.max(1, socios.length)
  const N_U = UNIDADES.length
  const N_G = Math.max(1, gerentes.length)
  const k = w ? w / VB : 0
  const socioSlices = useMemo(() => fatiasSocios(socios), [socios])

  // 1) posição/unidade/alcance de cada gerente
  const gerAngs = gerentes.map((g, i) => {
    const gAng = -Math.PI / 2 + (i / N_G) * TAU + rot
    const uIdx = setorDe(gAng, N_U, rotU)
    const unidade = UNIDADES[uIdx].u
    const acende = (g.unidades_alcance || []).includes(unidade)
    return { g, gAng, uIdx, unidade, acende }
  })

  // 2) alinhamento no fundo (unidade + gerente com alcance) → time ativo
  let bUniIdx = -1
  let bUniD = 0.42
  UNIDADES.forEach((u, i) => {
    const c = -Math.PI / 2 + ((i + 0.5) / N_U) * TAU + rotU
    const d = difBottom(c)
    if (d < bUniD) { bUniD = d; bUniIdx = i }
  })
  let bGa = null
  let bGerD = 0.42
  gerAngs.forEach((ga) => {
    const d = difBottom(ga.gAng)
    if (d < bGerD) { bGerD = d; bGa = ga }
  })
  const bUnidade = bUniIdx >= 0 ? UNIDADES[bUniIdx].u : null
  const timeAtivo =
    bGa && bUnidade && (bGa.g.unidades_alcance || []).includes(bUnidade)
      ? { gid: bGa.g.id_pessoa, unidade: bUnidade, ger: bGa.g }
      : null
  const timeKey = timeAtivo ? `${timeAtivo.gid}|${timeAtivo.unidade}` : null
  const alinhadoId = timeAtivo ? timeAtivo.gid : null

  useEffect(() => {
    if (!timeKey) { setTime(null); return }
    const [gid, unidade] = timeKey.split('|')
    let ativo = true
    supabase.rpc('organograma_time', { p_id: gid, p_unidade: unidade }).then(({ data }) => {
      if (ativo) setTime({ key: timeKey, ger: timeAtivo.ger, unidade, rows: Array.isArray(data) ? data : [] })
    })
    return () => { ativo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeKey])

  // 3) ramificação orgânica de cada gerente: leque de líderes (2 níveis) — ou,
  //    se alinhado no fundo com o time carregado, a mesma recursão até o fim.
  const reveals = gerAngs.map((ga) => {
    const aligned = alinhadoId === ga.g.id_pessoa && !!time && time.key === timeKey
    let diretos
    let kidsOf
    let maxDepth
    if (aligned) {
      const byPai = {}
      time.rows.forEach((r) => { (byPai[r.id_superior] = byPai[r.id_superior] || []).push(r) })
      const temKids = (r) => ((byPai[r.id_pessoa] || []).length > 0 ? 1 : 0)
      const cmp = (a, b) => temKids(b) - temKids(a) || a.nome.localeCompare(b.nome, 'pt')
      diretos = (byPai[ga.g.id_pessoa] || []).slice().sort(cmp)
      kidsOf = (r) => (byPai[r.id_pessoa] || []).slice().sort(cmp)
      maxDepth = 99
    } else {
      diretos = lideres.filter((l) => l.id_superior === ga.g.id_pessoa && l.unidade === ga.unidade)
      kidsOf = (r) => lideres.filter((c) => c.id_superior === r.id_pessoa)
      maxDepth = 2
    }
    const nodes = []
    const links = []
    const build = (p, ang, d, parentAng, parentD) => {
      const [x, y] = polar(rNivel(d), ang)
      nodes.push({ p, x, y, depth: d })
      const [px, py] = parentD === 0 ? polar(R_GER, parentAng) : polar(rNivel(parentD), parentAng)
      links.push({ x1: px, y1: py, x2: x, y2: y })
      if (d >= maxDepth) return
      const kids = kidsOf(p)
      // família grande: limita a abertura do leque (≈63°) pra descer em vez de virar arco
      const st = kids.length > 1 ? Math.min(stepNivel(d + 1), 1.1 / (kids.length - 1)) : stepNivel(d + 1)
      const start = ang - ((kids.length - 1) / 2) * st
      kids.forEach((c, m) => build(c, start + m * st, d + 1, ang, d))
    }
    const st1 = stepNivel(1)
    const start1 = ga.gAng - ((diretos.length - 1) / 2) * st1
    diretos.forEach((p, j) => build(p, start1 + j * st1, 1, ga.gAng, 0))
    return { ...ga, nodes, links, aligned }
  })

  const unidadesCasadas = new Set(reveals.filter((r) => r.acende).map((r) => r.uIdx))

  // altura do container: cresce pra baixo conforme a ramificação mais funda
  let contH
  if (k) {
    const maxY = reveals.reduce((m, rv) => rv.nodes.reduce((mm, n) => Math.max(mm, n.y), m), 0)
    const h = maxY * k + 34
    if (h > w + 2) contH = h
  }

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
      if (s) { tapHaptic(); setSel(s.p) }
    }
  }
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
      </div>

      {gente === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-hidden px-4 pt-1">
          <div className="relative mx-auto w-full select-none" style={{ maxWidth: 380, height: contH }}>
            <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="Organograma em anéis" style={{ touchAction: 'none' }}>
              <rect x="0" y="0" width={VB} height={VB} fill="transparent" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)} style={{ pointerEvents: 'all', touchAction: 'none', cursor: 'grab' }} />

              {/* órbita da gerência (guia) */}
              <circle cx={CX} cy={CY} r={R_GER} fill="none" style={{ stroke: CARBON, strokeWidth: 1.2, strokeDasharray: '2 5', opacity: 0.4, pointerEvents: 'none' }} />

              {/* anel — unidades (gira; nome na curva) */}
              {UNIDADES.map((u, i) => {
                const a0 = -Math.PI / 2 + (i / N_U) * TAU + rotU
                const a1 = -Math.PI / 2 + ((i + 1) / N_U) * TAU + rotU
                const on = unidadesCasadas.has(i)
                return (
                  <g key={`u-${u.u}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(U_IN, U_OUT, a0, a1)} style={{ fill: on ? CITRIC : CARBON, fillOpacity: on ? 0.3 : 0.12, stroke: on ? CITRIC : 'rgb(var(--bg))', strokeWidth: on ? 2.5 : 2 }} />
                    <path id={`uarc-${i}`} d={textArc(U_LAB, a0 + 0.04, a1 - 0.04)} fill="none" />
                    <text style={{ fill: 'rgb(var(--text))', fontSize: 9, fontWeight: 700 }}>
                      <textPath href={`#uarc-${i}`} startOffset="50%" textAnchor="middle">{u.curto}</textPath>
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

              <circle cx={CX} cy={CY} r={R_CENTRO} style={{ fill: '#000', stroke: CITRIC, strokeWidth: 2, pointerEvents: 'none' }} />
            </svg>

            {/* Conectores das ramificações (sempre; pode passar da roda) */}
            {k > 0 && (
              <svg className="pointer-events-none absolute left-0 top-0" width={w} height={contH || w} style={{ overflow: 'visible' }}>
                {reveals.map((rv) =>
                  rv.links.map((l, i) => {
                    // curva leve (orgânica): controle no meio, deslocado perpendicular
                    const x1 = l.x1 * k, y1 = l.y1 * k, x2 = l.x2 * k, y2 = l.y2 * k
                    const cx = (x1 + x2) / 2 + (y2 - y1) * 0.18
                    const cy = (y1 + y2) / 2 - (x2 - x1) * 0.18
                    return <path key={`${rv.g.matricula}-${i}`} d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} fill="none" style={{ stroke: CARBON, strokeWidth: 1.6, opacity: 0.55, strokeLinecap: 'round' }} />
                  }),
                )}
              </svg>
            )}

            {/* Camada DOM: logo + fotos */}
            {k > 0 && (
              <div className="pointer-events-none absolute inset-0">
                <button onClick={() => setSel(null)} aria-label="Tatá" className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center" style={{ left: CX * k, top: CY * k, width: 2 * R_CENTRO * k, height: 2 * R_CENTRO * k }}>
                  <img src="/icons/logo-mark.png" alt="Tatá" style={{ width: 30 * k, height: 'auto' }} />
                </button>

                {/* ramificações (líderes — ou time inteiro no fundo) */}
                {reveals.map((rv) =>
                  rv.nodes.map((n) => {
                    const size = Math.max(12, Math.round(avNivel(n.depth) * k))
                    return (
                      <button key={`ph-${rv.g.matricula}-${n.p.matricula}`} onClick={() => { tapHaptic(); setSel(n.p) }} aria-label={n.p.nome} className="pointer-events-auto absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full tap" style={{ left: n.x * k, top: n.y * k }}>
                        <span className="block rounded-full" style={{ boxShadow: `0 0 0 2px ${CARBON}, 0 2px 5px rgba(0,0,0,.3)` }}>
                          <Avatar name={n.p.nome} src={n.p.avatar_url} size={size} />
                        </span>
                      </button>
                    )
                  }),
                )}

                {/* gerência (fotos giratórias) */}
                {gerAngs.map((ga) => {
                  const [x, y] = polar(R_GER, ga.gAng)
                  const size = Math.max(22, Math.round(AV_GER * k))
                  return (
                    <button
                      key={`ger-${ga.g.matricula}`}
                      onPointerDown={gerDown}
                      onPointerMove={onMove}
                      onPointerUp={(e) => gerUp(e, ga.g)}
                      onPointerCancel={() => (drag.current = null)}
                      aria-label={ga.g.nome}
                      className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing"
                      style={{ left: x * k, top: y * k, touchAction: 'none' }}
                    >
                      <span className="block rounded-full" style={{ boxShadow: `0 0 0 2.5px ${CITRIC}, 0 2px 7px rgba(0,0,0,.3)` }}>
                        <Avatar name={ga.g.nome} src={ga.g.avatar_url} size={size} />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* carregando o time ao alinhar */}
          {timeAtivo && !(time && time.key === timeKey) && (
            <div className="hstack justify-center py-4 text-muted-2"><Loader2 size={16} className="animate-spin" /></div>
          )}

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

          <p className="mx-auto mt-4 max-w-[380px] px-1 pb-10 text-center text-[11px] text-muted-2">
            Protótipo — no fundo (↓) a ramificação continua até o fim, com todo mundo.
          </p>
        </div>
      )}
    </>
  )
}

export default OrganogramaAneis

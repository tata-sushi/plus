import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowDown, Loader2, X, ChevronRight } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste).
//   centro: logo Tatá + Sócios · anel: Unidades (GIRA) · gerência: fotos (GIRA).
//   Ramificação: os líderes da unidade sob o gerente descem dele (nível 1), os
//   líderes deles no nível 2 — e, quando o gerente está alinhado no FUNDO, a
//   linha de líderes segue até o último que tem liderados e o resto do TIME
//   aparece embaixo, num grid de fotos. Paleta: carbon + citric + p&b.

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
const U_IN = 60 // folga entre o círculo dos sócios e o anel das unidades
const U_OUT = 88
const U_LAB = 74
const R_GER = 109
const AV_GER = 30
const R_COORD = 138 // anel externo pontilhado: quem responde direto aos sócios (ex.: Eduardo)
const AV_COORD = 24
const TAU = 2 * Math.PI
const BOTTOM = Math.PI / 2

// raio por nível a partir de uma órbita base (nível 1 = base+42, +34 por nível)
const rNivel = (d, base = R_GER) => base + 42 + (d - 1) * 34
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
  const [rotC, setRotC] = useState(0) // coordenadores (anel externo)
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

  const { socios, gerentes, lideres, coord } = useMemo(() => {
    const g = gente || []
    const porFaixa = (f) =>
      g.filter((p) => p.faixa === f).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome, 'pt'))
    return { socios: porFaixa(1), gerentes: porFaixa(2), lideres: porFaixa(3), coord: porFaixa(4) }
  }, [gente])

  const N_S = Math.max(1, socios.length)
  const N_U = UNIDADES.length
  const N_G = Math.max(1, gerentes.length)
  const k = w ? w / VB : 0
  const socioSlices = useMemo(() => fatiasSocios(socios), [socios])

  // 1) posição/unidade/alcance de cada orbitador (gerência + coordenadores)
  const N_C = Math.max(1, coord.length)
  const gerAngs = gerentes.map((g, i) => {
    const gAng = -Math.PI / 2 + (i / N_G) * TAU + rot
    const uIdx = setorDe(gAng, N_U, rotU)
    const unidade = UNIDADES[uIdx].u
    const acende = (g.unidades_alcance || []).includes(unidade)
    return { g, gAng, uIdx, unidade, acende, orbitR: R_GER, reg: 'ger' }
  })
  // coordenadores (Eduardo): anel externo pontilhado, gira independente (rotC)
  const coordAngs = coord.map((g, i) => {
    const gAng = -Math.PI / 2 + (i / N_C) * TAU + rotC
    const uIdx = setorDe(gAng, N_U, rotU)
    const unidade = UNIDADES[uIdx].u
    const acende = (g.unidades_alcance || []).includes(unidade)
    return { g, gAng, uIdx, unidade, acende, orbitR: R_COORD, reg: 'coord' }
  })
  const orbitadores = [...gerAngs, ...coordAngs]

  // 2) alinhamento no fundo (unidade + gerente com alcance) → time ativo
  let bUniIdx = -1
  let bUniD = 0.42
  UNIDADES.forEach((u, i) => {
    const c = -Math.PI / 2 + ((i + 0.5) / N_U) * TAU + rotU
    const d = difBottom(c)
    if (d < bUniD) { bUniD = d; bUniIdx = i }
  })
  const bUnidade = bUniIdx >= 0 ? UNIDADES[bUniIdx].u : null
  // TODOS os orbitadores alinhados no fundo que alcançam a unidade do fundo
  // (pode ser mais de um: ex. Cíntia e Wellington apontando pra baixo juntos).
  const alinhados = bUnidade
    ? orbitadores.filter(
        (ga) => difBottom(ga.gAng) < 0.42 && (ga.g.unidades_alcance || []).includes(bUnidade),
      )
    : []
  const alignedIds = new Set(alinhados.map((a) => a.g.id_pessoa))
  const temTime = alinhados.length > 0
  const timeKey = temTime
    ? `${bUnidade}|${alinhados.map((a) => a.g.id_pessoa).sort().join(',')}`
    : null

  useEffect(() => {
    if (!timeKey) { setTime(null); return }
    let ativo = true
    Promise.all(
      alinhados.map((a) =>
        supabase
          .rpc('organograma_time', { p_id: a.g.id_pessoa, p_unidade: bUnidade })
          .then(({ data }) => ({ gid: a.g.id_pessoa, ger: a.g, rows: Array.isArray(data) ? data : [] })),
      ),
    ).then((teams) => { if (ativo) setTime({ key: timeKey, unidade: bUnidade, teams }) })
    return () => { ativo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeKey])

  // 3) ramificação de cada gerente: só LÍDERES (quem tem liderado ativo). Fora
  //    do fundo mostra 2 níveis; alinhado no fundo segue até o último líder —
  //    a mesma árvore, só mais funda, então o desenho de cima não muda.
  const reveals = orbitadores.map((ga) => {
    const aligned = alignedIds.has(ga.g.id_pessoa)
    const diretos = lideres.filter((l) => l.id_superior === ga.g.id_pessoa && l.unidade === ga.unidade)
    const kidsOf = (r) => lideres.filter((c) => c.id_superior === r.id_pessoa)
    const maxDepth = aligned ? 99 : 2
    // Árvore ARRUMADA: cada subárvore reserva sua largura (sem irmãos se
    // atropelando); filhos em fileiras de até PER_FILA centradas sob o pai; a
    // fileira seguinte só começa abaixo das famílias da de cima. Mapeada no
    // referencial do gerente: nível = pra fora (no fundo, pra baixo), largura = tangente.
    const PER_FILA = 5
    // largura (em VB) que uma foto ocupa no seu nível: diâmetro + folga
    const larguraFoto = (d) => avNivel(Math.max(1, d)) + 10
    const mk = (p, d) => ({ p, d, kids: d < maxDepth ? kidsOf(p).map((c) => mk(c, d + 1)) : [] })
    const root = { p: null, d: 0, kids: diretos.map((c) => mk(c, 1)) }
    const medir = (n) => {
      if (!n.kids.length) { n._w = larguraFoto(n.d); n._h = 1; return }
      n.kids.forEach(medir)
      let w = 0
      let h = 0
      for (let r = 0; r < n.kids.length; r += PER_FILA) {
        const fila = n.kids.slice(r, r + PER_FILA)
        w = Math.max(w, fila.reduce((s, c) => s + c._w, 0))
        h += Math.max(...fila.map((c) => c._h))
      }
      n._w = Math.max(larguraFoto(n.d), w)
      n._h = 1 + h
    }
    medir(root)
    const nodes = []
    const links = []
    const cosA = Math.cos(ga.gAng)
    const sinA = Math.sin(ga.gAng)
    const rootLx = root._w / 2
    const map = (lx, ly) => {
      const dl = lx - rootLx
      const rad = ly === 0 ? ga.orbitR : rNivel(ly, ga.orbitR)
      return [CX + rad * cosA - dl * sinA, CY + rad * sinA + dl * cosA]
    }
    const place = (n, lx0, ly, parentPos) => {
      const lx = lx0 + n._w / 2
      const pos = map(lx, ly)
      if (n.p) {
        nodes.push({ p: n.p, x: pos[0], y: pos[1], depth: n.d })
        links.push({ x1: parentPos[0], y1: parentPos[1], x2: pos[0], y2: pos[1] })
      }
      let filaLy = ly + 1
      for (let r = 0; r < n.kids.length; r += PER_FILA) {
        const fila = n.kids.slice(r, r + PER_FILA)
        const fw = fila.reduce((s, c) => s + c._w, 0)
        let cx = lx0 + (n._w - fw) / 2
        fila.forEach((c) => { place(c, cx, filaLy, pos); cx += c._w })
        filaLy += Math.max(...fila.map((c) => c._h))
      }
    }
    place(root, 0, 0, null)
    return { ...ga, nodes, links, aligned }
  })

  const unidadesCasadas = new Set(reveals.filter((r) => r.acende).map((r) => r.uIdx))

  // 4) EQUIPE DA UNIDADE (fundo): junta o time de TODOS os alinhados, só quem
  //    NÃO é líder (líderes já estão no anel), na ordem da ramificação de cada
  //    um; dedupe por matrícula. É a equipe daquela unidade, não "time de fulano".
  let timePessoas = null
  if (time && time.key === timeKey) {
    const liderIds = new Set(lideres.map((l) => l.id_pessoa))
    const seen = new Set()
    const out = []
    time.teams.forEach((t) => {
      const byId = {}
      lideres.forEach((l) => (byId[l.id_pessoa] = l))
      t.rows.forEach((r) => (byId[r.id_pessoa] = r))
      const rv = reveals.find((r) => r.g.id_pessoa === t.gid)
      const ordem = [t.ger, ...(rv ? rv.nodes.map((n) => n.p) : [])]
      const idxDe = new Map(ordem.map((p, i) => [p.id_pessoa, i]))
      const grupos = ordem.map(() => [])
      const resto = []
      t.rows.forEach((r) => {
        if (liderIds.has(r.id_pessoa)) return
        let sup = r.id_superior
        let hops = 0
        while (sup && !idxDe.has(sup) && hops < 20) { sup = byId[sup]?.id_superior; hops++ }
        if (sup && idxDe.has(sup)) grupos[idxDe.get(sup)].push(r)
        else resto.push(r)
      })
      grupos.forEach((g) => g.sort((a, b) => a.nome.localeCompare(b.nome, 'pt')))
      resto.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
      ;[...grupos.flat(), ...resto].forEach((r) => {
        if (!seen.has(r.matricula)) { seen.add(r.matricula); out.push(r) }
      })
    })
    timePessoas = out
  }

  // altura do container: cresce pra baixo conforme a ramificação mais funda
  let contH
  // headroom FIXO no topo (depende só de k, não recalcula ao girar → sem
  // redimensionar/travar durante a navegação): desce os anéis o bastante pra
  // caber a ramificação que sobe.
  const topPad = k ? 70 * k : 0
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
    if (rr <= R_GER + 14) return 'ger'
    if (rr <= R_COORD + 14) return 'coord'
    return 'fora'
  }
  function onDown(e) {
    const { r, a } = ponto(e)
    drag.current = { reg: regiao(r), last: a, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onMove(e) {
    const d0 = drag.current
    if (!d0 || (d0.reg !== 'uni' && d0.reg !== 'ger' && d0.reg !== 'coord')) return
    const { a } = ponto(e)
    let d = a - d0.last
    if (d > Math.PI) d -= TAU
    if (d < -Math.PI) d += TAU
    if (Math.abs(d) > 0.01) d0.moved = true
    d0.last = a
    if (d0.reg === 'uni') setRotU((v) => v + d)
    else if (d0.reg === 'coord') setRotC((v) => v + d)
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
  function orbDown(e, reg) {
    drag.current = { reg, last: ponto(e).a, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function orbUp(e, p) {
    const d0 = drag.current
    drag.current = null
    if (!d0 || d0.moved) return
    tapHaptic()
    setSel(p)
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
        <div className="overflow-x-hidden px-4" style={{ paddingTop: 4 + topPad }}>
          <div className="relative mx-auto w-full select-none" style={{ maxWidth: 380, height: contH }}>
            <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="Organograma em anéis" style={{ touchAction: 'none' }}>
              <rect x="0" y="0" width={VB} height={VB} fill="transparent" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)} style={{ pointerEvents: 'all', touchAction: 'none', cursor: 'grab' }} />

              {/* órbita da gerência (guia) */}
              <circle cx={CX} cy={CY} r={R_GER} fill="none" style={{ stroke: CARBON, strokeWidth: 1.2, strokeDasharray: '2 5', opacity: 0.4, pointerEvents: 'none' }} />
              {/* órbita dos coordenadores que respondem aos sócios (guia) */}
              {coord.length > 0 && (
                <circle cx={CX} cy={CY} r={R_COORD} fill="none" style={{ stroke: CARBON, strokeWidth: 1.2, strokeDasharray: '2 5', opacity: 0.4, pointerEvents: 'none' }} />
              )}

              {/* anel — unidades (gira; nome na curva) */}
              {UNIDADES.map((u, i) => {
                const a0 = -Math.PI / 2 + (i / N_U) * TAU + rotU
                const a1 = -Math.PI / 2 + ((i + 1) / N_U) * TAU + rotU
                const on = unidadesCasadas.has(i)
                return (
                  <g key={`u-${u.u}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(U_IN, U_OUT, a0, a1)} style={{ fill: on ? CITRIC : CARBON, fillOpacity: on ? 0.3 : 0.12, stroke: on ? CITRIC : 'rgb(var(--bg))', strokeWidth: on ? 1.25 : 2 }} />
                    <path id={`uarc-${i}`} d={textArc(U_LAB, a0 + 0.04, a1 - 0.04)} fill="none" />
                    <text style={{ fill: 'rgb(var(--text))', fontSize: 9, fontWeight: 700 }}>
                      <textPath href={`#uarc-${i}`} startOffset="50%" textAnchor="middle">{u.curto}</textPath>
                    </text>
                  </g>
                )
              })}

              {/* centro — sócios (Tito maior no topo) */}
              {socioSlices.map(({ p, a0, a1 }, i) => {
                const on = sel?.matricula === p.matricula
                return (
                  <g key={`s-${p.matricula}`} style={{ pointerEvents: 'none' }}>
                    <path d={arc(S_IN, S_OUT, a0, a1)} style={{ fill: CITRIC, fillOpacity: on ? 0.42 : 0.16, stroke: on ? CITRIC : 'rgb(var(--bg))', strokeWidth: on ? 1.25 : 2 }} />
                    <path id={`sarc-${i}`} d={textArc(S_LAB, a0 + 0.06, a1 - 0.06)} fill="none" />
                    <text style={{ fill: 'rgb(var(--text))', fontSize: 8.5, fontWeight: 700 }}>
                      <textPath href={`#sarc-${i}`} startOffset="50%" textAnchor="middle">{AP_SOCIO[p.matricula] || primeiro(p.nome)}</textPath>
                    </text>
                  </g>
                )
              })}

              <circle cx={CX} cy={CY} r={R_CENTRO} style={{ fill: '#000', stroke: CITRIC, strokeWidth: 1.1, pointerEvents: 'none' }} />
            </svg>

            {/* Conectores das ramificações (sempre; pode passar da roda) */}
            {k > 0 && (
              <svg className="pointer-events-none absolute left-0 top-0" width={w} height={contH || w} style={{ overflow: 'visible' }}>
                {reveals.map((rv) =>
                  rv.links.map((l, i) => (
                    <line key={`${rv.g.matricula}-${i}`} x1={l.x1 * k} y1={l.y1 * k} x2={l.x2 * k} y2={l.y2 * k} style={{ stroke: CARBON, strokeWidth: 1.6, opacity: 0.55, strokeLinecap: 'round' }} />
                  )),
                )}
              </svg>
            )}

            {/* Camada DOM: logo + fotos */}
            {k > 0 && (
              <div className="pointer-events-none absolute inset-0">
                <button onClick={() => setSel(null)} aria-label="Tatá" className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center" style={{ left: CX * k, top: CY * k, width: 2 * R_CENTRO * k, height: 2 * R_CENTRO * k }}>
                  <img src="/icons/logo-mark.png" alt="Tatá" style={{ width: 24 * k, height: 'auto' }} />
                </button>

                {/* ramificações (líderes — ou time inteiro no fundo) */}
                {reveals.map((rv) =>
                  rv.nodes.map((n) => {
                    const size = Math.max(12, Math.round(avNivel(n.depth) * k))
                    return (
                      <button
                        key={`ph-${rv.g.matricula}-${n.p.matricula}`}
                        onPointerDown={(e) => orbDown(e, rv.reg)}
                        onPointerMove={onMove}
                        onPointerUp={(e) => orbUp(e, n.p)}
                        onPointerCancel={() => (drag.current = null)}
                        aria-label={n.p.nome}
                        className="pointer-events-auto absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing"
                        style={{ left: n.x * k, top: n.y * k, touchAction: 'none' }}
                      >
                        <span className="block rounded-full" style={{ boxShadow: `0 0 0 1.1px ${CARBON}, 0 1px 4px rgba(0,0,0,.28)` }}>
                          <Avatar name={n.p.nome} src={n.p.avatar_url} size={size} />
                        </span>
                      </button>
                    )
                  }),
                )}

                {/* gerência + coordenadores (fotos giratórias) */}
                {orbitadores.map((ga) => {
                  const [x, y] = polar(ga.orbitR, ga.gAng)
                  const av = ga.reg === 'coord' ? AV_COORD : AV_GER
                  const size = Math.max(22, Math.round(av * k))
                  return (
                    <button
                      key={`orb-${ga.g.matricula}`}
                      onPointerDown={(e) => orbDown(e, ga.reg)}
                      onPointerMove={onMove}
                      onPointerUp={(e) => orbUp(e, ga.g)}
                      onPointerCancel={() => (drag.current = null)}
                      aria-label={ga.g.nome}
                      className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing"
                      style={{ left: x * k, top: y * k, touchAction: 'none' }}
                    >
                      <span className="block rounded-full" style={{ boxShadow: `0 0 0 1.4px ${CITRIC}, 0 1px 4px rgba(0,0,0,.28)` }}>
                        <Avatar name={ga.g.nome} src={ga.g.avatar_url} size={size} />
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

          {/* Equipe da unidade (alinhamento no fundo): junta os times dos alinhados */}
          {temTime && (
            <div className="mx-auto mt-4 max-w-[380px]">
              <div className="hstack gap-2 px-1 pb-2 text-xs">
                <ArrowDown size={14} className="text-accent" />
                <span className="shrink-0 font-bold text-text">Equipe {bUnidade}</span>
                <span className="truncate text-muted">· {alinhados.map((a) => primeiro(a.g.nome)).join(', ')}</span>
                {timePessoas && <span className="ml-auto shrink-0 text-muted-2">{timePessoas.length}</span>}
              </div>
              {!timePessoas ? (
                <div className="hstack justify-center py-4 text-muted-2"><Loader2 size={16} className="animate-spin" /></div>
              ) : timePessoas.length === 0 ? (
                <p className="px-1 text-[11px] text-muted">Sem colaboradores nessa unidade.</p>
              ) : (
                <div className="grid grid-cols-5 gap-x-1 gap-y-3 px-1">
                  {timePessoas.map((r) => (
                    <button key={r.matricula} onClick={() => { tapHaptic(); navigate(`/perfil/${r.matricula}`) }} className="flex flex-col items-center gap-1 tap" title={`${r.nome} — ${r.cargo || ''}`}>
                      <Avatar name={r.nome} src={r.avatar_url} size={46} />
                      <span className="w-full truncate text-center text-[9px] leading-tight text-muted">{primeiro(r.nome)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pb-10" />
        </div>
      )}
    </>
  )
}

export default OrganogramaAneis

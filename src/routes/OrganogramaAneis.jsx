import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, X, ChevronRight } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste).
//   centro: logo Tatá + Sócios · anel: Unidades (nome na curva) · ramificações: líderes.
// "Líder" = tem colaborador ativo abaixo (id_superior). Paleta: carbon + citric + p&b.
// Citric marca sócios/gerência; carbon os demais líderes. RPC organograma_lideres().

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
const S_OUT = 56
const S_LAB = 41
const U_IN = 56
const U_OUT = 88
const U_LAB = 72
const R_BY_D = { 1: 122, 2: 150, 3: 174 }
const AV_BY_D = { 1: 20, 2: 17, 3: 15 }
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
// caminho de texto na curva do anel, sempre "em pé" (inverte na metade de baixo)
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
function rD(d) {
  return R_BY_D[Math.min(d, 3)]
}
function avD(d) {
  return AV_BY_D[Math.min(d, 3)]
}
function leafCount(n) {
  return n.kids.length ? n.kids.reduce((s, k) => s + leafCount(k), 0) : 1
}
function buildForest(people) {
  const byId = {}
  people.forEach((p) => {
    if (p.id_pessoa) byId[p.id_pessoa] = { p, kids: [] }
  })
  const roots = []
  people.forEach((p) => {
    const no = byId[p.id_pessoa]
    if (!no) return
    const pai = p.id_superior ? byId[p.id_superior] : null
    if (pai) pai.kids.push(no)
    else roots.push(no)
  })
  return roots
}
function layoutNode(node, a0, a1, depth, parent, u, photos, links) {
  const ang = (a0 + a1) / 2
  const rad = rD(depth)
  photos.push({ p: node.p, ang, rad, depth, u })
  if (parent) {
    const [x1, y1] = polar(parent.rad, parent.ang)
    const [x2, y2] = polar(rad - avD(depth) / 2, ang)
    links.push({ x1, y1, x2, y2, u })
  }
  const me = { ang, rad }
  if (node.kids.length) {
    const total = node.kids.reduce((s, k) => s + leafCount(k), 0)
    let a = a0
    node.kids.forEach((k) => {
      const w = (leafCount(k) / total) * (a1 - a0)
      layoutNode(k, a, a + w, depth + 1, me, u, photos, links)
      a += w
    })
  }
}

export function OrganogramaAneis() {
  const navigate = useNavigate()
  const [gente, setGente] = useState(null)
  const [sel, setSel] = useState(null)
  const [foco, setFoco] = useState(null)
  const [w, setW] = useState(0)
  const svgRef = useRef(null)

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

  const socios = useMemo(
    () =>
      (gente || [])
        .filter((p) => p.faixa === 1)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome, 'pt')),
    [gente],
  )
  const N_S = Math.max(1, socios.length)
  const N_U = UNIDADES.length
  const k = w ? w / VB : 0

  const { photos, links } = useMemo(() => {
    const pool = (gente || []).filter((p) => p.faixa === 2 || p.faixa === 3)
    const photos = []
    const links = []
    UNIDADES.forEach((un, ui) => {
      const people = pool.filter((p) => p.unidade === un.u)
      if (!people.length) return
      const roots = buildForest(people)
      const ua0 = -Math.PI / 2 + (ui / N_U) * TAU + 0.06
      const ua1 = -Math.PI / 2 + ((ui + 1) / N_U) * TAU - 0.06
      const total = roots.reduce((s, r) => s + leafCount(r), 0) || 1
      let a = ua0
      roots.forEach((root) => {
        const wdt = (leafCount(root) / total) * (ua1 - ua0)
        layoutNode(root, a, a + wdt, 1, null, un.u, photos, links)
        const rootAng = a + wdt / 2
        const [sx, sy] = polar(U_OUT, rootAng)
        const [ex, ey] = polar(rD(1) - avD(1) / 2, rootAng)
        links.push({ x1: sx, y1: sy, x2: ex, y2: ey, u: un.u })
        a += wdt
      })
    })
    return { photos, links }
  }, [gente, N_U])

  const escuro = (u) => foco && u !== foco

  function tocarUnidade(i) {
    tapHaptic()
    const u = UNIDADES[i].u
    setFoco((f) => (f === u ? null : u))
  }

  return (
    <>
      <Header title="Organograma" />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="mt-3 rounded-card border border-line bg-surface px-3 py-2 text-[11px] text-muted">
          Sócios no centro, unidades no anel e os líderes ramificando. Toque numa unidade pra destacar; numa pessoa pra ver o perfil.
        </div>
      </div>

      {gente === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="px-4 pt-3">
          <div className="relative mx-auto w-full select-none" style={{ maxWidth: 380 }}>
            <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="Organograma em anéis">
              {/* conectores (ramos) */}
              {links.map((l, i) => (
                <line key={`ln-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} style={{ stroke: foco === l.u ? CITRIC : CARBON, strokeWidth: 1.6, opacity: escuro(l.u) ? 0.1 : 0.5, strokeLinecap: 'round' }} />
              ))}

              {/* anel — unidades (nome na curva) */}
              {UNIDADES.map((u, i) => {
                const a0 = -Math.PI / 2 + (i / N_U) * TAU
                const a1 = -Math.PI / 2 + ((i + 1) / N_U) * TAU
                const on = foco === u.u
                return (
                  <g key={`u-${u.u}`} onClick={() => tocarUnidade(i)} style={{ cursor: 'pointer' }}>
                    <path
                      d={arc(U_IN, U_OUT, a0, a1)}
                      style={{ fill: on ? CITRIC : CARBON, fillOpacity: on ? 0.32 : escuro(u.u) ? 0.05 : 0.12, stroke: on ? CITRIC : 'rgb(var(--bg))', strokeWidth: on ? 2.5 : 2 }}
                    />
                    <path id={`uarc-${i}`} d={textArc(U_LAB, a0 + 0.04, a1 - 0.04)} fill="none" />
                    <text style={{ fill: 'rgb(var(--text))', fontSize: 9, fontWeight: 700, pointerEvents: 'none', opacity: escuro(u.u) ? 0.3 : 1 }}>
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

              {/* núcleo (fundo do logo) */}
              <circle cx={CX} cy={CY} r={R_CENTRO} onClick={() => { setSel(null); setFoco(null) }} style={{ fill: 'rgb(var(--surface))', stroke: CITRIC, strokeWidth: 2, cursor: 'pointer' }} />
            </svg>

            {/* Camada DOM: logo no centro + fotos dos líderes */}
            {k > 0 && (
              <div className="pointer-events-none absolute inset-0">
                {/* logo Tatá */}
                <button
                  onClick={() => { setSel(null); setFoco(null) }}
                  aria-label="Tatá"
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center"
                  style={{ left: CX * k, top: CY * k, width: 2 * R_CENTRO * k, height: 2 * R_CENTRO * k }}
                >
                  <img src="/icons/logo-mark.png" alt="Tatá" className="logo-dark" style={{ width: 38 * k, height: 'auto' }} />
                  <img src="/icons/logo-mark-light.png" alt="Tatá" className="logo-light" style={{ width: 38 * k, height: 'auto' }} />
                </button>

                {/* fotos dos líderes */}
                {photos.map((node) => {
                  const [x, y] = polar(node.rad, node.ang)
                  const size = Math.max(18, Math.round(avD(node.depth) * k))
                  const ring = node.p.faixa === 2 ? CITRIC : CARBON
                  const dim = escuro(node.u)
                  return (
                    <button
                      key={`ph-${node.p.matricula}`}
                      onClick={() => { tapHaptic(); setSel(node.p) }}
                      aria-label={node.p.nome}
                      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full tap transition-opacity"
                      style={{ left: x * k, top: y * k, opacity: dim ? 0.22 : 1 }}
                    >
                      <span className="block rounded-full" style={{ boxShadow: `0 0 0 2px ${ring}, 0 2px 5px rgba(0,0,0,.3)` }}>
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
            <span className="hstack gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CARBON }} />Líderes por unidade</span>
          </div>

          <p className="mx-auto mt-4 max-w-[380px] px-1 pb-10 text-center text-[11px] text-muted-2">
            Protótipo — árvore por unidade. Toque numa unidade pra isolar o ramo dela.
          </p>
        </div>
      )}
    </>
  )
}

export default OrganogramaAneis

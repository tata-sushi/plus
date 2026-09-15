import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, ChevronRight, FlaskConical } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS (nativo, versão de teste) — só lideranças.
//   centro: Tatá  ·  anel de unidades (ramificações)  ·  líderes com foto em volta.
// Toque numa unidade pra destacar/listar os líderes; toque numa pessoa pra abrir o perfil.
// Dados reais via RPC tata_plus.organograma_lideres() (profiles.lider = true, ativos).

const ORDEM = ['Itaim', 'Pinheiros', 'Poke - Pinheiros', 'Administrativo']
const CORES = {
  Itaim: '#3b82f6',
  Pinheiros: '#14b8a6',
  'Poke - Pinheiros': '#f0a92b',
  Administrativo: '#a855f7',
}
const PALETA = ['#3b82f6', '#14b8a6', '#f0a92b', '#a855f7', '#e2683c', '#ec4899', '#0ea5e9']

const VB = 340
const CX = 170
const CY = 170
const HUB = 34
const R1_IN = 41
const R1_OUT = 78
const R_LEAD = 121
const AV = 40 // diâmetro base do avatar (escala com a largura da caixa)

function polar(r, a) {
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}
function sector(rIn, rOut, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p0 = polar(rOut, a0)
  const p1 = polar(rOut, a1)
  const p2 = polar(rIn, a1)
  const p3 = polar(rIn, a0)
  return `M${p0[0]} ${p0[1]}A${rOut} ${rOut} 0 ${large} 1 ${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}A${rIn} ${rIn} 0 ${large} 0 ${p3[0]} ${p3[1]}Z`
}

export function OrganogramaAneis() {
  const navigate = useNavigate()
  const [lideres, setLideres] = useState(null) // null = carregando
  const [sel, setSel] = useState(null) // unidade destacada
  const [w, setW] = useState(0)
  const boxRef = useRef(null)

  useEffect(() => {
    let ativo = true
    supabase.rpc('organograma_lideres').then(({ data }) => {
      if (ativo) setLideres(Array.isArray(data) ? data : [])
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
  }, [lideres])

  const layout = useMemo(() => {
    if (!lideres || lideres.length === 0) return null
    const grupos = {}
    lideres.forEach((p) => {
      const u = p.unidade || 'Sem unidade'
      ;(grupos[u] = grupos[u] || []).push(p)
    })
    const chaves = Object.keys(grupos).sort((a, b) => {
      const ia = ORDEM.indexOf(a)
      const ib = ORDEM.indexOf(b)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'pt')
    })
    const cor = (u, i) => CORES[u] || PALETA[i % PALETA.length]
    const N = lideres.length
    let a = -Math.PI / 2
    const unidades = []
    const nodes = []
    chaves.forEach((u, i) => {
      const arr = grupos[u]
      const a0 = a
      const a1 = a + (arr.length / N) * 2 * Math.PI
      const c = cor(u, i)
      unidades.push({ u, a0, a1, c, n: arr.length, mid: (a0 + a1) / 2 })
      arr.forEach((p, j) => {
        const pa = a0 + ((j + 0.5) * (a1 - a0)) / arr.length
        nodes.push({ p, u, c, xy: polar(R_LEAD, pa), from: polar(R1_OUT, pa) })
      })
      a = a1
    })
    return { unidades, nodes, grupos, chaves, cor }
  }, [lideres])

  const k = w ? w / VB : 0
  const size = Math.max(26, Math.round(AV * k))

  return (
    <>
      <Header title="Organograma" />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mt-3 hstack gap-2 rounded-card border border-line bg-surface px-3 py-2 text-[11px] text-muted">
          <FlaskConical size={14} className="shrink-0 text-accent" />
          <span>Versão de teste — só liderança. Toque numa unidade pra destacar; toque numa pessoa pra abrir o perfil.</span>
        </div>
      </div>

      {lideres === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : !layout ? (
        <p className="px-5 py-16 text-center text-sm text-muted">Nenhuma liderança encontrada.</p>
      ) : (
        <>
          {/* Roda de anéis */}
          <div className="px-4 pt-3">
            <div ref={boxRef} className="relative mx-auto w-full" style={{ maxWidth: 360 }}>
              <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="Organograma em anéis">
                {/* setores das unidades */}
                {layout.unidades.map((u) => (
                  <path
                    key={`s-${u.u}`}
                    d={sector(R1_IN, R1_OUT, u.a0, u.a1)}
                    onClick={() => {
                      tapHaptic()
                      setSel(sel === u.u ? null : u.u)
                    }}
                    style={{
                      fill: u.c,
                      fillOpacity: sel ? (sel === u.u ? 0.95 : 0.22) : 0.82,
                      stroke: 'rgb(var(--bg))',
                      strokeWidth: 2,
                      cursor: 'pointer',
                    }}
                  />
                ))}
                {/* rótulo das unidades grandes */}
                {layout.unidades.map((u) =>
                  u.a1 - u.a0 >= 0.9 ? (
                    <text
                      key={`t-${u.u}`}
                      x={polar(59.5, u.mid)[0]}
                      y={polar(59.5, u.mid)[1]}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fill: '#fff',
                        fontSize: 8.5,
                        fontWeight: 700,
                        pointerEvents: 'none',
                      }}
                    >
                      {u.u}
                    </text>
                  ) : null,
                )}
                {/* conectores unidade → líder */}
                {layout.nodes.map((nd, i) => (
                  <line
                    key={`c-${i}`}
                    x1={nd.from[0]}
                    y1={nd.from[1]}
                    x2={nd.xy[0]}
                    y2={nd.xy[1]}
                    style={{
                      stroke: 'rgb(var(--muted-2))',
                      strokeWidth: 1.3,
                      opacity: sel && nd.u !== sel ? 0.15 : 0.5,
                    }}
                  />
                ))}
                {/* hub Tatá */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={HUB}
                  onClick={() => {
                    tapHaptic()
                    setSel(null)
                  }}
                  style={{ fill: 'rgb(var(--accent))', stroke: 'rgb(var(--surface))', strokeWidth: 2.5, cursor: 'pointer' }}
                />
                <text
                  x={CX}
                  y={CY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fill: 'rgb(var(--bg))', fontSize: 12, fontWeight: 800, letterSpacing: 1, pointerEvents: 'none' }}
                >
                  TATÁ
                </text>
              </svg>

              {/* Avatares (fotos) sobre a roda */}
              {k > 0 && (
                <div className="pointer-events-none absolute inset-0">
                  {layout.nodes.map((nd) => {
                    const dim = sel && nd.u !== sel
                    return (
                      <button
                        key={nd.p.matricula}
                        onClick={() => {
                          tapHaptic()
                          navigate(`/perfil/${nd.p.matricula}`)
                        }}
                        aria-label={`${nd.p.nome} — ${nd.p.cargo || ''}`}
                        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full tap transition-opacity"
                        style={{ left: nd.xy[0] * k, top: nd.xy[1] * k, opacity: dim ? 0.28 : 1 }}
                      >
                        <span
                          className="block rounded-full"
                          style={{ boxShadow: `0 0 0 2.5px ${nd.c}, 0 2px 7px rgba(0,0,0,.28)` }}
                        >
                          <Avatar name={nd.p.nome} src={nd.p.avatar_url} size={size} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Filtro por unidade */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 px-5">
            {layout.unidades.map((u) => {
              const on = sel === u.u
              return (
                <button
                  key={`chip-${u.u}`}
                  onClick={() => {
                    tapHaptic()
                    setSel(on ? null : u.u)
                  }}
                  aria-pressed={on}
                  className="hstack gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tap"
                  style={{
                    borderColor: on ? u.c : 'rgb(var(--line))',
                    background: on ? `${u.c}22` : 'rgb(var(--surface))',
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: u.c }} />
                  {u.u}
                  <span className="text-muted">{u.n}</span>
                </button>
              )
            })}
          </div>

          {/* Painel: lista da unidade selecionada, ou resumo */}
          <div className="mt-4 px-5 pb-10">
            {sel ? (
              <div className="card overflow-hidden">
                {layout.grupos[sel].map((p, i) => (
                  <button
                    key={p.matricula}
                    onClick={() => {
                      tapHaptic()
                      navigate(`/perfil/${p.matricula}`)
                    }}
                    className={`hstack w-full gap-3 px-4 py-3 text-left tap ${i > 0 ? 'border-t border-line' : ''}`}
                  >
                    <Avatar name={p.nome} src={p.avatar_url} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.nome}</div>
                      <div className="truncate text-[11px] text-muted">
                        {p.cargo}
                        {p.cargo && p.departamento ? ' · ' : ''}
                        {p.departamento}
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-muted-2" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted">
                {lideres.length} {lideres.length === 1 ? 'líder' : 'líderes'} · {layout.unidades.length}{' '}
                {layout.unidades.length === 1 ? 'unidade' : 'unidades'}. Toque numa unidade pra ver quem lidera lá.
              </p>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default OrganogramaAneis

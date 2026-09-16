import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, ChevronRight, FlaskConical } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Organograma em ANÉIS por FAIXA de liderança (nativo, versão de teste).
//   centro → Sócios · anel → Gerência · anel externo → Líderes (cor por unidade).
// Fotos reais (auth_users). Toque numa pessoa abre o perfil; toque numa unidade
// destaca os líderes dela. Dados via RPC tata_plus.organograma_lideres() +
// tabela tata_plus.organograma_faixa (configurável).

const FAIXA = {
  1: { nome: 'Sócios', cor: '#eab308', r: 37, av: 42 },
  2: { nome: 'Gerência', cor: '#a855f7', r: 86, av: 40 },
  3: { nome: 'Líderes', cor: null, r: 135, av: 38 },
}
const UNI_COR = {
  Itaim: '#3b82f6',
  Pinheiros: '#14b8a6',
  'Poke - Pinheiros': '#f0a92b',
  Administrativo: '#64748b',
}
const UNI_ORDEM = ['Itaim', 'Pinheiros', 'Poke - Pinheiros', 'Administrativo']
const PALETA = ['#e2683c', '#ec4899', '#0ea5e9', '#22c55e']

const VB = 340
const CX = 170
const CY = 170

function polar(r, a) {
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

export function OrganogramaAneis() {
  const navigate = useNavigate()
  const [gente, setGente] = useState(null) // null = carregando
  const [sel, setSel] = useState(null) // unidade destacada
  const [w, setW] = useState(0)
  const boxRef = useRef(null)

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

  const dados = useMemo(() => {
    if (!gente || gente.length === 0) return null
    const corUni = (u) => {
      if (UNI_COR[u]) return UNI_COR[u]
      const outras = [...new Set(gente.map((p) => p.unidade))].filter((x) => !UNI_COR[x])
      const i = Math.max(0, outras.indexOf(u))
      return PALETA[i % PALETA.length]
    }
    const corDe = (p) => (p.faixa === 3 ? corUni(p.unidade) : FAIXA[p.faixa]?.cor || '#64748b')

    const porFaixa = {}
    gente.forEach((p) => {
      ;(porFaixa[p.faixa] = porFaixa[p.faixa] || []).push(p)
    })
    const faixas = Object.keys(porFaixa)
      .map(Number)
      .sort((a, b) => a - b)

    const nodes = []
    faixas.forEach((f) => {
      let arr = porFaixa[f]
      if (f === 3) {
        arr = [...arr].sort((a, b) => {
          const ia = UNI_ORDEM.indexOf(a.unidade)
          const ib = UNI_ORDEM.indexOf(b.unidade)
          return (
            (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) ||
            (a.unidade || '').localeCompare(b.unidade || '', 'pt') ||
            a.nome.localeCompare(b.nome, 'pt')
          )
        })
      }
      const meta = FAIXA[f] || { r: 37 + (f - 1) * 49, av: 38 }
      const N = arr.length
      arr.forEach((p, i) => {
        const ang = -Math.PI / 2 + (i / N) * 2 * Math.PI
        nodes.push({ p, faixa: f, cor: corDe(p), av: meta.av, xy: polar(meta.r, ang) })
      })
    })

    const unidadesF3 = []
    ;(porFaixa[3] || []).forEach((p) => {
      if (!unidadesF3.some((u) => u.u === p.unidade)) unidadesF3.push({ u: p.unidade, c: corUni(p.unidade) })
    })
    unidadesF3.sort((a, b) => {
      const ia = UNI_ORDEM.indexOf(a.u)
      const ib = UNI_ORDEM.indexOf(b.u)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })

    const porUnidade = {}
    ;(porFaixa[3] || []).forEach((p) => {
      ;(porUnidade[p.unidade] = porUnidade[p.unidade] || []).push(p)
    })

    return { faixas, nodes, unidadesF3, porUnidade, porFaixa }
  }, [gente])

  const k = w ? w / VB : 0

  return (
    <>
      <Header title="Organograma" />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mt-3 hstack gap-2 rounded-card border border-line bg-surface px-3 py-2 text-[11px] text-muted">
          <FlaskConical size={14} className="shrink-0 text-accent" />
          <span>Versão de teste — anéis por faixa de liderança. Toque numa pessoa pra abrir o perfil; numa unidade pra destacar.</span>
        </div>
      </div>

      {gente === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : !dados ? (
        <p className="px-5 py-16 text-center text-sm text-muted">Nenhuma liderança encontrada.</p>
      ) : (
        <>
          {/* Roda de anéis */}
          <div className="px-4 pt-3">
            <div ref={boxRef} className="relative mx-auto w-full" style={{ maxWidth: 360 }}>
              <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="Organograma em anéis por faixa">
                {/* anéis-guia */}
                {dados.faixas.map((f) => (
                  <circle
                    key={`r-${f}`}
                    cx={CX}
                    cy={CY}
                    r={(FAIXA[f] || { r: 37 + (f - 1) * 49 }).r}
                    fill="none"
                    style={{ stroke: 'rgb(var(--line))', strokeWidth: 1.4 }}
                  />
                ))}
                {/* núcleo */}
                <circle cx={CX} cy={CY} r={8} style={{ fill: 'rgb(var(--accent))', opacity: 0.9 }} />
              </svg>

              {/* Avatares (fotos) sobre a roda */}
              {k > 0 && (
                <div className="pointer-events-none absolute inset-0">
                  {dados.nodes.map((nd) => {
                    const dim = sel && nd.faixa === 3 && nd.p.unidade !== sel
                    const size = Math.max(24, Math.round(nd.av * k))
                    return (
                      <button
                        key={nd.p.matricula}
                        onClick={() => {
                          tapHaptic()
                          navigate(`/perfil/${nd.p.matricula}`)
                        }}
                        aria-label={`${nd.p.nome} — ${nd.p.cargo || ''}`}
                        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full tap transition-opacity"
                        style={{ left: nd.xy[0] * k, top: nd.xy[1] * k, opacity: dim ? 0.25 : 1 }}
                      >
                        <span
                          className="block rounded-full"
                          style={{ boxShadow: `0 0 0 2.5px ${nd.cor}, 0 2px 7px rgba(0,0,0,.28)` }}
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

          {/* Legenda das faixas (anéis do centro pra fora) */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 text-[11px] text-muted">
            <span className="text-muted-2">Do centro pra fora:</span>
            {dados.faixas.map((f, i) => (
              <span key={`lf-${f}`} className="hstack gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: FAIXA[f]?.cor || 'rgb(var(--muted-2))' }}
                />
                <span className="font-semibold text-text">{FAIXA[f]?.nome || `Faixa ${f}`}</span>
                {i < dados.faixas.length - 1 && <span className="text-muted-2">→</span>}
              </span>
            ))}
          </div>

          {/* Filtro por unidade (líderes) */}
          {dados.unidadesF3.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 px-5">
              {dados.unidadesF3.map((u) => {
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
                    style={{ borderColor: on ? u.c : 'rgb(var(--line))', background: on ? `${u.c}22` : 'rgb(var(--surface))' }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: u.c }} />
                    {u.u}
                    <span className="text-muted">{dados.porUnidade[u.u].length}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Painel */}
          <div className="mt-4 px-5 pb-10">
            {sel ? (
              <div className="card overflow-hidden">
                {dados.porUnidade[sel].map((p, i) => (
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
                {gente.length} pessoas · {dados.faixas.length}{' '}
                {dados.faixas.length === 1 ? 'faixa' : 'faixas'}. Toque numa unidade pra destacar os líderes dela.
              </p>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default OrganogramaAneis

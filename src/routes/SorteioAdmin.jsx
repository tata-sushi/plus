import { useEffect, useState } from 'react'
import { Trophy, Loader2, RefreshCw, X, Dice5, Lock } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'
import { Section } from '../components/Section.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { tapHaptic } from '../lib/haptics.js'
import { cn } from '../lib/cn'

// Painel de apuração do Sorteio TATÁ (em teste, só matrícula 7). Lê os prêmios
// (confra_sorteio_premios), permite amarrar cada um a uma categoria, sortear um
// elegível aleatório (confra_sortear) e desfazer. Ganhadores ficam gravados.

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}
function avisar(e) {
  // eslint-disable-next-line no-alert
  window.alert(e?.message || 'Não foi possível concluir a ação.')
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function Avatar({ url, nome, size = 40 }) {
  const ini = (nome || '?').trim().charAt(0).toUpperCase()
  if (url) return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent"
      style={{ width: size, height: size }}
    >
      {ini}
    </span>
  )
}

export function SorteioAdmin() {
  const { usuario } = useAuth()
  const mat7 = String(usuario?.matricula) === '7'
  const [premios, setPremios] = useState(null)
  const [cats, setCats] = useState([])
  const [sorteando, setSorteando] = useState(null)
  const [revelado, setRevelado] = useState(null)

  async function carregar() {
    try {
      const [p, c] = await Promise.all([call('confra_sorteio_premios'), call('confra_sorteio_categorias')])
      setPremios(Array.isArray(p) ? p : [])
      setCats(Array.isArray(c) ? c : [])
    } catch (e) {
      avisar(e)
      setPremios([])
    }
  }
  useEffect(() => {
    if (mat7) carregar()
  }, [mat7])

  async function mudarCategoria(premio, slug) {
    try {
      await call('confra_sorteio_premio_salvar', { p_premio: premio.id, p_categoria: slug || '' })
      await carregar()
    } catch (e) {
      avisar(e)
    }
  }
  async function sortear(premio) {
    if (!premio.categoria || sorteando) return
    tapHaptic()
    setSorteando(premio.id)
    setRevelado(null)
    try {
      await Promise.all([call('confra_sortear', { p_premio: premio.id }), sleep(1500)])
      await carregar()
      setRevelado(premio.id)
    } catch (e) {
      avisar(e)
    } finally {
      setSorteando(null)
    }
  }
  async function desfazer(premio) {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Desfazer o sorteio deste prêmio?')) return
    try {
      await call('confra_sorteio_reset', { p_premio: premio.id })
      await carregar()
    } catch (e) {
      avisar(e)
    }
  }

  if (!mat7) {
    return (
      <>
        <Header />
        <div className="grid min-h-[50vh] place-items-center px-5 text-center text-muted">
          <div>
            <Lock className="mx-auto mb-2" size={22} />
            <p className="text-sm">Em teste — acesso restrito.</p>
          </div>
        </div>
      </>
    )
  }

  const total = premios?.length || 0
  const sorteados = (premios || []).filter((p) => p.ganhador).length

  return (
    <>
      <Header />
      <CabecalhoPagina titulo="Sorteio TATÁ" descricao="Apuração dos prêmios — em teste (só você)" />

      <Section className="mt-2" title={`Prêmios · ${sorteados}/${total} sorteados`}>
        {premios == null ? (
          <div className="grid place-items-center py-10 text-muted">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {premios.map((p) => {
              const g = p.ganhador
              const girando = sorteando === p.id
              return (
                <div key={p.id} className={cn('card p-3 transition', revelado === p.id && 'ring-2 ring-accent')}>
                  <div className="hstack gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-card bg-white">
                      {p.foto && <img src={p.foto} alt="" className="h-full w-full object-contain" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-bold leading-tight">{p.nome}</div>
                      <div className="mt-1.5 hstack flex-wrap gap-2">
                        <select
                          value={p.categoria || ''}
                          onChange={(e) => mudarCategoria(p, e.target.value)}
                          className="rounded-pill border border-line bg-surface px-2.5 py-1 text-[12px] text-text"
                        >
                          <option value="">— categoria —</option>
                          {cats.map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                        {p.categoria && <span className="text-[11px] text-muted-2">{p.elegiveis} elegíveis</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-line pt-3">
                    {girando ? (
                      <div className="hstack justify-center gap-2 py-1 text-sm font-semibold text-accent">
                        <Loader2 size={16} className="animate-spin" /> Sorteando…
                      </div>
                    ) : g ? (
                      <div className="hstack gap-3">
                        <Avatar url={g.avatar_url} nome={g.nome} />
                        <div className="min-w-0 flex-1">
                          <div className="hstack gap-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                            <Trophy size={13} /> Ganhador
                          </div>
                          <div className="truncate text-sm font-bold">{g.nome}</div>
                        </div>
                        <button onClick={() => sortear(p)} className="shrink-0 rounded-pill bg-surface-2 p-2 tap" aria-label="Re-sortear">
                          <RefreshCw size={16} />
                        </button>
                        <button onClick={() => desfazer(p)} className="shrink-0 rounded-pill bg-surface-2 p-2 tap" aria-label="Desfazer">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => sortear(p)}
                        disabled={!p.categoria || p.elegiveis === 0}
                        className={cn('btn-primary w-full', (!p.categoria || p.elegiveis === 0) && 'opacity-50')}
                      >
                        <Dice5 size={16} /> Sortear
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </>
  )
}

export default SorteioAdmin

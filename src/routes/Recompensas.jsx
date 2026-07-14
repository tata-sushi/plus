import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Loader2, Check, Clock, X, Settings2 } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { useCountUp } from '../lib/useCountUp.js'

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR')

const ERROS = {
  saldo_insuficiente: 'Saldo insuficiente para este resgate.',
  esgotado: 'Essa recompensa esgotou.',
  indisponivel: 'Recompensa indisponível.',
  sem_acesso: 'Sessão expirada. Entre novamente.',
}

const STATUS = {
  solicitado: { label: 'Solicitado', Icon: Clock, cls: 'bg-warn/15 text-warn' },
  entregue: { label: 'Entregue', Icon: Check, cls: 'bg-accent-soft text-accent' },
  cancelado: { label: 'Cancelado', Icon: X, cls: 'bg-danger/15 text-danger' },
}

export function Recompensas() {
  const { usuario } = useAuth()
  const [saldo, setSaldo] = useState(null)
  const [itens, setItens] = useState([])
  const [resgates, setResgates] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(null) // item aberto na janelinha de detalhes
  const [confirmar, setConfirmar] = useState(false) // etapa de confirmação dentro da janelinha
  const [processando, setProcessando] = useState(false)
  const [aviso, setAviso] = useState(null) // {tipo:'ok'|'erro', texto}

  const saldoAnimado = useCountUp(saldo ?? 0)

  const carregar = useCallback(async () => {
    const [s, c, r] = await Promise.all([
      supabase.rpc('meu_saldo'),
      supabase.rpc('recompensas_disponiveis'),
      supabase.rpc('meus_resgates'),
    ])
    setSaldo(Number(s.data) || 0)
    setItens(c.data || [])
    setResgates(r.data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrir(item) {
    tapHaptic()
    setAviso(null)
    setConfirmar(false)
    setAberto(item)
  }

  function fechar() {
    setAberto(null)
    setConfirmar(false)
  }

  async function resgatar() {
    if (!aberto) return
    tapHaptic()
    setProcessando(true)
    const { data, error } = await supabase.rpc('resgatar', { p_recompensa: aberto.id })
    setProcessando(false)
    const titulo = aberto.titulo
    if (error || !data?.ok) {
      setAviso({ tipo: 'erro', texto: ERROS[data?.erro] || 'Não foi possível resgatar agora.' })
      fechar()
      return
    }
    setSaldo(Number(data.saldo) || 0)
    setAviso({ tipo: 'ok', texto: `Resgate de "${titulo}" solicitado! 🎉` })
    fechar()
    carregar()
  }

  return (
    <>
      <Header
        title="Recompensas"
        right={
          usuario?.podePublicar ? (
            <Link
              to="/recompensas/admin"
              className="hstack gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold text-muted tap"
            >
              <Settings2 size={15} /> Gerenciar
            </Link>
          ) : null
        }
      />

      {/* Saldo */}
      <div className="px-5">
        <div className="hero-card reveal p-4">
          <div className="hstack justify-between">
            <div>
              <div className="text-xs text-muted">Seu saldo</div>
              <div className="font-display text-2xl font-bold text-accent">
                {fmt(saldoAnimado)} pts
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <Gift size={22} />
            </div>
          </div>
        </div>
      </div>

      {aviso && (
        <div
          className={cn(
            'mx-5 mt-3 rounded-card border px-4 py-2.5 text-center text-xs font-semibold',
            aviso.tipo === 'ok'
              ? 'border-accent/30 bg-accent-soft text-accent'
              : 'border-danger/30 bg-danger/10 text-danger',
          )}
        >
          {aviso.texto}
        </div>
      )}

      {carregando ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <>
          <Section className="reveal reveal-1 mt-5" title="Catálogo">
            {itens.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                Nenhuma recompensa disponível por enquanto.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {itens.map((r) => {
                  const falta = Math.max(0, r.custo - (saldo ?? 0))
                  return (
                    <Card
                      key={r.id}
                      onClick={() => abrir(r)}
                      className="flex cursor-pointer flex-col !p-3 tap"
                    >
                      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-accent-soft text-5xl">
                        {r.imagem_url ? (
                          <img src={r.imagem_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span>{r.emoji || '🎁'}</span>
                        )}
                        {r.esgotado && (
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                            Esgotado
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm font-semibold leading-tight">{r.titulo}</div>
                      {r.descricao && (
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted">
                          {r.descricao}
                        </div>
                      )}
                      <div className="mt-1 hstack justify-between gap-1">
                        <span className="text-xs font-semibold text-accent">{fmt(r.custo)} pts</span>
                        {r.estoque != null && r.estoque > 0 && (
                          <span className="text-[10px] text-muted-2">
                            {fmt(r.estoque)} restante{r.estoque === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'mt-2 w-full rounded-full py-2 text-center text-xs font-semibold',
                          r.pode ? 'bg-accent text-black' : 'bg-surface-2 text-muted',
                        )}
                      >
                        {r.esgotado ? 'Esgotado' : r.pode ? 'Resgatar' : `Faltam ${fmt(falta)} pts`}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </Section>

          {resgates.length > 0 && (
            <Section className="mt-5" title="Meus resgates">
              <div className="card overflow-hidden">
                {resgates.map((rg, i) => {
                  const st = STATUS[rg.status] || STATUS.solicitado
                  const StIcon = st.Icon
                  return (
                    <div
                      key={rg.id}
                      className={cn('hstack gap-3 px-4 py-3', i > 0 && 'border-t border-line')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{rg.titulo}</div>
                        <div className="text-[11px] text-muted">
                          {new Date(rg.created_at).toLocaleDateString('pt-BR')} · {fmt(rg.custo)} pts
                        </div>
                      </div>
                      <span className={cn('pill text-[10px]', st.cls)}>
                        <StIcon size={11} /> {st.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Janelinha de detalhes + resgate */}
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={fechar}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-card border border-line bg-surface sm:rounded-card"
          >
            <div className="hstack justify-between border-b border-line px-5 py-3.5">
              <div className="min-w-0 font-display text-base font-bold leading-tight">
                {aberto.titulo}
              </div>
              <button onClick={fechar} className="shrink-0 text-muted tap" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-accent-soft text-7xl">
                {aberto.imagem_url ? (
                  <img src={aberto.imagem_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{aberto.emoji || '🎁'}</span>
                )}
              </div>

              <div className="mt-3 hstack justify-between">
                <span className="font-display text-lg font-bold text-accent">
                  {fmt(aberto.custo)} pts
                </span>
                <span className="text-xs font-medium text-muted">
                  {aberto.estoque == null
                    ? 'Disponível'
                    : aberto.estoque > 0
                      ? `${fmt(aberto.estoque)} em estoque`
                      : 'Esgotado'}
                </span>
              </div>

              {aberto.descricao && <p className="mt-2 text-sm text-muted">{aberto.descricao}</p>}

              {aberto.detalhes && (
                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Como usar
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text">
                    {aberto.detalhes}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-line px-5 py-3.5">
              {confirmar ? (
                <>
                  <p className="mb-3 text-center text-xs text-muted">
                    Seu saldo depois:{' '}
                    <span className="font-semibold text-text">
                      {fmt((saldo ?? 0) - aberto.custo)} pts
                    </span>
                    . Confirmar o resgate?
                  </p>
                  <div className="hstack gap-2">
                    <button
                      onClick={() => setConfirmar(false)}
                      disabled={processando}
                      className="btn-ghost flex-1 !py-3 text-sm text-muted"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={resgatar}
                      disabled={processando}
                      className={cn('btn-primary flex-1 !py-3 text-sm', processando && 'opacity-60')}
                    >
                      {processando ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => {
                    tapHaptic()
                    setConfirmar(true)
                  }}
                  disabled={!aberto.pode}
                  className={cn(
                    'w-full !py-3 text-sm',
                    aberto.pode ? 'btn-primary' : 'btn-ghost text-muted',
                  )}
                >
                  {aberto.esgotado
                    ? 'Esgotado'
                    : aberto.pode
                      ? `Resgatar por ${fmt(aberto.custo)} pts`
                      : `Faltam ${fmt(Math.max(0, aberto.custo - (saldo ?? 0)))} pts`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

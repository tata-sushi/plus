import { useCallback, useEffect, useState } from 'react'
import { Gift, Loader2, Check, Clock, X } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
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
  const [saldo, setSaldo] = useState(null)
  const [itens, setItens] = useState([])
  const [resgates, setResgates] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [confirmando, setConfirmando] = useState(null)
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

  async function resgatar() {
    if (!confirmando) return
    tapHaptic()
    setProcessando(true)
    const { data, error } = await supabase.rpc('resgatar', { p_recompensa: confirmando.id })
    setProcessando(false)
    if (error || !data?.ok) {
      setAviso({ tipo: 'erro', texto: ERROS[data?.erro] || 'Não foi possível resgatar agora.' })
      setConfirmando(null)
      return
    }
    setSaldo(Number(data.saldo) || 0)
    setAviso({ tipo: 'ok', texto: `Resgate de "${confirmando.titulo}" solicitado! 🎉` })
    setConfirmando(null)
    carregar()
  }

  return (
    <>
      <Header title="Recompensas" />

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
                    <Card key={r.id} className="flex flex-col !p-3">
                      <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-accent-soft text-5xl">
                        {r.imagem_url ? (
                          <img
                            src={r.imagem_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{r.emoji || '🎁'}</span>
                        )}
                      </div>
                      <div className="mt-2 text-sm font-semibold leading-tight">{r.titulo}</div>
                      {r.descricao && (
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted">
                          {r.descricao}
                        </div>
                      )}
                      <div className="mt-1 text-xs font-semibold text-accent">{fmt(r.custo)} pts</div>
                      <button
                        disabled={!r.pode}
                        onClick={() => {
                          tapHaptic()
                          setAviso(null)
                          setConfirmando(r)
                        }}
                        className={cn(
                          'mt-2 w-full !py-2 text-xs',
                          r.pode ? 'btn-primary' : 'btn-ghost text-muted',
                        )}
                      >
                        {r.esgotado ? 'Esgotado' : r.pode ? 'Resgatar' : `Faltam ${fmt(falta)} pts`}
                      </button>
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

      {/* Confirmação de resgate */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-5">
            <div className="hstack gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-3xl">
                {confirmando.emoji || '🎁'}
              </div>
              <div className="min-w-0">
                <div className="font-display text-base font-bold leading-tight">
                  {confirmando.titulo}
                </div>
                <div className="text-xs text-muted">
                  Custa <span className="font-semibold text-accent">{fmt(confirmando.custo)} pts</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Seu saldo depois: {fmt((saldo ?? 0) - confirmando.custo)} pts. Confirmar o resgate?
            </p>
            <div className="mt-4 hstack gap-2">
              <button
                onClick={() => setConfirmando(null)}
                disabled={processando}
                className="btn-ghost flex-1 !py-2.5 text-sm text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={resgatar}
                disabled={processando}
                className={cn('btn-primary flex-1 !py-2.5 text-sm', processando && 'opacity-60')}
              >
                {processando ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

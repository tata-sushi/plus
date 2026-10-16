import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Gift, Loader2, Check, Clock, X, Copy, Ticket } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { RecompensaFoto } from './RecompensaFoto.jsx'
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
  nao_elegivel: 'Essa recompensa não está disponível pro seu perfil.',
  ja_resgatado: 'Você já resgatou essa recompensa.',
}

const STATUS = {
  solicitado: { label: 'Solicitado', Icon: Clock, cls: 'bg-warn/15 text-warn' },
  entregue: { label: 'Entregue', Icon: Check, cls: 'bg-accent-soft text-accent' },
  cancelado: { label: 'Cancelado', Icon: X, cls: 'bg-danger/15 text-danger' },
}

// Caixinha que mostra o código do voucher com botão de copiar.
function CodigoVoucher({ codigo }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    tapHaptic()
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1600)
    } catch {
      /* clipboard pode falhar em contexto inseguro; o código segue visível */
    }
  }
  return (
    <button
      onClick={copiar}
      className="hstack w-full items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-left tap"
    >
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-accent/80">
          Seu código
        </div>
        <div className="truncate font-mono text-lg font-bold tracking-wide text-accent">
          {codigo}
        </div>
      </div>
      <span className="hstack shrink-0 gap-1 text-[11px] font-semibold text-accent">
        {copiado ? <Check size={14} /> : <Copy size={14} />}
        {copiado ? 'Copiado' : 'Copiar'}
      </span>
    </button>
  )
}

// Aba "Recompensas" do hub: catálogo trocado por pontos.
export function PainelRecompensas() {
  const [saldo, setSaldo] = useState(null)
  const [itens, setItens] = useState([])
  const [resgates, setResgates] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(null) // item aberto na janelinha de detalhes
  const [confirmar, setConfirmar] = useState(false) // etapa de confirmação dentro da janelinha
  const [processando, setProcessando] = useState(false)
  const [aviso, setAviso] = useState(null) // {tipo:'ok'|'erro', texto}
  const [entregue, setEntregue] = useState(null) // {titulo, codigo} — tela de código do voucher

  const saldoAnimado = useCountUp(saldo ?? 0)

  const carregar = useCallback(async () => {
    const [s, c, r] = await Promise.all([
      supabase.rpc('meu_saldo'),
      supabase.rpc('recompensas_disponiveis'),
      supabase.rpc('meus_resgates_v2'),
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
    fechar()
    // Voucher: entrega instantânea — mostra o código na hora.
    if (data.voucher && data.codigo) {
      setEntregue({ titulo, codigo: data.codigo })
    } else {
      setAviso({ tipo: 'ok', texto: `Resgate de "${titulo}" solicitado! 🎉` })
    }
    carregar()
  }

  return (
    <>
      {/* Saldo */}
      <div className="px-5 pt-3">
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
                        <RecompensaFoto
                          src={r.imagem_url}
                          emoji={r.emoji}
                          className="h-full w-full object-cover"
                        />
                        {r.esgotado && (
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                            Esgotado
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm font-semibold leading-tight">{r.titulo}</div>
                      <div className="mt-1 hstack justify-between gap-1">
                        <span className="text-xs font-semibold text-accent">
                          {r.custo > 0 ? `${fmt(r.custo)} pts` : 'Grátis'}
                        </span>
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
                        {r.esgotado
                          ? 'Esgotado'
                          : r.pode
                            ? 'Resgatar'
                            : r.requer_desafio
                              ? 'Conclua o desafio'
                              : `Faltam ${fmt(falta)} pts`}
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
                      className={cn('px-4 py-3', i > 0 && 'border-t border-line')}
                    >
                      <div className="hstack gap-3">
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
                      {rg.codigo && (
                        <div className="mt-2.5">
                          <CodigoVoucher codigo={rg.codigo} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Janelinha de detalhes + resgate */}
      {aberto &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={fechar}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-card border border-line bg-surface"
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
                <RecompensaFoto
                  src={aberto.imagem_url}
                  emoji={aberto.emoji}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mt-3 hstack justify-between">
                <span className="font-display text-lg font-bold text-accent">
                  {aberto.custo > 0 ? `${fmt(aberto.custo)} pts` : 'Grátis'}
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
                      ? aberto.custo > 0
                        ? `Resgatar por ${fmt(aberto.custo)} pts`
                        : 'Resgatar'
                      : aberto.requer_desafio
                        ? 'Conclua o desafio'
                        : `Faltam ${fmt(Math.max(0, aberto.custo - (saldo ?? 0)))} pts`}
                </button>
              )}
            </div>
          </div>
        </div>,
          document.body,
        )}

      {/* Tela de código entregue (voucher) */}
      {entregue &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setEntregue(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-card border border-line bg-surface p-5 text-center"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
                <Ticket size={26} />
              </div>
              <div className="mt-3 font-display text-lg font-bold leading-tight">
                Resgate concluído! 🎉
              </div>
              <p className="mt-1 text-sm text-muted">
                {entregue.titulo} — use o código abaixo. Ele também fica salvo em{' '}
                <span className="font-semibold text-text">Meus resgates</span>.
              </p>
              <div className="mt-4">
                <CodigoVoucher codigo={entregue.codigo} />
              </div>
              <button
                onClick={() => setEntregue(null)}
                className="btn-primary mt-4 w-full !py-3 text-sm"
              >
                Fechar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

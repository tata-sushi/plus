import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Check, Clock, X, Package } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { RecompensaFoto } from './RecompensaFoto.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { supabase } from '../lib/supabase.js'

const fmtBRL = (c) => (Number(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const ERROS = {
  sem_acesso: 'Sessão expirada. Entre novamente.',
  indisponivel: 'Produto indisponível.',
  esgotado: 'Produto esgotado.',
  tamanho_invalido: 'Escolha um tamanho.',
}

const STATUS = {
  solicitado: { label: 'Solicitado', Icon: Clock, cls: 'bg-warn/15 text-warn' },
  separado: { label: 'Separado', Icon: Package, cls: 'bg-accent-soft text-accent' },
  entregue: { label: 'Entregue', Icon: Check, cls: 'bg-accent-soft text-accent' },
  cancelado: { label: 'Cancelado', Icon: X, cls: 'bg-danger/15 text-danger' },
}

// Aba "Loja" do hub: produtos comprados com desconto em folha (em R$).
export function PainelLoja() {
  const [itens, setItens] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(null) // produto aberto na janelinha
  const [tamanhoSel, setTamanhoSel] = useState(null)
  const [confirmar, setConfirmar] = useState(false) // etapa de autorização
  const [processando, setProcessando] = useState(false)
  const [aviso, setAviso] = useState(null) // erro em banner no topo
  const [compra, setCompra] = useState(null) // popup de confirmação: {titulo, tamanho, preco_centavos}

  const carregar = useCallback(async () => {
    const [p, pe] = await Promise.all([
      supabase.rpc('loja_produtos_disponiveis'),
      supabase.rpc('meus_pedidos_loja'),
    ])
    setItens(p.data || [])
    setPedidos(pe.data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrir(item) {
    tapHaptic()
    setAviso(null)
    setConfirmar(false)
    setTamanhoSel(null)
    setAberto(item)
  }

  function fechar() {
    setAberto(null)
    setConfirmar(false)
    setTamanhoSel(null)
  }

  const temTamanho = aberto && Array.isArray(aberto.tamanhos) && aberto.tamanhos.length > 0
  const podeComprar = aberto && !aberto.esgotado && (!temTamanho || !!tamanhoSel)

  async function comprar() {
    if (!aberto) return
    tapHaptic()
    setProcessando(true)
    const info = { titulo: aberto.titulo, tamanho: tamanhoSel, preco_centavos: aberto.preco_centavos }
    const { data, error } = await supabase.rpc('loja_comprar', {
      p_produto: aberto.id,
      p_tamanho: tamanhoSel,
    })
    setProcessando(false)
    if (error || !data?.ok) {
      setAviso({ tipo: 'erro', texto: ERROS[data?.erro] || 'Não foi possível comprar agora.' })
      fechar()
      return
    }
    fechar()
    setCompra(info) // popup de confirmação
    carregar()
  }

  return (
    <>
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
          <Section className="reveal reveal-1 mt-4" title="Produtos">
            {itens.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                Nenhum produto disponível por enquanto.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {itens.map((p) => (
                  <Card
                    key={p.id}
                    onClick={() => abrir(p)}
                    className="flex cursor-pointer flex-col !p-3 tap"
                  >
                    <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-accent-soft text-5xl">
                      <RecompensaFoto
                        src={p.imagem_url}
                        emoji={p.emoji}
                        className="h-full w-full object-cover"
                      />
                      {p.esgotado && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                          Esgotado
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-tight">{p.titulo}</div>
                    <div className="mt-1 hstack justify-between gap-1">
                      <span className="text-xs font-semibold text-accent">{fmtBRL(p.preco_centavos)}</span>
                      {p.tamanhos?.length > 0 && (
                        <span className="truncate text-[10px] text-muted-2">{p.tamanhos.join(' · ')}</span>
                      )}
                    </div>
                    <div
                      className={cn(
                        'mt-2 w-full rounded-full py-2 text-center text-xs font-semibold',
                        p.esgotado ? 'bg-surface-2 text-muted' : 'bg-accent text-black',
                      )}
                    >
                      {p.esgotado ? 'Esgotado' : 'Comprar'}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {pedidos.length > 0 && (
            <Section className="mt-5" title="Meus pedidos">
              <div className="card overflow-hidden">
                {pedidos.map((pd, i) => {
                  const st = STATUS[pd.status] || STATUS.solicitado
                  const StIcon = st.Icon
                  return (
                    <div
                      key={pd.id}
                      className={cn('hstack gap-3 px-4 py-3', i > 0 && 'border-t border-line')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {pd.titulo}
                          {pd.tamanho ? ` · ${pd.tamanho}` : ''}
                        </div>
                        <div className="text-[11px] text-muted">
                          {new Date(pd.created_at).toLocaleDateString('pt-BR')} · {fmtBRL(pd.preco_centavos)}
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

      {/* Janelinha de detalhes + compra */}
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
              <div className="min-w-0 font-display text-base font-bold leading-tight">{aberto.titulo}</div>
              <button onClick={fechar} className="shrink-0 text-muted tap" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {aberto.imagens?.length > 1 ? (
                <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
                  {aberto.imagens.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="aspect-square w-[90%] shrink-0 snap-center rounded-2xl object-cover"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-accent-soft text-7xl">
                  <RecompensaFoto
                    src={aberto.imagem_url}
                    emoji={aberto.emoji}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="mt-3 hstack justify-between">
                <span className="font-display text-lg font-bold text-accent">
                  {fmtBRL(aberto.preco_centavos)}
                </span>
                <span className="text-xs font-medium text-muted">
                  {aberto.estoque == null
                    ? 'Disponível'
                    : aberto.estoque > 0
                      ? `${aberto.estoque} em estoque`
                      : 'Esgotado'}
                </span>
              </div>

              {aberto.descricao && <p className="mt-2 text-sm text-muted">{aberto.descricao}</p>}
              <p className="mt-2 text-xs text-muted-2">
                Pagamento via <b className="text-text">desconto em folha</b>.
              </p>

              {aberto.detalhes && (
                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Detalhes
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text">
                    {aberto.detalhes}
                  </p>
                </div>
              )}

              {temTamanho && (
                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Tamanho
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aberto.tamanhos.map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          tapHaptic()
                          setTamanhoSel(t)
                        }}
                        className={cn(
                          'min-w-[46px] rounded-lg border px-3.5 py-2 text-sm font-semibold tap',
                          tamanhoSel === t
                            ? 'border-accent bg-accent text-black'
                            : 'border-line bg-bg text-text',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-line px-5 py-3.5">
              {confirmar ? (
                <>
                  <p className="mb-3 text-center text-xs leading-relaxed text-muted">
                    Você autoriza o desconto de{' '}
                    <span className="font-semibold text-text">{fmtBRL(aberto.preco_centavos)}</span> na folha de
                    pagamento referente ao{' '}
                    <span className="font-semibold text-text">
                      {aberto.titulo}
                      {tamanhoSel ? ` · ${tamanhoSel}` : ''}
                    </span>
                    ?
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
                      onClick={comprar}
                      disabled={processando}
                      className={cn('btn-primary flex-1 !py-3 text-sm', processando && 'opacity-60')}
                    >
                      {processando ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        'Autorizar e comprar'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => {
                    tapHaptic()
                    setConfirmar(true)
                  }}
                  disabled={!podeComprar}
                  className={cn('w-full !py-3 text-sm', podeComprar ? 'btn-primary' : 'btn-ghost text-muted')}
                >
                  {aberto.esgotado
                    ? 'Esgotado'
                    : temTamanho && !tamanhoSel
                      ? 'Escolha um tamanho'
                      : `Comprar por ${fmtBRL(aberto.preco_centavos)}`}
                </button>
              )}
            </div>
          </div>
        </div>,
          document.body,
        )}

      {/* Popup de confirmação da compra */}
      {compra &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setCompra(null)}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-pop w-full max-w-[360px] rounded-card border border-line bg-surface px-6 pb-6 pt-7 text-center"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-black">
              <Check size={34} strokeWidth={3} />
            </div>
            <div className="mt-4 font-display text-xl font-bold">Compra realizada!</div>
            <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-muted">
              <b className="text-text">
                {compra.titulo}
                {compra.tamanho ? ` · ${compra.tamanho}` : ''}
              </b>
              <br />
              Você autorizou o desconto em folha do valor de{' '}
              <b className="text-text">{fmtBRL(compra.preco_centavos)}</b>.
            </p>
            <button
              onClick={() => setCompra(null)}
              className="btn-primary mt-5 w-full !py-3 text-sm font-bold"
            >
              Ok
            </button>
          </div>
        </div>,
          document.body,
        )}
    </>
  )
}

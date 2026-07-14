import { useCallback, useEffect, useState } from 'react'
import {
  Lock,
  CheckCircle2,
  ChevronDown,
  Play,
  Loader2,
  X,
  Star,
  Trophy,
  Clock,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { resolveIcon } from '../lib/icons.js'
import { supabase } from '../lib/supabase.js'

const TIPO_LABEL = { prova: 'Prova', envio: 'Envio' }

function Detalhe({ treino, onFechar, onConcluir, concluindo }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let ativo = true
    supabase.rpc('abrir_treinamento', { p_treino: treino.id }).then(({ data }) => {
      if (ativo) setData(data)
    })
    return () => {
      ativo = false
    }
  }, [treino.id])

  const podeConcluir = treino.tipo === 'conteudo' && !treino.concluido

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="safe-top hstack justify-between border-b border-white/5 px-5 py-3">
        <span className="font-display text-sm font-bold">Desafio</span>
        <button onClick={onFechar} className="text-muted tap" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h1 className="font-display text-xl font-bold leading-tight">{treino.titulo}</h1>
        <div className="mt-2 hstack gap-2 text-xs">
          {treino.pontos > 0 && (
            <span className="pill bg-accent-soft text-accent">
              <Star size={12} /> {treino.pontos} pts
            </span>
          )}
          {TIPO_LABEL[treino.tipo] && (
            <span className="pill bg-surface-2 text-muted">{TIPO_LABEL[treino.tipo]}</span>
          )}
        </div>

        {!data ? (
          <div className="hstack justify-center py-16 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : data.conteudo_html ? (
          <div
            className="conteudo mt-5 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: data.conteudo_html }}
          />
        ) : (
          <div className="mt-5 text-sm text-muted">
            {treino.descricao && <p className="mb-3">{treino.descricao}</p>}
            <p className="text-muted-2">Conteúdo completo em breve.</p>
          </div>
        )}
      </div>

      <div className="safe-bottom border-t border-white/5 px-5 py-3">
        {treino.concluido ? (
          <div className="hstack justify-center gap-2 rounded-card bg-accent-soft py-3 text-sm font-semibold text-accent">
            <CheckCircle2 size={18} /> Concluído
          </div>
        ) : podeConcluir ? (
          <button
            onClick={() => onConcluir(treino)}
            disabled={concluindo}
            className={cn('btn-primary w-full !py-3.5 text-sm', concluindo && 'opacity-60')}
          >
            {concluindo ? <Loader2 size={18} className="animate-spin" /> : 'Concluir desafio'}
          </button>
        ) : (
          <div className="hstack justify-center gap-2 rounded-card bg-surface py-3 text-sm font-semibold text-muted">
            <Clock size={16} /> Disponível em breve
          </div>
        )}
      </div>
    </div>
  )
}

export function Treinamentos() {
  const [trilhas, setTrilhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aberta, setAberta] = useState(null) // trilha_id expandida
  const [detalhe, setDetalhe] = useState(null) // treino aberto
  const [concluindo, setConcluindo] = useState(false)
  const [aviso, setAviso] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('treinamentos_do_usuario')
    if (error) {
      setCarregando(false)
      return
    }
    const map = new Map()
    for (const r of data || []) {
      if (!map.has(r.trilha_id)) {
        map.set(r.trilha_id, {
          id: r.trilha_id,
          nome: r.trilha_nome,
          icone: r.trilha_icone,
          itens: [],
        })
      }
      map.get(r.trilha_id).itens.push(r)
    }
    setTrilhas([...map.values()])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrir(item) {
    if (!item.liberado || item.concluido) {
      if (item.concluido) setDetalhe(item)
      return
    }
    tapHaptic()
    setAviso('')
    setDetalhe(item)
  }

  async function concluir(item) {
    setConcluindo(true)
    const { data } = await supabase.rpc('concluir_treinamento', { p_treino: item.id })
    setConcluindo(false)
    if (data?.ok) {
      setDetalhe(null)
      setAviso(data.pontos > 0 ? `Desafio concluído! +${data.pontos} pts 🎉` : 'Desafio concluído! 🎉')
      carregar()
    } else if (data?.erro === 'limite_diario') {
      setDetalhe(null)
      setAviso('Você já concluiu 3 desafios hoje. Volte amanhã! 👋')
    } else {
      setAviso('Não foi possível concluir agora.')
    }
  }

  return (
    <>
      <Header title="Treinamentos" />

      {aviso && (
        <div className="mx-5 mt-2 rounded-card border border-accent/30 bg-accent-soft px-4 py-2.5 text-center text-xs font-semibold text-accent">
          {aviso}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3 px-5">
        {carregando && (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!carregando && trilhas.length === 0 && (
          <div className="py-10 text-center text-sm text-muted">
            Nenhum treinamento disponível pra você por enquanto.
          </div>
        )}

        {trilhas.map((tr) => {
          const Icon = resolveIcon(tr.icone)
          const total = tr.itens.length
          const feitos = tr.itens.filter((i) => i.concluido).length
          const expandida = aberta === tr.id
          return (
            <Card key={tr.id} className="!p-0 overflow-hidden">
              <button
                onClick={() => setAberta(expandida ? null : tr.id)}
                className="hstack w-full gap-3 p-4 text-left tap"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{tr.nome}</div>
                  <div className="mt-0.5 hstack justify-between gap-2 text-xs text-muted">
                    <span>{feitos}/{total} concluídos</span>
                    <span className="font-semibold text-accent">
                      {total ? Math.round((feitos / total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={total ? feitos / total : 0} />
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={cn('shrink-0 text-muted transition-transform', expandida && 'rotate-180')}
                />
              </button>

              {expandida && (
                <div className="border-t border-white/5">
                  {tr.itens.map((item) => {
                    const bloqueado = !item.liberado && !item.concluido
                    return (
                      <button
                        key={item.id}
                        onClick={() => abrir(item)}
                        disabled={bloqueado}
                        className={cn(
                          'hstack w-full gap-3 border-t border-white/5 px-4 py-3 text-left first:border-t-0 tap',
                          bloqueado && 'opacity-45',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                            item.concluido
                              ? 'bg-accent-soft text-accent'
                              : bloqueado
                                ? 'bg-surface-2 text-muted-2'
                                : 'bg-accent text-black',
                          )}
                        >
                          {item.concluido ? (
                            <CheckCircle2 size={16} />
                          ) : bloqueado ? (
                            <Lock size={14} />
                          ) : (
                            <Play size={13} fill="currentColor" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{item.titulo}</span>
                          {TIPO_LABEL[item.tipo] && (
                            <span className="text-[11px] text-muted-2">{TIPO_LABEL[item.tipo]}</span>
                          )}
                        </span>
                        {item.pontos > 0 && (
                          <span className="hstack shrink-0 gap-1 text-[11px] font-semibold text-muted">
                            <Star size={11} /> {item.pontos}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {detalhe && (
        <Detalhe
          treino={detalhe}
          onFechar={() => setDetalhe(null)}
          onConcluir={concluir}
          concluindo={concluindo}
        />
      )}
    </>
  )
}

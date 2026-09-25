import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Loader2, Lock, Check, X, ExternalLink, Gift } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { RecompensaFoto } from './RecompensaFoto.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { supabase } from '../lib/supabase.js'

// "Jornada TATÁ": recompensas por tempo de casa, no mesmo layout do catálogo de
// Recompensas (grade de cards). Cada marco (ex.: 3 anos) aparece pra todos, mas
// só é resgatável ao atingir o tempo; ao escolher uma opção, o marco fecha.

function fmtTempo(meses) {
  const m = Math.max(0, Number(meses) || 0)
  const anos = Math.floor(m / 12)
  const mm = m % 12
  const pa = anos ? `${anos} ano${anos > 1 ? 's' : ''}` : ''
  const pm = mm ? `${mm} ${mm > 1 ? 'meses' : 'mês'}` : ''
  if (pa && pm) return `${pa} e ${pm}`
  return pa || pm || '0 meses'
}

function fmtData(d) {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  } catch {
    return ''
  }
}

const ERROS = {
  sem_tempo: 'Você ainda não atingiu o tempo de casa deste marco.',
  ja_resgatado: 'Este marco já foi resgatado.',
  indisponivel: 'Recompensa indisponível.',
  sem_acesso: 'Sessão expirada. Entre novamente.',
}

export function PainelJornada() {
  const [dados, setDados] = useState(null) // { meses_jornada, implantacao, marcos }
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState(null) // { tipo, texto }
  const [aberto, setAberto] = useState(null) // marco aberto no detalhe
  const [processando, setProcessando] = useState(false)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('jornada_listar')
    setDados(data || { meses_jornada: 0, marcos: [] })
    setCarregando(false)
  }, [])
  useEffect(() => {
    carregar()
  }, [carregar])

  const meses = dados?.meses_jornada ?? 0
  const implantacao = dados?.implantacao
  const marcos = dados?.marcos ?? []

  function abrir(m) {
    tapHaptic()
    setAviso(null)
    setAberto(m)
  }

  // Resgate direto (sem alerta de confirmação): um toque e pronto.
  async function resgatarOpcao(opcao) {
    if (!opcao || processando) return
    tapHaptic()
    setProcessando(true)
    const { data, error } = await supabase.rpc('jornada_resgatar', { p_opcao: opcao.id })
    setProcessando(false)
    if (error || !data?.ok) {
      setAviso({ tipo: 'erro', texto: ERROS[data?.erro] || 'Não foi possível resgatar agora.' })
    } else {
      setAviso({ tipo: 'ok', texto: `"${opcao.titulo}" resgatado! 🎉` })
    }
    setAberto(null)
    carregar()
  }

  return (
    <>
      {/* Tempo no programa */}
      <div className="px-5 pt-3">
        <div className="hero-card reveal p-4">
          <div className="hstack justify-between">
            <div>
              <div className="text-xs text-muted">Sua Jornada TATÁ</div>
              <div className="font-display text-2xl font-bold text-accent">{fmtTempo(meses)}</div>
              {implantacao && (
                <div className="mt-0.5 text-[11px] text-muted-2">conta desde {fmtData(implantacao)}</div>
              )}
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <Gift size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-2">
        <p className="text-[11px] leading-relaxed text-muted-2">
          Confira as regras do programa em{' '}
          <Link to="/treinamentos" className="font-semibold text-accent">
            desafios
          </Link>
          .
        </p>
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
      ) : marcos.length === 0 ? (
        <div className="px-8 py-16 text-center text-sm text-muted">
          Sua Jornada TATÁ está sendo preparada. 🎁
        </div>
      ) : (
        <Section className="reveal reveal-1 mt-5" title="Sua jornada TATÁ">
          <div className="flex flex-col gap-3">
            {marcos.map((m) => {
              const op0 = m.opcoes?.[0]
              const resgatado = !!m.resgatado_opcao
              const varias = (m.opcoes || []).length > 1
              return (
                <Card
                  key={m.id}
                  onClick={() => abrir(m)}
                  className="flex cursor-pointer items-stretch gap-3.5 !p-3 tap"
                >
                  <div className="grid min-h-[100px] w-[140px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent-soft text-4xl">
                    <RecompensaFoto
                      src={op0?.imagem_url}
                      emoji={op0?.emoji || '🎁'}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="text-sm font-bold leading-tight">{m.titulo}</div>
                    {op0?.titulo && (
                      <div className="mt-1 text-xs leading-snug text-muted">{op0.titulo}</div>
                    )}

                    <div className="mt-auto pt-2">
                      {resgatado ? (
                        <span className="hstack w-full items-center justify-center gap-1 rounded-full bg-accent-soft px-3.5 py-2.5 text-xs font-bold text-accent">
                          <Check size={14} /> Resgatado
                        </span>
                      ) : m.atingido ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            tapHaptic()
                            if (varias) abrir(m)
                            else resgatarOpcao(op0)
                          }}
                          className="btn-primary w-full !py-2.5 text-xs font-bold"
                        >
                          Resgate
                        </button>
                      ) : (
                        <span className="hstack w-full items-center justify-center gap-1 rounded-full bg-surface-2 px-4 py-2.5 text-xs font-semibold text-muted-2">
                          <Lock size={13} /> Resgate
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </Section>
      )}

      {/* Detalhe do marco + escolha da opção */}
      {aberto &&
        createPortal(
          <DetalheMarco
            marco={aberto}
            meses={meses}
            onFechar={() => setAberto(null)}
            onEscolher={(op) => resgatarOpcao(op)}
          />,
          document.body,
        )}
    </>
  )
}

// Janelinha de detalhes do marco (padrão da de Recompensas): mostra as opções e,
// se o tempo permite, deixa escolher/resgatar. Vários "escolheu 1 fecha".
function DetalheMarco({ marco, meses, onFechar, onEscolher }) {
  const resgatadoId = marco.resgatado_opcao
  const atingido = marco.atingido
  const faltam = Math.max(0, marco.meses - meses)
  const varias = (marco.opcoes || []).length > 1
  const op0 = marco.opcoes?.[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-card border border-line bg-surface"
      >
        <div className="hstack justify-between border-b border-line px-5 py-3.5">
          <div className="min-w-0 font-display text-base font-bold leading-tight">{marco.titulo}</div>
          <button onClick={onFechar} className="shrink-0 text-muted tap" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Foto grande no topo. A imagem da Jornada é vertical, então mostra no
              formato natural (largura cheia, sem cortar) em vez de forçar quadrado. */}
          <div className="grid min-h-[140px] place-items-center overflow-hidden rounded-2xl bg-accent-soft text-7xl">
            <RecompensaFoto
              src={op0?.imagem_url}
              emoji={op0?.emoji || '🎁'}
              className="max-h-[60vh] w-full object-contain"
            />
          </div>

          {marco.descricao && <p className="mt-3 text-sm text-muted">{marco.descricao}</p>}

          {!resgatadoId && (
            <div className="mt-3 text-center text-xs font-medium text-muted-2">
              {atingido
                ? varias
                  ? 'Escolha 1 — ao escolher, o marco fecha.'
                  : 'Parabéns!!! Você já pode resgatar o seu presente.'
                : `Disponível ao completar ${fmtTempo(marco.meses)} de Jornada.`}
            </div>
          )}

          {varias && (
            <div className="mt-3 flex flex-col gap-2">
            {(marco.opcoes || []).map((op) => {
              const escolhida = resgatadoId === op.id
              const podeTocar = atingido && !resgatadoId
              return (
                <div
                  key={op.id}
                  className={cn(
                    'hstack items-center gap-3 rounded-2xl border p-2.5',
                    escolhida
                      ? 'border-accent bg-accent-soft'
                      : resgatadoId || !atingido
                        ? 'border-line opacity-60'
                        : 'border-line',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-tight">{op.titulo}</div>
                    {op.descricao && (
                      <div className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted">
                        {op.descricao}
                      </div>
                    )}
                    {op.link && (
                      <a
                        href={op.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent tap"
                      >
                        <ExternalLink size={12} /> Ver mais
                      </a>
                    )}
                  </div>
                  {escolhida ? (
                    <span className="hstack shrink-0 items-center gap-1 text-xs font-bold text-accent">
                      <Check size={15} /> Escolhido
                    </span>
                  ) : podeTocar && varias ? (
                    <button
                      onClick={() => onEscolher(op)}
                      className="btn-primary shrink-0 !px-3 !py-2 text-xs font-bold"
                    >
                      Escolher
                    </button>
                  ) : !atingido ? (
                    <Lock size={15} className="shrink-0 text-muted-2" />
                  ) : null}
                </div>
              )
            })}
            </div>
          )}
        </div>

        {/* Rodapé: botão de resgate no mesmo padrão do Recompensas */}
        <div className="border-t border-line px-5 py-3.5">
          {resgatadoId ? (
            <div className="hstack w-full items-center justify-center gap-1.5 rounded-full bg-accent-soft py-3 text-sm font-bold text-accent">
              <Check size={16} /> Resgatado
            </div>
          ) : !atingido ? (
            <div className="hstack w-full items-center justify-center gap-1.5 rounded-full bg-surface-2 py-3 text-sm font-semibold text-muted-2">
              <Lock size={14} /> Faltam {fmtTempo(faltam)}
            </div>
          ) : varias ? (
            <div className="py-1 text-center text-xs font-medium text-muted-2">
              Escolha uma opção acima para resgatar.
            </div>
          ) : op0 ? (
            <button
              onClick={() => onEscolher(op0)}
              className="btn-primary w-full !py-3 text-sm font-bold"
            >
              Resgatar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

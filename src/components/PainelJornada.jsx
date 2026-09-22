import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Lock, Check, X } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { RecompensaFoto } from './RecompensaFoto.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { supabase } from '../lib/supabase.js'

// "Jornada TATÁ": recompensas por tempo de casa. Cada marco (ex.: 3 anos)
// aparece pra todos, mas só é resgatável quando a pessoa atinge o tempo. Cada
// marco tem 1+ opções; ao escolher uma, o marco fecha (1x por pessoa, grátis).

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
  const [dados, setDados] = useState(null) // { meses_casa, marcos: [] }
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState(null) // { tipo, texto }
  const [confirmar, setConfirmar] = useState(null) // { marco, opcao }
  const [processando, setProcessando] = useState(false)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('jornada_listar')
    setDados(data || { meses_casa: 0, marcos: [] })
    setCarregando(false)
  }, [])
  useEffect(() => {
    carregar()
  }, [carregar])

  async function escolher() {
    if (!confirmar) return
    tapHaptic()
    setProcessando(true)
    const { data, error } = await supabase.rpc('jornada_resgatar', { p_opcao: confirmar.opcao.id })
    setProcessando(false)
    if (error || !data?.ok) {
      setAviso({ tipo: 'erro', texto: ERROS[data?.erro] || 'Não foi possível resgatar agora.' })
    } else {
      setAviso({ tipo: 'ok', texto: `"${confirmar.opcao.titulo}" resgatado! 🎉` })
    }
    setConfirmar(null)
    carregar()
  }

  const meses = dados?.meses_jornada ?? 0
  const implantacao = dados?.implantacao
  const marcos = dados?.marcos ?? []

  return (
    <>
      {/* Tempo no programa (Jornada) */}
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
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-2xl">🐢</div>
          </div>
        </div>
      </div>

      {/* Especificação da regra (não retroativo) */}
      <div className="px-5 pt-2">
        <p className="text-[11px] leading-relaxed text-muted-2">
          O tempo da Jornada conta a partir da implantação do programa — períodos anteriores não
          entram (não é retroativo).
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
          Sua Jornada TATÁ está sendo preparada. 🐢
        </div>
      ) : (
        <Section className="reveal reveal-1 mt-5" title="Sua jornada TATÁ">
          <div className="flex flex-col gap-4">
            {marcos.map((mc) => (
              <MarcoCard
                key={mc.id}
                mc={mc}
                meses={meses}
                onEscolher={(op) => {
                  tapHaptic()
                  setAviso(null)
                  setConfirmar({ marco: mc, opcao: op })
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Confirmação — escolher fecha o marco */}
      {confirmar &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => !processando && setConfirmar(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-card border border-line bg-surface p-5"
            >
              <div className="font-display text-base font-bold leading-tight">
                {confirmar.opcao.titulo}
              </div>
              <p className="mt-2 text-sm text-muted">
                Ao escolher, o marco <b>{confirmar.marco.titulo}</b> fecha e você não poderá trocar
                depois. Confirmar?
              </p>
              <div className="mt-4 hstack gap-2">
                <button
                  onClick={() => setConfirmar(null)}
                  disabled={processando}
                  className="btn-ghost flex-1 !py-3 text-sm text-muted"
                >
                  Voltar
                </button>
                <button
                  onClick={escolher}
                  disabled={processando}
                  className={cn('btn-primary flex-1 !py-3 text-sm', processando && 'opacity-60')}
                >
                  {processando ? <Loader2 size={16} className="animate-spin" /> : 'Resgatar'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function MarcoCard({ mc, meses, onEscolher }) {
  const resgatadoId = mc.resgatado_opcao
  const atingido = mc.atingido
  const faltam = Math.max(0, mc.meses - meses)

  return (
    <Card className="!p-4">
      <div className="hstack items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-base font-bold leading-tight">{mc.titulo}</div>
          {mc.descricao && <p className="mt-1 text-xs leading-relaxed text-muted">{mc.descricao}</p>}
        </div>
        {resgatadoId ? (
          <span className="pill shrink-0 bg-accent-soft text-[10px] uppercase text-accent">
            <Check size={11} /> Resgatado
          </span>
        ) : atingido ? (
          <span className="pill shrink-0 bg-accent text-black text-[10px] uppercase">Disponível</span>
        ) : (
          <span className="pill shrink-0 bg-surface-2 text-[10px] uppercase text-muted">
            <Lock size={11} /> {fmtTempo(mc.meses)}
          </span>
        )}
      </div>

      {/* Dica de estado */}
      {!resgatadoId && (
        <div className="mt-2 text-[11px] font-medium text-muted-2">
          {atingido
            ? mc.opcoes.length > 1
              ? 'Escolha 1 — ao escolher, o marco fecha.'
              : 'Disponível pra resgatar — resgatou, fecha.'
            : `Faltam ${fmtTempo(faltam)} pra desbloquear.`}
        </div>
      )}

      {/* Opções */}
      <div className="mt-3 flex flex-col gap-2">
        {mc.opcoes.map((op) => {
          const escolhida = resgatadoId === op.id
          const outraEscolhida = resgatadoId && !escolhida
          const podeTocar = atingido && !resgatadoId
          const inner = (
            <>
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent-soft text-3xl">
                <RecompensaFoto src={op.imagem_url} emoji={op.emoji} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight">{op.titulo}</div>
                {op.descricao && (
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted">{op.descricao}</div>
                )}
              </div>
              {escolhida ? (
                <span className="hstack shrink-0 items-center gap-1 text-xs font-bold text-accent">
                  <Check size={15} /> Escolhido
                </span>
              ) : !atingido ? (
                <Lock size={15} className="shrink-0 text-muted-2" />
              ) : null}
            </>
          )
          const base =
            'hstack items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors'
          if (podeTocar) {
            return (
              <button
                key={op.id}
                onClick={() => onEscolher(op)}
                className={cn(base, 'border-line tap active:bg-surface-2')}
              >
                {inner}
              </button>
            )
          }
          return (
            <div
              key={op.id}
              className={cn(
                base,
                escolhida
                  ? 'border-accent bg-accent-soft'
                  : outraEscolhida || !atingido
                    ? 'border-line opacity-55'
                    : 'border-line',
              )}
            >
              {inner}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

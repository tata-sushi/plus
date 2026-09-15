import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'

// Widgets do módulo "Gorjeta e Prêmio" — explicam a conta do prêmio.
//   [[premio-ponto]] → 1ª regra: valor do ponto × a sua pontuação = valor de partida
//   [[premio-total]] → valor de partida − penalidades = valor final
// Exemplo com os números da Cozinha (ponto R$ 75; pontuação 3; penalidades reais).

const PONTO = 75
const PTS = 3
const BASE = PONTO * PTS // 225

const BRL = (n) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── 1. Valor do ponto × pontuação ────────────────────────────────────────────
function Fator({ rotulo, valor, on }) {
  return (
    <div
      className={cn(
        'hstack items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors',
        on ? 'bg-accent-soft' : '',
      )}
    >
      <span className={cn('min-w-0 flex-1 text-[13px] leading-snug', on ? 'font-bold text-accent' : 'text-muted')}>
        {rotulo}
      </span>
      <span className={cn('shrink-0 font-display text-base font-bold', on ? 'text-accent' : 'text-text')}>
        {valor}
      </span>
    </div>
  )
}

function PremioPonto() {
  const [foco, setFoco] = useState(0) // 0 ponto · 1 pontuação · 2 resultado
  useEffect(() => {
    const t = setInterval(() => setFoco((f) => (f + 1) % 3), 1400)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Exemplo</p>
      <div className="mt-3 rounded-2xl border border-line bg-bg p-3">
        <Fator rotulo="Valor básico do ponto na regra do prêmio" valor={BRL(PONTO)} on={foco === 0} />
        <div className="py-0.5 text-center text-base font-bold text-muted-2">×</div>
        <Fator rotulo="Sua pontuação de acordo com o cargo" valor={`${PTS} pontos`} on={foco === 1} />
        <div className="my-2 h-px bg-line" />
        <div
          className={cn(
            'rounded-xl px-3 py-2.5 text-center transition-all',
            foco === 2 ? 'bg-accent-soft' : 'bg-surface-2',
          )}
        >
          <span className="text-[11px] text-muted">Valor de partida do prêmio</span>
          <div
            className={cn(
              'font-display text-2xl font-extrabold transition-transform',
              foco === 2 ? 'scale-105 text-accent' : 'scale-100 text-text',
            )}
          >
            {BRL(BASE)}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Valor do ponto <span className="font-bold text-text">×</span> a sua pontuação = valor de partida do seu prêmio
      </p>
    </div>
  )
}

// ── 2. Valor final = valor de partida − penalidades ──────────────────────────
const DESCONTOS = [
  { rot: 'Penalizados na Qualidade', val: 15 },
  { rot: 'Penalização por Falta', val: 15 },
  { rot: 'Faixa intermediária não atingida', val: 7.5 },
]
const FINAL = BASE - DESCONTOS.reduce((a, d) => a + d.val, 0) // 187,50

function Linha({ rotulo, valor, tipo, on, foco }) {
  return (
    <div
      className={cn(
        'hstack items-center justify-between gap-2 rounded-lg px-3 py-1.5 transition-all',
        !on && 'opacity-30',
        foco && 'bg-accent-soft',
      )}
    >
      <span
        className={cn(
          'min-w-0 flex-1 text-[13px] leading-snug',
          tipo === 'base' ? 'font-semibold text-text' : 'text-muted',
        )}
      >
        {rotulo}
      </span>
      <span
        className={cn(
          'shrink-0 font-display text-sm font-bold',
          tipo === 'pen' ? 'text-danger' : 'text-text',
        )}
      >
        {valor}
      </span>
    </div>
  )
}

function PremioTotal() {
  // step 0: base · 1..3: revela cada desconto · 4: valor final
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 5), 1200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Exemplo</p>
      <div className="mt-3 rounded-2xl border border-line bg-bg p-3">
        {/* topo fixo: valor inicial do prêmio */}
        <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
          <span className="text-[11px] text-muted">Valor inicial do seu prêmio</span>
          <div className="font-display text-2xl font-extrabold text-text">{BRL(BASE)}</div>
        </div>

        <div className="mt-3 space-y-1">
          <Linha rotulo="valor inicial do prêmio" valor={BRL(BASE)} tipo="base" on />

          {/* separador que identifica que abaixo são descontos */}
          <div className="hstack items-center gap-2 py-1">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-2">desconto</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {DESCONTOS.map((d, i) => (
            <Linha
              key={d.rot}
              rotulo={d.rot}
              valor={'− ' + BRL(d.val)}
              tipo="pen"
              on={step >= i + 1}
              foco={step === i + 1}
            />
          ))}

          {/* valor final */}
          <div
            className={cn(
              'mt-1 hstack items-center justify-between gap-2 rounded-lg px-3 py-2 transition-all',
              step >= 4 ? 'bg-accent-soft' : 'opacity-30',
            )}
          >
            <span className="text-[13px] font-bold text-accent">Valor final</span>
            <span className="shrink-0 font-display text-base font-extrabold text-accent">{BRL(FINAL)}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Valor inicial <span className="font-bold text-text">−</span> penalidades = valor final
      </p>
    </div>
  )
}

export function PremioWidget({ tipo }) {
  if (tipo === 'premio-ponto') return <PremioPonto />
  if (tipo === 'premio-total') return <PremioTotal />
  return null
}

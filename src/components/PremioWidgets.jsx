import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'

// Widgets do módulo "Gorjeta e Prêmio" — explicam a conta do prêmio.
//   [[premio-ponto]] → 1ª regra: valor do ponto × a sua pontuação = valor base
//   [[premio-total]] → prêmio final: valor base − penalidades
// Exemplo com os números da Cozinha (ponto R$ 75; penalidades −R$ 15 e −R$ 7,50).

const BRL = (n) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── 1. Valor do ponto × pontuação ────────────────────────────────────────────
function Fator({ rotulo, valor, on }) {
  return (
    <div
      className={cn(
        'hstack items-center justify-between rounded-lg px-3 py-2 transition-colors',
        on ? 'bg-accent-soft' : '',
      )}
    >
      <span className={cn('text-[13px]', on ? 'font-bold text-accent' : 'text-muted')}>{rotulo}</span>
      <span className={cn('font-display text-base font-bold', on ? 'text-accent' : 'text-text')}>
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
  const ponto = 75
  const pts = 8
  const base = ponto * pts

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Exemplo</p>
      <div className="mt-3 rounded-2xl border border-line bg-bg p-3">
        <Fator rotulo="Valor do ponto" valor={BRL(ponto)} on={foco === 0} />
        <div className="py-0.5 text-center text-base font-bold text-muted-2">×</div>
        <Fator rotulo="Sua pontuação" valor={`${pts} pontos`} on={foco === 1} />
        <div className="my-2 h-px bg-line" />
        <div
          className={cn(
            'rounded-xl px-3 py-2.5 text-center transition-all',
            foco === 2 ? 'bg-accent-soft' : 'bg-surface-2',
          )}
        >
          <span className="text-[11px] text-muted">Valor base do prêmio</span>
          <div
            className={cn(
              'font-display text-2xl font-extrabold transition-transform',
              foco === 2 ? 'scale-105 text-accent' : 'scale-100 text-text',
            )}
          >
            {BRL(base)}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Valor do ponto <span className="font-bold text-text">×</span> a sua pontuação = valor base
      </p>
    </div>
  )
}

// ── 2. Prêmio final = valor base − penalidades ───────────────────────────────
const PENALIDADES = [
  { rot: 'Qualidade', val: 15 },
  { rot: 'Faixa mínima', val: 7.5 },
]

function Linha({ rotulo, valor, tipo, on, foco }) {
  return (
    <div
      className={cn(
        'hstack items-center justify-between rounded-lg px-3 py-1.5 transition-all',
        !on && 'opacity-30',
        foco && 'bg-accent-soft',
      )}
    >
      <span className={cn('text-[13px]', tipo === 'base' ? 'font-semibold text-text' : 'text-muted')}>
        {rotulo}
      </span>
      <span className={cn('font-display text-sm font-bold', tipo === 'pen' ? 'text-danger' : 'text-text')}>
        {valor}
      </span>
    </div>
  )
}

function PremioTotal() {
  const [step, setStep] = useState(0) // 0 base · 1 −qualidade · 2 −faixa · 3 final
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 1300)
    return () => clearInterval(t)
  }, [])
  const base = 600
  const aplicadas = Math.min(step, PENALIDADES.length) // penalidades já descontadas
  const total = base - PENALIDADES.slice(0, aplicadas).reduce((a, p) => a + p.val, 0)

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Exemplo</p>
      <div className="mt-3 rounded-2xl border border-line bg-bg p-3">
        {/* total que vai descontando */}
        <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
          <span className="text-[11px] text-muted">{step >= 3 ? 'Prêmio final' : 'Prêmio parcial'}</span>
          <div
            className={cn(
              'font-display text-2xl font-extrabold transition-colors',
              step >= 3 ? 'text-accent' : 'text-text',
            )}
          >
            {BRL(total)}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <Linha rotulo="Valor base" valor={BRL(base)} tipo="base" on />
          <Linha rotulo="Qualidade" valor={'− ' + BRL(15)} tipo="pen" on={step >= 1} foco={step === 1} />
          <Linha rotulo="Faixa mínima" valor={'− ' + BRL(7.5)} tipo="pen" on={step >= 2} foco={step === 2} />
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Valor base <span className="font-bold text-text">−</span> penalidades = prêmio final
      </p>
    </div>
  )
}

export function PremioWidget({ tipo }) {
  if (tipo === 'premio-ponto') return <PremioPonto />
  if (tipo === 'premio-total') return <PremioTotal />
  return null
}

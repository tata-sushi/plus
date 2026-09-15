import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'

// Widgets do módulo "Gorjeta e Prêmio" — explicam a conta do prêmio.
//   [[premio-ponto]]        → valor do ponto × a pontuação = valor inicial
//   [[premio-total]]        → valor inicial − penalidades = valor final
//   [[premio-sem-pen]]      → sem penalidades: valor final = valor inicial
//   [[premio-bonus]]        → com penalidades + faixa extra
//   [[premio-bonus-extra]]  → sem penalidades + faixa extra (melhor caso)
// Sufixo "-100" (ex.: premio-ponto-100) usa o ponto de R$ 100 (Poke).

const PTS = 3
const HOLD = 5000 // segura o resultado final antes de reiniciar
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

function PremioPonto({ ponto }) {
  const base = ponto * PTS
  const [foco, setFoco] = useState(0) // 0 ponto · 1 pontuação · 2 resultado
  useEffect(() => {
    const t = setTimeout(() => setFoco((f) => (f + 1) % 3), foco === 2 ? HOLD : 1680)
    return () => clearTimeout(t)
  }, [foco])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Exemplo</p>
      <div className="mt-3 rounded-2xl border border-line bg-bg p-3">
        <Fator rotulo="Valor básico do ponto/prêmio" valor={BRL(ponto)} on={foco === 0} />
        <div className="py-0.5 text-center text-base font-bold text-muted-2">×</div>
        <Fator rotulo="Sua pontuação" valor={`${PTS} pontos`} on={foco === 1} />
        <div className="my-2 h-px bg-line" />
        <div
          className={cn(
            'rounded-xl px-3 py-2.5 text-center transition-all',
            foco === 2 ? 'bg-accent-soft' : 'bg-surface-2',
          )}
        >
          <span className="text-[11px] text-muted">Valor inicial do seu prêmio</span>
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
        Valor do ponto <span className="font-bold text-text">×</span> a sua pontuação = valor inicial do seu prêmio
      </p>
    </div>
  )
}

// ── 2/3/4/5. Valor inicial ± itens = valor final ─────────────────────────────
function Separador({ label }) {
  return (
    <div className="hstack items-center gap-2 py-1">
      <div className="h-px flex-1 bg-line" />
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-2">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  )
}

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
          tipo === 'pen' ? 'text-danger' : tipo === 'bonus' ? 'text-accent' : 'text-text',
        )}
      >
        {valor}
      </span>
    </div>
  )
}

// val negativo = desconto · val positivo = extra
// Valores de exemplo por valor do ponto (R$ 75 = Pinheiros/Itaim; R$ 100 = Poke).
const CONTAS_75 = {
  'premio-total': [
    { rot: 'Penalidade em Qualidade', val: -15 },
    { rot: 'Penalidade por Falta', val: -15 },
    { rot: 'Faixa intermediária não atingida', val: -7.5 },
  ],
  'premio-sem-pen': [],
  'premio-bonus': [
    { rot: 'Penalidade em Qualidade', val: -15 },
    { rot: 'Penalidade por Falta', val: -15 },
    { rot: 'Faixa extra atingida', val: 25 },
  ],
  'premio-bonus-extra': [{ rot: 'Faixa extra atingida', val: 25 }],
}
const CONTAS_100 = {
  'premio-total': [
    { rot: 'Penalidade em Qualidade', val: -6 },
    { rot: 'Penalidade por Falta', val: -20 },
    { rot: 'Faixa intermediária não atingida', val: -16 },
  ],
  'premio-sem-pen': [],
  'premio-bonus': [
    { rot: 'Penalidade em Qualidade', val: -6 },
    { rot: 'Penalidade por Falta', val: -20 },
    { rot: 'Faixa extra atingida', val: 15 },
  ],
  'premio-bonus-extra': [{ rot: 'Faixa extra atingida', val: 15 }],
}
const CONTAS_POR_PONTO = { 75: CONTAS_75, 100: CONTAS_100 }

function PremioConta({ itens, ponto }) {
  const base = ponto * PTS
  const total = itens.length
  const [step, setStep] = useState(0) // 0 = só base; 1..N = revela item i
  useEffect(() => {
    if (total === 0) return
    const t = setTimeout(() => setStep((s) => (s + 1) % (total + 1)), step === total ? HOLD : 1440)
    return () => clearTimeout(t)
  }, [step, total])

  const valorFinal = base + itens.slice(0, step).reduce((a, it) => a + it.val, 0)
  const firstDesc = itens.findIndex((i) => i.val < 0)
  const firstBonus = itens.findIndex((i) => i.val > 0)
  const temDesc = firstDesc !== -1
  const temBonus = firstBonus !== -1
  const legenda =
    total === 0
      ? 'Sem penalidades, o valor final é o valor inicial'
      : temDesc && temBonus
        ? 'Valor inicial − penalidades + extra = valor final'
        : temBonus
          ? 'Valor inicial + extra = valor final'
          : 'Valor inicial − penalidades = valor final'

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Exemplo</p>
      <div className="mt-3 rounded-2xl border border-line bg-bg p-3">
        {/* topo fixo: valor inicial */}
        <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
          <span className="text-[11px] text-muted">Valor inicial do seu prêmio</span>
          <div className="font-display text-2xl font-extrabold text-text">{BRL(base)}</div>
        </div>

        <div className="mt-3 space-y-1">
          <Linha rotulo="valor inicial do seu prêmio" valor={BRL(base)} tipo="base" on />

          {total === 0 && (
            <p className="py-2 text-center text-xs text-muted">Nenhuma penalidade neste período 🎉</p>
          )}

          {itens.map((it, i) => (
            <div key={it.rot}>
              {i === firstDesc && <Separador label="desconto" />}
              {i === firstBonus && <Separador label="extra" />}
              <Linha
                rotulo={it.rot}
                valor={(it.val < 0 ? '− ' : '+ ') + BRL(Math.abs(it.val))}
                tipo={it.val < 0 ? 'pen' : 'bonus'}
                on={step >= i + 1}
                foco={step === i + 1}
              />
            </div>
          ))}

          {/* valor final — sempre aceso, muda conforme os itens entram */}
          <div className="mt-1 hstack items-center justify-between gap-2 rounded-lg bg-accent-soft px-3 py-2">
            <span className="text-[13px] font-bold text-accent">Valor final</span>
            <span className="shrink-0 font-display text-base font-extrabold text-accent">{BRL(valorFinal)}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted">{legenda}</p>
    </div>
  )
}

export function PremioWidget({ tipo }) {
  // sufixo "-<n>" define o valor do ponto (ex.: premio-ponto-100 → R$ 100); padrão R$ 75
  const m = tipo.match(/^(premio-.+?)-(\d+)$/)
  const ponto = m ? Number(m[2]) : 75
  const base = m ? m[1] : tipo
  const contas = CONTAS_POR_PONTO[ponto] || CONTAS_75
  if (base === 'premio-ponto') return <PremioPonto ponto={ponto} />
  if (contas[base]) return <PremioConta itens={contas[base]} ponto={ponto} />
  return null
}

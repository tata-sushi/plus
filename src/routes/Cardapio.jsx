import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { resolveIcon } from '../lib/icons.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { cardapioSemanal } from '../lib/mockData.js'

// Índice do dia (0 = Segunda … 6 = Domingo) e as datas da semana atual.
function calcularSemana() {
  const hoje = new Date()
  const idxHoje = (hoje.getDay() + 6) % 7
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() - idxHoje)
  const datas = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda)
    d.setDate(segunda.getDate() + i)
    return d
  })
  return { idxHoje, datas }
}

const fmtIntervalo = (datas) => {
  const opt = { day: '2-digit', month: '2-digit' }
  return `${datas[0].toLocaleDateString('pt-BR', opt)} – ${datas[6].toLocaleDateString('pt-BR', opt)}`
}

export function Cardapio() {
  const { idxHoje, datas } = calcularSemana()
  const [sel, setSel] = useState(idxHoje)
  const dia = cardapioSemanal[sel]

  return (
    <>
      <Header />

      <div className="mt-2 px-5">
        <div className="hstack gap-2 text-xs font-semibold text-muted">
          <CalendarDays size={15} className="text-accent" />
          Cardápio da semana · {fmtIntervalo(datas)}
        </div>
      </div>

      {/* Seletor de dias */}
      <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {cardapioSemanal.map((d, i) => {
          const isSel = i === sel
          const isHoje = i === idxHoje
          return (
            <button
              key={d.abrev}
              onClick={() => {
                tapHaptic()
                setSel(i)
              }}
              className={cn(
                'flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-2xl border py-2 tap',
                isSel
                  ? 'border-accent bg-accent text-black'
                  : 'border-white/5 bg-surface-2 text-muted',
              )}
            >
              <span className="text-[11px] font-semibold uppercase">{d.abrev}</span>
              <span className="text-sm font-bold leading-none">{datas[i].getDate()}</span>
              <span
                className={cn(
                  'mt-0.5 h-1 w-1 rounded-full',
                  isHoje ? (isSel ? 'bg-black' : 'bg-accent') : 'bg-transparent',
                )}
              />
            </button>
          )
        })}
      </div>

      {/* Cardápio do dia selecionado */}
      <Section className="mt-4">
        <Card className="reveal">
          <div className="hstack justify-between">
            <div className="font-display text-base font-bold">{dia.nome}</div>
            {sel === idxHoje && (
              <span className="pill bg-accent-soft text-accent text-[10px]">Hoje</span>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {dia.itens.map((item, idx) => {
              const Icon = resolveIcon(item.icon)
              return (
                <div
                  key={item.label}
                  className={cn('hstack gap-3', idx > 0 && 'border-t border-white/5 pt-3')}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted">{item.label}</div>
                    <div className="text-sm font-semibold">{item.valor}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </Section>
    </>
  )
}

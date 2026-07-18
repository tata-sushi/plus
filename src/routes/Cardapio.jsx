import { CalendarDays } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { resolveIcon } from '../lib/icons.js'
import { cn } from '../lib/cn'
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

const fmtDia = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function DiaConteudo({ dia, data, isHoje }) {
  return (
    <>
      <div className="hstack justify-between">
        <div>
          <div className="font-display text-base font-bold">{dia.nome}</div>
          <div className="text-[11px] text-muted">{fmtDia(data)}</div>
        </div>
        {isHoje && <span className="pill bg-accent-soft text-accent text-[10px]">Hoje</span>}
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {dia.itens.map((item, idx) => {
          const Icon = resolveIcon(item.icon)
          return (
            <div
              key={item.label}
              className={cn('hstack gap-3', idx > 0 && 'border-t border-line pt-3')}
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
    </>
  )
}

export function Cardapio() {
  const { idxHoje, datas } = calcularSemana()

  // Hoje sempre em primeiro; remove os dias que já passaram.
  const proximos = cardapioSemanal
    .map((dia, i) => ({ dia, data: datas[i], isHoje: i === idxHoje }))
    .slice(idxHoje)

  return (
    <>
      <Header />
      <Voltar />

      <div className="mt-2 px-5">
        <div className="hstack justify-center gap-2 text-xs font-semibold text-muted">
          <CalendarDays size={15} className="text-accent" />
          Cardápio dos próximos dias
        </div>
      </div>

      <Section className="mt-4">
        <div className="flex flex-col gap-3">
          {proximos.map(({ dia, data, isHoje }) =>
            isHoje ? (
              <div key={dia.abrev} className="hero-card reveal p-4">
                <DiaConteudo dia={dia} data={data} isHoje />
              </div>
            ) : (
              <Card key={dia.abrev} className="reveal">
                <DiaConteudo dia={dia} data={data} isHoje={false} />
              </Card>
            ),
          )}
        </div>
      </Section>
    </>
  )
}

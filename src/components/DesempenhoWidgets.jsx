import { useEffect, useState } from 'react'
import { Search, ClipboardList, TrendingUp, Repeat } from 'lucide-react'
import { cn } from '../lib/cn'

// Widget do desafio "Avaliação de Desempenho" (Avaliações e Feedback).
//   [[pdi-ciclo]] → ciclo do PDI: Identificar → Planejar → Desenvolver → Acompanhar

const PDI = [
  { Icon: Search, label: 'Identificar', desc: 'os pontos fortes e o que pode evoluir, a partir da avaliação.' },
  { Icon: ClipboardList, label: 'Planejar', desc: 'as ações e os combinados de desenvolvimento (o PDI).' },
  { Icon: TrendingUp, label: 'Desenvolver', desc: 'colocar as ações em prática no dia a dia.' },
  { Icon: Repeat, label: 'Acompanhar', desc: 'revisar a evolução ao longo do tempo.' },
]

function PdiCiclo() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PDI.length), 1600)
    return () => clearInterval(t)
  }, [])
  const cur = PDI[i]

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">O ciclo do PDI</p>
      <p className="mt-0.5 text-xs text-muted">Um processo contínuo de desenvolvimento:</p>

      {/* passos (stepper) */}
      <div className="relative mt-4">
        <div className="absolute left-6 right-6 top-[18px] h-0.5" style={{ background: 'var(--line)' }} />
        <div className="relative flex justify-between">
          {PDI.map((s, idx) => {
            const on = idx === i
            const Icon = s.Icon
            return (
              <div key={s.label} className="flex w-[24%] flex-col items-center">
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full border-2 bg-surface transition-all',
                    on ? 'scale-110 border-accent bg-accent text-black' : 'border-line text-muted-2',
                  )}
                >
                  <Icon size={15} />
                </span>
                <span
                  className={cn(
                    'mt-1.5 text-center text-[9px] font-semibold leading-tight',
                    on ? 'text-accent' : 'text-muted-2',
                  )}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* descrição do passo ativo */}
      <div key={i} className="animate-page mt-3 rounded-xl bg-accent-soft px-3 py-2.5 text-center">
        <span className="text-sm font-bold text-accent">
          {i + 1}. {cur.label}
        </span>
        <p className="mt-0.5 text-xs text-muted">{cur.desc}</p>
      </div>

      <p className="mt-2 hstack justify-center gap-1 text-[11px] font-medium text-muted-2">
        <Repeat size={12} /> É um ciclo: recomeça a cada avaliação.
      </p>
    </div>
  )
}

export function DesempenhoWidget({ tipo }) {
  if (tipo === 'pdi-ciclo') return <PdiCiclo />
  return null
}

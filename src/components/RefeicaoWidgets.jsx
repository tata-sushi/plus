import { useEffect, useState } from 'react'
import { Home, Trophy, Newspaper, Ear, Menu, Star, Hand } from 'lucide-react'
import { cn } from '../lib/cn'

// Widgets do desafio "Avaliação das Refeições" (Avaliações e Feedback).
//   [[refeicao-caminho]]  → onde avaliar: Início → estrela do "Menu do dia"
//   [[refeicao-estrelas]] → como avaliar: nota de 1 a 5 estrelas + sugestão

function Toque({ className }) {
  return (
    <span className={cn('pointer-events-none absolute', className)}>
      <span className="absolute inset-0 -m-1 animate-ping rounded-full bg-accent/40" />
      <span className="relative grid h-6 w-6 place-items-center rounded-full bg-accent text-black shadow">
        <Hand size={13} />
      </span>
    </span>
  )
}

// ── 1. Onde avaliar: Início → estrela do "Menu do dia" ───────────────────────
const NAV = [
  { Icon: Home, label: 'Início', alvo: true },
  { Icon: Trophy, label: 'Ranking' },
  { Icon: Newspaper, label: 'Feed' },
  { Icon: Ear, label: 'Ouvidoria' },
  { Icon: Menu, label: 'Mais' },
]

function RefeicaoCaminho() {
  const [passo, setPasso] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPasso((p) => (p + 1) % 2), 2100)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Passo a passo</p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-bg">
        <div key={passo} className="animate-page grid h-[152px] place-items-center px-4 py-4">
          {passo === 0 && (
            <div className="w-full">
              <p className="mb-3 text-center text-xs text-muted-2">Barra de navegação</p>
              <div className="relative flex items-end justify-between rounded-xl border border-line bg-surface px-2 py-2">
                {NAV.map(({ Icon, label, alvo }) => (
                  <div key={label} className="relative flex flex-1 flex-col items-center gap-1">
                    <Icon size={18} className={alvo ? 'text-accent' : 'text-muted-2'} />
                    <span className={cn('text-[9px]', alvo ? 'font-bold text-accent' : 'text-muted-2')}>
                      {label}
                    </span>
                    {alvo && <Toque className="-top-3 right-1" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {passo === 1 && (
            <div className="w-full">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-2">
                Menu do dia
              </p>
              <div className="relative flex items-center rounded-xl border border-line bg-surface py-2 pl-3 pr-2">
                <div className="flex grow items-center gap-2 overflow-hidden text-[12px] font-semibold">
                  <span>🍚 Arroz</span>
                  <span className="text-muted-2">·</span>
                  <span>🍗 Frango</span>
                  <span className="text-muted-2">·</span>
                  <span>🥗 Salada</span>
                </div>
                <div className="relative shrink-0 pl-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent-soft text-accent">
                    <Star size={16} />
                  </span>
                  <Toque className="-right-1 -top-2" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-sm font-semibold">
        {passo === 0 ? '1. Vá para o Início' : '2. Toque na ⭐ do Menu do dia'}
      </p>
      <div className="mt-2 hstack justify-center gap-1.5">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={cn('h-1.5 rounded-full transition-all', i === passo ? 'w-5 bg-accent' : 'w-1.5 bg-line')}
          />
        ))}
      </div>
    </div>
  )
}

// ── 2. Como avaliar: nota de 1 a 5 estrelas + sugestão ───────────────────────
function RefeicaoEstrelas() {
  const [nota, setNota] = useState(4)
  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Exemplo</p>
      <div className="mt-3 rounded-2xl border border-line bg-bg p-4 text-center">
        <p className="font-display text-sm font-bold">O que achou da refeição de hoje?</p>
        <p className="mt-0.5 text-xs text-muted">Avalie e deixe a sua sugestão</p>
        <div className="mt-3 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNota(n)}
              aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
              className="tap"
            >
              <Star size={26} className={cn(n <= nota ? 'fill-accent text-accent' : 'text-muted-2')} />
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-card border border-line bg-surface px-3 py-2 text-left text-xs text-muted-2">
          Sua sugestão (opcional)
        </div>
        <div className="btn-primary mt-3 !py-2 text-xs">Enviar</div>
      </div>
    </div>
  )
}

export function RefeicaoWidget({ tipo }) {
  if (tipo === 'refeicao-caminho') return <RefeicaoCaminho />
  if (tipo === 'refeicao-estrelas') return <RefeicaoEstrelas />
  return null
}

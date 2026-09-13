import { useEffect, useState } from 'react'
import { Home, Trophy, Newspaper, Ear, Menu, UserRound, ClipboardList, UtensilsCrossed, Hand } from 'lucide-react'
import { cn } from '../lib/cn'

// Widgets do desafio "Experiência 14 dias: Colaborador" (Avaliações & Feedbacks).
//   [[caminho-avaliacao]]  → animação do caminho até a avaliação (Mais → Avaliações → responder)
//   [[perguntas-14dias]]   → exemplos de perguntas com a escala de percepção 1 a 5

// ── Animação: o caminho até a avaliação ──────────────────────────────────────
const NAV = [
  { Icon: Home, label: 'Início' },
  { Icon: Trophy, label: 'Ranking' },
  { Icon: Newspaper, label: 'Feed' },
  { Icon: Ear, label: 'Ouvidoria' },
  { Icon: Menu, label: 'Mais', alvo: true },
]
const MENU = [
  { Icon: UserRound, label: 'Meu perfil' },
  { Icon: ClipboardList, label: 'Avaliações', alvo: true },
  { Icon: UtensilsCrossed, label: 'Cardápio' },
]
const PASSOS = [
  '1. Toque em Mais',
  '2. Toque em Avaliações',
  '3. Responda o período',
]

// mãozinha de "toque" pulsando sobre o alvo
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

function AvaliacaoCaminho() {
  const [passo, setPasso] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPasso((p) => (p + 1) % 3), 2100)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Onde responder, passo a passo</p>
      <p className="mt-0.5 text-xs text-muted">É rapidinho, veja o caminho:</p>

      {/* telinha do celular */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-bg">
        <div key={passo} className="animate-page grid min-h-[168px] place-items-center px-4 py-4">
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
            <div className="w-full space-y-2">
              {MENU.map(({ Icon, label, alvo }) => (
                <div
                  key={label}
                  className={cn(
                    'relative hstack items-center gap-3 rounded-xl border px-3 py-2.5',
                    alvo ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
                  )}
                >
                  <Icon size={17} className={alvo ? 'text-accent' : 'text-muted'} />
                  <span className={cn('text-sm', alvo ? 'font-bold text-accent' : 'text-muted')}>
                    {label}
                  </span>
                  {alvo && <Toque className="right-3 top-1/2 -translate-y-1/2" />}
                </div>
              ))}
            </div>
          )}

          {passo === 2 && (
            <div className="w-full">
              <div className="rounded-xl border border-line bg-surface px-3 py-3">
                <p className="text-xs font-semibold text-accent">Avaliar 1º período</p>
                <p className="mt-1.5 text-[13px] leading-snug">
                  O quanto está claro o que é esperado de você?
                </p>
                <div className="mt-2.5 flex justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={cn(
                        'grid h-8 w-8 place-items-center rounded-lg border text-xs font-bold',
                        n === 4 ? 'border-accent bg-accent text-black' : 'border-line bg-surface-2 text-muted',
                      )}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* legenda do passo + pontinhos */}
      <p className="mt-3 text-center text-sm font-semibold">{PASSOS[passo]}</p>
      <div className="mt-2 hstack justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn('h-1.5 rounded-full transition-all', i === passo ? 'w-5 bg-accent' : 'w-1.5 bg-line')}
          />
        ))}
      </div>
    </div>
  )
}

// ── Perguntas-modelo com a escala de percepção (1 a 5) ───────────────────────
const PERCEPCAO = ['Nada', 'Pouco', 'Moderado', 'Muito', 'Totalmente']
const EXEMPLOS = [
  'O quanto está claro o que é esperado de você neste início de trabalho?',
  'O quanto você se sente acolhido(a) pela equipe?',
  'O quanto está claro como funcionam jornada, escalas, folgas e ponto?',
]

function PerguntaExemplo({ texto }) {
  const [sel, setSel] = useState(null)
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-3">
      <p className="text-[13px] leading-snug">{texto}</p>
      <div className="mt-2.5 flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSel(n)}
            aria-label={`${n} · ${PERCEPCAO[n - 1]}`}
            className={cn(
              'grid h-10 w-10 place-items-center rounded-xl border text-sm font-bold tap',
              sel === n ? 'border-accent bg-accent text-black' : 'border-line bg-surface-2 text-muted',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1.5 h-4 text-center text-[11px] font-semibold text-accent">
        {sel ? PERCEPCAO[sel - 1] : ''}
      </p>
    </div>
  )
}

function PerguntasExemplo() {
  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Como são as perguntas</p>
      <p className="mt-0.5 text-xs text-muted">
        Você responde de 1 a 5 — toque para experimentar:
      </p>
      <div className="mt-2 hstack justify-between text-[11px] font-medium text-muted-2">
        <span>1 Nada</span>
        <span>3 Moderado</span>
        <span>5 Totalmente</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {EXEMPLOS.map((t) => (
          <PerguntaExemplo key={t} texto={t} />
        ))}
      </div>
    </div>
  )
}

// Dispatcher pelos tokens do conteúdo.
export function AvaliacaoWidget({ tipo }) {
  if (tipo === 'caminho-avaliacao') return <AvaliacaoCaminho />
  if (tipo === 'perguntas-14dias') return <PerguntasExemplo />
  return null
}

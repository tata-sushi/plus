import { useEffect, useState } from 'react'
import {
  Home, Trophy, Newspaper, Ear, Menu, Puzzle, HeartHandshake, Search, Send,
  Users, Zap, BadgeCheck, Handshake, Sparkles, Crown, Award, ChevronRight, Hand,
} from 'lucide-react'
import { cn } from '../lib/cn'

// Widgets do desafio "Reconhecimento entre Pares" (Avaliações & Feedbacks).
//   [[reconhecer-caminho]] → Mais → Reconhecimentos → "Reconhecer um colega"
//   [[reconhecer-sheet]]   → escolher o motivo (chips) + mensagem (interativo)
//   [[reconhecer-feed]]    → como aparece pra quem recebe

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

// ── Motivos reais (lib/reconhecimento.js) ────────────────────────────────────
const MOTIVOS = [
  { slug: 'equipe', label: 'Equipe', Icon: Users },
  { slug: 'proatividade', label: 'Proatividade', Icon: Zap },
  { slug: 'atendimento', label: 'Atendimento', Icon: HeartHandshake },
  { slug: 'qualidade', label: 'Qualidade', Icon: BadgeCheck },
  { slug: 'apoio', label: 'Apoio', Icon: Handshake },
  { slug: 'cultura', label: 'Cultura', Icon: Sparkles },
  { slug: 'lideranca', label: 'Liderança', Icon: Crown },
  { slug: 'outro', label: 'Outro', Icon: Award },
]

// ── 1. O caminho: Mais → Reconhecimentos → Reconhecer um colega ───────────────
const NAV = [
  { Icon: Home, label: 'Início' },
  { Icon: Trophy, label: 'Ranking' },
  { Icon: Newspaper, label: 'Feed' },
  { Icon: Ear, label: 'Ouvidoria' },
  { Icon: Menu, label: 'Mais', alvo: true },
]
const MENU = [
  { Icon: Puzzle, label: 'Passatempos' },
  { Icon: Trophy, label: 'Ranking' },
  { Icon: HeartHandshake, label: 'Reconhecimentos', alvo: true },
]
const PASSOS = ['1. Toque em Mais', '2. Toque em Reconhecimentos', '3. Toque em "Reconhecer um colega"']

function ReconhecerCaminho() {
  const [passo, setPasso] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPasso((p) => (p + 1) % 3), 2100)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Onde fica, passo a passo</p>
      <p className="mt-0.5 text-xs text-muted">É aqui no Tatá Plus:</p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-bg">
        <div key={passo} className="animate-page grid h-[188px] place-items-center px-4 py-4">
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
            <div className="w-full space-y-1.5">
              {MENU.map(({ Icon, label, alvo }) => (
                <div
                  key={label}
                  className={cn(
                    'relative hstack items-center gap-2.5 rounded-xl border bg-surface px-3 py-2',
                    alvo ? 'border-accent' : 'border-line',
                  )}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] font-semibold">{label}</span>
                  <ChevronRight size={15} className="shrink-0 text-carbon" />
                  {alvo && <Toque className="right-1 top-1/2 -translate-y-1/2" />}
                </div>
              ))}
            </div>
          )}

          {passo === 2 && (
            <div className="w-full">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-2">
                Reconhecer um colega
              </p>
              <div className="relative rounded-xl border border-accent bg-accent-soft px-3 py-3">
                <span className="hstack items-center justify-center gap-2 text-[13px] font-bold text-accent">
                  <HeartHandshake size={16} /> Reconhecer um colega
                </span>
                <Toque className="right-2 top-1/2 -translate-y-1/2" />
              </div>
              <div className="mt-2 hstack items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                <Search size={14} className="text-muted-2" />
                <span className="text-[12px] text-muted-2">Buscar colega pelo nome…</span>
              </div>
            </div>
          )}
        </div>
      </div>

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

// ── 2. O sheet: escolher o motivo + mensagem (interativo) ────────────────────
function ReconhecerSheet() {
  const [sel, setSel] = useState('proatividade')
  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Escolha o motivo e mande a mensagem</p>
      <p className="mt-0.5 text-xs text-muted">Toque num motivo para experimentar:</p>

      <div className="mt-3 rounded-2xl border border-line bg-bg p-3">
        <p className="font-display text-sm font-bold">Reconhecer Sam</p>
        <p className="mt-0.5 text-[11px] text-muted">Escolha o motivo do reconhecimento.</p>

        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {MOTIVOS.map(({ slug, label, Icon }) => {
            const on = sel === slug
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setSel(slug)}
                className={cn(
                  'hstack gap-1 rounded-pill border px-2.5 py-1.5 text-[11px] font-semibold tap',
                  on ? 'border-accent bg-accent text-black' : 'border-line bg-surface text-text',
                )}
              >
                <Icon size={12} className={on ? '' : 'text-accent'} /> {label}
              </button>
            )
          })}
        </div>

        <div className="mt-3 rounded-card border border-line bg-surface px-3 py-2.5 text-[12px]">
          Salvou o rush de sexta! 🙌
        </div>

        <div className="mt-2.5 hstack gap-2">
          <div className="btn-ghost flex-1 !py-2 text-xs">Cancelar</div>
          <div className="btn-primary hstack flex-1 justify-center gap-1 !py-2 text-xs">
            <Send size={13} /> Reconhecer
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 3. Como aparece pra quem recebe ──────────────────────────────────────────
function ReconhecerFeed() {
  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Como aparece pra quem recebe</p>
      <p className="mt-0.5 text-xs text-muted">No Histórico, na aba “Recebi”:</p>

      <div className="mt-3 hstack items-start gap-3 rounded-2xl border border-line bg-bg p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">
          S
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug">
            <strong>Sam</strong> <span className="text-muted">reconheceu você</span>
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            <Zap size={11} /> Proatividade
          </span>
          <p className="mt-1.5 text-[12px] italic text-muted">“Salvou o rush de sexta! 🙌”</p>
        </div>
      </div>
    </div>
  )
}

// Dispatcher pelos tokens do conteúdo.
export function ReconhecimentoWidget({ tipo }) {
  if (tipo === 'reconhecer-caminho') return <ReconhecerCaminho />
  if (tipo === 'reconhecer-sheet') return <ReconhecerSheet />
  if (tipo === 'reconhecer-feed') return <ReconhecerFeed />
  return null
}

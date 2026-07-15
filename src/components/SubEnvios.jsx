import { useState } from 'react'
import { ChevronDown, Lock, Play, CheckCircle2, Star, CalendarClock } from 'lucide-react'
import { cn } from '../lib/cn'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const mesDe = (d) => (d ? cap(new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR', { month: 'long' })) : '')
const ddmm = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '')

// Subcategoria (série) dentro de uma trilha — ex.: "100% de Presença", com um
// desafio por mês. Abre e mostra cada mês com o estado: aberto (dá pra enviar),
// em breve (trancado, com a data que abre) ou encerrado (janela já passou).
export function SubEnvios({ nome, itens, onAbrir }) {
  const [aberto, setAberto] = useState(false)
  const feitos = itens.filter((i) => i.concluido).length
  const temAberto = itens.some((i) => i.janela_estado === 'aberto' && !i.concluido)

  return (
    <div className="border-t border-line">
      <button
        onClick={() => setAberto((a) => !a)}
        className="hstack w-full gap-3 px-4 py-3 text-left tap"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <CalendarClock size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{nome}</span>
          <span className="text-[11px] text-muted-2">
            {feitos}/{itens.length} concluídos{temAberto ? ' · aberto agora' : ''}
          </span>
        </span>
        {temAberto && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-muted transition-transform', aberto && 'rotate-180')}
        />
      </button>

      {aberto && (
        <div>
          {itens.map((item) => {
            const concl = item.concluido
            const estado = concl ? 'concluido' : item.janela_estado
            const pode = estado === 'aberto' || concl
            const selo =
              estado === 'concluido'
                ? 'Concluído'
                : estado === 'aberto'
                  ? `Aberto · envie até ${ddmm(item.data_fim)}`
                  : estado === 'em_breve'
                    ? `Abre em ${ddmm(item.data_inicio)}`
                    : 'Encerrado'
            return (
              <button
                key={item.id}
                onClick={() => pode && onAbrir(item)}
                disabled={!pode}
                className={cn(
                  'hstack w-full gap-3 border-t border-line bg-surface-2/40 py-2.5 pl-7 pr-4 text-left tap',
                  !pode && 'opacity-55',
                )}
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full',
                    concl
                      ? 'bg-accent-soft text-accent'
                      : estado === 'aberto'
                        ? 'bg-accent text-black'
                        : 'bg-surface-2 text-muted-2',
                  )}
                >
                  {concl ? (
                    <CheckCircle2 size={14} />
                  ) : estado === 'aberto' ? (
                    <Play size={12} fill="currentColor" />
                  ) : (
                    <Lock size={12} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{mesDe(item.data_inicio)}</span>
                  <span
                    className={cn('text-[11px]', estado === 'aberto' ? 'text-accent' : 'text-muted-2')}
                  >
                    {selo}
                  </span>
                </span>
                {item.pontos > 0 && (
                  <span className="hstack shrink-0 gap-1 text-[11px] font-semibold text-muted">
                    <Star size={11} /> {item.pontos}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import {
  ChevronDown,
  Lock,
  Check,
  Play,
  CheckCircle2,
  Star,
  CalendarDays,
  Calendar,
  PartyPopper,
} from 'lucide-react'
import { cn } from '../lib/cn'

// competência (folha 21→20) = mês anterior ao início da janela.
// Ex.: janela abre 01/07 (período 21/06–20/07) → competência 06/2026.
function competencia(di) {
  if (!di) return ''
  const d = new Date(`${di}T00:00:00`)
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Submódulo dentro de uma trilha (ex.: dentro de "Especiais"). Recolhível.
// Série mensal de envio (ex.: 100% de Presença) → bancada de calendários (mês/ano),
// no estilo do TATÁ NEWS. Demais → lista simples de desafios.
export function Submodulo({ nome, itens, onAbrir, admin = false }) {
  const [aberto, setAberto] = useState(false)
  const ehSerie = itens.length > 0 && itens.every((i) => i.tipo === 'envio')
  const feitos = itens.filter((i) => i.concluido).length
  const temAberto = itens.some((i) => i.janela_estado === 'aberto' && !i.concluido)
  const HeaderIcon = ehSerie ? CalendarDays : PartyPopper

  return (
    <div className="border-t border-line">
      <button
        onClick={() => setAberto((a) => !a)}
        className="hstack w-full gap-3 px-4 py-3 text-left tap"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <HeaderIcon size={16} />
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

      {/* Série mensal → bancada de calendários (mês/ano) */}
      {aberto && ehSerie && (
        <div className="grid grid-cols-4 gap-3 bg-surface-2/40 p-4">
          {itens.map((item) => {
            const concl = item.concluido
            const estado = concl ? 'concluido' : item.janela_estado
            const pode = estado === 'aberto' || concl || admin
            return (
              <button
                key={item.id}
                onClick={() => pode && onAbrir(item)}
                disabled={!pode}
                aria-label={`Presença ${competencia(item.data_inicio)}`}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-1.5 tap',
                  concl
                    ? 'text-accent'
                    : estado === 'aberto'
                      ? 'text-text'
                      : admin
                        ? 'text-muted-2'
                        : 'text-muted-2 opacity-40',
                )}
              >
                {concl && (
                  <span className="absolute right-1 top-0 grid h-4 w-4 place-items-center rounded-full bg-accent text-black">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                {(estado === 'em_breve' || estado === 'encerrado') && (
                  <span className="absolute right-1 top-0">
                    <Lock size={12} />
                  </span>
                )}
                <Calendar size={30} strokeWidth={1.8} />
                <span className="text-xs font-bold">{competencia(item.data_inicio)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Demais → lista simples de desafios */}
      {aberto && !ehSerie && (
        <div>
          {itens.map((item) => {
            const bloqueado = !item.liberado && !item.concluido
            return (
              <button
                key={item.id}
                onClick={() => onAbrir(item)}
                disabled={bloqueado && !admin}
                className={cn(
                  'hstack w-full gap-3 border-t border-line bg-surface-2/40 py-2.5 pl-7 pr-4 text-left tap',
                  bloqueado && 'opacity-55',
                )}
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full',
                    item.concluido
                      ? 'bg-accent-soft text-accent'
                      : bloqueado
                        ? 'bg-surface-2 text-muted-2'
                        : 'bg-accent text-black',
                  )}
                >
                  {item.concluido ? (
                    <CheckCircle2 size={14} />
                  ) : bloqueado ? (
                    <Lock size={12} />
                  ) : (
                    <Play size={12} fill="currentColor" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.titulo}</span>
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

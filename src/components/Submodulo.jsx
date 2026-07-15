import { useState } from 'react'
import {
  ChevronDown,
  Lock,
  Check,
  X,
  Play,
  CheckCircle2,
  Star,
  CalendarDays,
  Calendar,
  PartyPopper,
  Gift,
} from 'lucide-react'
import { cn } from '../lib/cn'

// selo/ícone por estado do reconhecimento (tempo de casa)
const REC = {
  disponivel: { Icon: Gift, cls: 'bg-accent text-black' },
  resgatado: { Icon: CheckCircle2, cls: 'bg-accent-soft text-accent' },
  ja_passou: { Icon: X, cls: 'bg-surface-2 text-muted-2' },
  bloqueado: { Icon: Lock, cls: 'bg-surface-2 text-muted-2' },
}

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
export function Submodulo({ nome, itens, onAbrir, onResgatar, admin = false }) {
  const [aberto, setAberto] = useState(false)
  const ehSerie = itens.length > 0 && itens.every((i) => i.tipo === 'envio')
  const ehRec = itens.length > 0 && itens.every((i) => i.tipo === 'reconhecimento')
  const feitos = itens.filter((i) => i.concluido).length
  const temAcao =
    itens.some((i) => i.janela_estado === 'aberto' && !i.concluido) ||
    itens.some((i) => i.estado_reconhecimento === 'disponivel')
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
            {feitos}/{itens.length} {ehRec ? 'resgatados' : 'concluídos'}
            {temAcao ? ' · disponível' : ''}
          </span>
        </span>
        {temAcao && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
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
                  concl || estado === 'aberto'
                    ? 'text-accent'
                    : admin
                      ? 'text-muted-2'
                      : 'text-muted-2 opacity-40',
                )}
              >
                {concl && (
                  <span className="absolute right-0.5 top-0 grid h-3.5 w-3.5 place-items-center rounded-full bg-accent text-black">
                    <Check size={9} strokeWidth={3} />
                  </span>
                )}
                {estado === 'encerrado' && (
                  <span className="absolute right-0.5 top-0">
                    <X size={11} strokeWidth={2.5} />
                  </span>
                )}
                {estado === 'em_breve' && (
                  <span className="absolute right-0.5 top-0">
                    <Lock size={10} />
                  </span>
                )}
                <Calendar size={23} strokeWidth={1.5} />
                <span className="text-[10.5px] font-semibold">{competencia(item.data_inicio)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Reconhecimento por tempo de casa → níveis com estado */}
      {aberto && ehRec && (
        <div>
          <div className="border-t border-line bg-surface-2/40 px-4 py-3 text-[11px] leading-snug text-muted">
            Reconhecimento pelo seu tempo de casa 🎉 A partir de 6 meses, cada marco libera um prêmio.
            Marcos anteriores à entrada no programa não contam retroativo.
          </div>
          {itens.map((item) => {
            const est = item.estado_reconhecimento
            const cfg = REC[est] || REC.bloqueado
            const ehPontos = item.pontos > 0
            const dim = est === 'ja_passou' || est === 'bloqueado'
            return (
              <div
                key={item.id}
                className={cn(
                  'hstack gap-3 border-t border-line bg-surface-2/40 px-4 py-3',
                  dim && 'opacity-70',
                )}
              >
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', cfg.cls)}>
                  <cfg.Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{item.titulo}</div>
                  <div className="text-[11px] leading-snug text-muted-2">{item.descricao}</div>
                </div>
                {est === 'disponivel' && ehPontos ? (
                  <button
                    onClick={() => onResgatar?.(item)}
                    className="btn-primary shrink-0 !px-3 !py-1.5 text-xs"
                  >
                    Resgatar
                  </button>
                ) : est === 'disponivel' ? (
                  <span className="pill shrink-0 bg-accent-soft text-[10px] text-accent">Disponível</span>
                ) : est === 'resgatado' ? (
                  <span className="pill shrink-0 bg-accent-soft text-[10px] text-accent">Resgatado</span>
                ) : est === 'ja_passou' ? (
                  <span className="pill shrink-0 bg-surface-2 text-[10px] text-muted-2">Já passou</span>
                ) : (
                  <Lock size={13} className="shrink-0 text-muted-2" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Demais → lista simples de desafios */}
      {aberto && !ehSerie && !ehRec && (
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

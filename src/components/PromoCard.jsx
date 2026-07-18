import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

// Tile do grid "Sugestões" (2 colunas): ícone maior no topo e nome + descrição
// embaixo. Raio no padrão do app (rounded-card). Com `emBreve`, vira um card
// desativado (sem link) e ganha a pílula "Em breve".
export function PromoCard({
  to,
  onClick,
  badgeIcon: BadgeIcon,
  title,
  subtitle,
  className,
  bgClassName = 'hero-card',
  badgeClassName = 'bg-accent text-black shadow-glow',
  textClassName,
  emBreve = false,
}) {
  const base = cn(
    bgClassName,
    'reveal flex min-h-[150px] flex-col justify-between rounded-card p-4',
    className,
  )

  const conteudo = (
    <>
      <span
        className={cn(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
          badgeClassName,
        )}
      >
        <BadgeIcon size={30} strokeWidth={2} />
      </span>
      <div className="mt-4 min-w-0">
        <div className={cn('font-display text-base font-bold leading-tight', textClassName)}>
          {title}
        </div>
        <div
          className={cn('mt-1 text-xs leading-snug', textClassName ? 'text-white/70' : 'text-muted')}
        >
          {subtitle}
        </div>
      </div>
    </>
  )

  if (emBreve) {
    return (
      <div className={cn(base, 'relative opacity-60')} aria-disabled="true">
        <span className="absolute right-3 top-3 rounded-pill bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-muted">
          Em breve
        </span>
        {conteudo}
      </div>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, 'tap w-full text-left')}>
        {conteudo}
      </button>
    )
  }

  return (
    <Link to={to} className={cn(base, 'tap')}>
      {conteudo}
    </Link>
  )
}

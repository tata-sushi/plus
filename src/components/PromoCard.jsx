import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

// Tile do grid "TATÁ PLUS" (2 colunas): ícone maior no topo e nome + descrição
// embaixo. Cantos suaves (8px) pra um visual um pouco mais retangular.
export function PromoCard({
  to,
  badgeIcon: BadgeIcon,
  title,
  subtitle,
  className,
  bgClassName = 'hero-card',
  badgeClassName = 'bg-accent text-black shadow-glow',
  textClassName,
}) {
  return (
    <Link
      to={to}
      className={cn(
        bgClassName,
        'reveal tap flex min-h-[150px] flex-col justify-between !rounded-lg p-4',
        className,
      )}
    >
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
    </Link>
  )
}

import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

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
      className={cn(bgClassName, 'reveal tap flex items-center gap-4 rounded-card p-4', className)}
    >
      <span
        className={cn(
          'flex h-16 w-16 shrink-0 items-center justify-center rounded-full',
          badgeClassName,
        )}
      >
        <BadgeIcon size={28} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn('font-display text-lg font-bold leading-tight', textClassName)}>
          {title}
        </div>
        <div className={cn('mt-0.5 text-xs', textClassName ? 'text-white/70' : 'text-muted')}>
          {subtitle}
        </div>
      </div>
    </Link>
  )
}

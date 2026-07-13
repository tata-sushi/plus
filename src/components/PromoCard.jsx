import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

export function PromoCard({ to, badgeIcon: BadgeIcon, title, subtitle, decor: Decor, className }) {
  return (
    <Link to={to} className={cn('hero-card reveal tap flex items-center gap-4 p-4', className)}>
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-black shadow-glow">
        <BadgeIcon size={28} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-bold leading-tight">{title}</div>
        <div className="mt-0.5 text-xs text-muted">{subtitle}</div>
      </div>
      <span className="hidden h-14 w-px shrink-0 bg-accent/40 min-[360px]:block" />
      <Decor className="hidden shrink-0 text-white/85 min-[360px]:block" />
    </Link>
  )
}

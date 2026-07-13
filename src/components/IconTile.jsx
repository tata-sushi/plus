import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'
import { resolveIcon } from '../lib/icons.js'

export function IconTile({ label, icon, to, onClick, className, variant = 'dark' }) {
  const Icon = resolveIcon(icon)
  const isLight = variant === 'light'
  const content = (
    <div
      className={cn(
        'icon-tile',
        isLight && '!border-black/10 !bg-white !text-black',
        className,
      )}
    >
      <span
        className={cn(
          'icon-wrap',
          isLight && '!bg-black/5 !text-black',
        )}
      >
        <Icon size={22} strokeWidth={2.2} />
      </span>
      <span className="text-[12px] font-semibold leading-tight">{label}</span>
    </div>
  )
  if (to) return <Link to={to}>{content}</Link>
  if (onClick) return <button className="text-left" onClick={onClick}>{content}</button>
  return content
}

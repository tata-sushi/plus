import { cn } from '../lib/cn'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export function Avatar({ name, size = 40, className }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-accent text-black font-semibold',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  )
}

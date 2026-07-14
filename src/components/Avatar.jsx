import { useState } from 'react'
import { cn } from '../lib/cn'

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function Avatar({ name, src, size = 40, className }) {
  const [erro, setErro] = useState(false)
  const mostrarFoto = src && !erro

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-black',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {mostrarFoto ? (
        <img
          src={src}
          alt={name || ''}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setErro(true)}
        />
      ) : (
        initials(name)
      )}
    </div>
  )
}

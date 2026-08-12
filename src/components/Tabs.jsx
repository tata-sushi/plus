import { useState } from 'react'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

export function Tabs({ tabs, value, onChange, defaultValue, className }) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value)
  const active = value ?? internal

  const select = (v) => {
    tapHaptic()
    setInternal(v)
    onChange?.(v)
  }

  return (
    // Rola quando os tabs passam da largura (ex.: rótulos longos), mas continua
    // centralizado quando cabe — w-max + mx-auto: sem cortar as pontas.
    <div className={cn('overflow-x-auto no-scrollbar', className)}>
      <div className="mx-auto flex w-max items-center gap-2 px-5 pb-3">
        {tabs.map((t) => {
          const isActive = t.value === active
          return (
            <button
              key={t.value}
              onClick={() => select(t.value)}
              className={cn(
                'pill tap whitespace-nowrap',
                isActive ? 'bg-accent text-black' : 'bg-fill text-muted',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

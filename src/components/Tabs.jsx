import { useState } from 'react'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

export function Tabs({ tabs, value, onChange, defaultValue }) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value)
  const active = value ?? internal

  const select = (v) => {
    tapHaptic()
    setInternal(v)
    onChange?.(v)
  }

  return (
    <div className="px-5">
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-3 no-scrollbar">
        {tabs.map((t) => {
          const isActive = t.value === active
          return (
            <button
              key={t.value}
              onClick={() => select(t.value)}
              className={cn(
                'pill tap whitespace-nowrap',
                isActive ? 'bg-accent text-black' : 'bg-white/5 text-muted',
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

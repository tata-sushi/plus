import { useState } from 'react'
import { cn } from '../lib/cn'

export function Tabs({ tabs, defaultValue }) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value)
  return (
    <div className="px-5">
      <div className="hstack gap-2 overflow-x-auto pb-3 no-scrollbar">
        {tabs.map((t) => {
          const isActive = t.value === active
          return (
            <button
              key={t.value}
              onClick={() => setActive(t.value)}
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

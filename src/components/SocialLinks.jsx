import { Instagram, Youtube, Linkedin } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

const ICONS = { instagram: Instagram, youtube: Youtube, linkedin: Linkedin }

export function SocialLinks({ items }) {
  return (
    <div className="flex gap-3">
      {items.map((s) => {
        const Icon = ICONS[s.id] ?? Instagram
        return (
          <a
            key={s.id}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={tapHaptic}
            aria-label={s.label}
            className="grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-2 text-accent tap"
          >
            <Icon size={20} />
          </a>
        )
      })}
    </div>
  )
}

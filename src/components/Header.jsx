import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Header({ title, right }) {
  return (
    <header className="safe-top sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-white/5">
      <div className="flex items-center justify-between px-5 py-3">
        <Link to="/" className="hstack gap-2">
          <span className="font-display text-lg font-bold tracking-tight">
            TATÁ<span className="text-accent"> PLUS</span>
          </span>
        </Link>
        <div className="hstack gap-2">
          {right}
          <button
            className="relative grid h-9 w-9 place-items-center rounded-full bg-surface tap"
            aria-label="Notificações"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-bg" />
          </button>
        </div>
      </div>
      {title && (
        <div className="px-5 pb-3">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
        </div>
      )}
    </header>
  )
}

import { Link } from 'react-router-dom'

export function Header({ title, right }) {
  return (
    <header className="safe-top sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-white/5">
      <div className="flex items-center justify-between px-5 py-3">
        <Link to="/" className="hstack gap-2">
          <img
            src="/icons/icon-192.png"
            alt="Tatá"
            className="h-8 w-8 rounded-lg"
            width={32}
            height={32}
          />
          <span className="font-display text-lg font-bold tracking-tight">
            TATÁ<span className="text-accent"> PLUS</span>
            <span className="ml-1 align-baseline text-[10px] font-semibold text-muted">2.0</span>
          </span>
        </Link>
        {right && <div className="hstack gap-2">{right}</div>}
      </div>
      {title && (
        <div className="px-5 pb-3">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
        </div>
      )}
    </header>
  )
}

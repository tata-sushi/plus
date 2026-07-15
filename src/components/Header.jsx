import { Link } from 'react-router-dom'
import { Notificacoes } from './Notificacoes.jsx'

export function Header({ right }) {
  return (
    <header className="safe-top sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
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
        <div className="hstack gap-2">
          {right}
          <Notificacoes />
        </div>
      </div>
    </header>
  )
}

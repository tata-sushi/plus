import { Link } from 'react-router-dom'
import { Notificacoes } from './Notificacoes.jsx'

export function Header({ right }) {
  return (
    <header className="safe-top sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
      <div className="flex items-center justify-between px-5 py-3">
        <Link to="/" className="hstack gap-2">
          <img
            src="/icons/logo-mark.png"
            alt="Tatá"
            className="h-9 w-auto"
            width={114}
            height={128}
          />
          <span className="font-display text-[16px] font-semibold tracking-tight">
            TATÁ<span className="text-accent"> PLUS</span>
            <span className="ml-1 align-baseline text-[10px] font-medium text-muted">2.0</span>
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

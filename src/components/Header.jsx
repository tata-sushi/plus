import { Link } from 'react-router-dom'
import { Notificacoes } from './Notificacoes.jsx'
import { useDesktop } from '../lib/useDesktop.js'
import { useAuth } from '../lib/AuthContext.jsx'

export function Header({ right }) {
  // No desktop a marca some do header: quem não tem Governança já vê o logo
  // grande na área central e o portal (para quem tem) já traz o próprio logo —
  // então dois logos lado a lado ficariam redundantes. Fica só o sino.
  const desktop = useDesktop()
  const { usuario } = useAuth()
  // Selo "10 anos" no logo — em teste só na minha conta (matrícula 7).
  const ehDev = usuario?.matricula === '7'
  return (
    <header className="safe-top sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
      <div className={`flex items-center px-5 py-3 ${desktop ? 'justify-end' : 'justify-between'}`}>
        {!desktop && (
          <Link to="/" className="hstack gap-2">
            {/* Logo por contraste: marca clara (verde vivo) no escuro,
                marca fechada (verde escuro) no claro. */}
            <span className="relative inline-flex shrink-0">
              <img
                src="/icons/logo-mark.png"
                alt="Tatá"
                className="logo-dark h-9 w-auto"
                width={114}
                height={128}
              />
              <img
                src="/icons/logo-mark-light.png"
                alt="Tatá"
                className="logo-light h-9 w-auto"
                width={114}
                height={128}
              />
              {ehDev && (
                <span className="selo-10anos" aria-hidden="true">
                  10
                </span>
              )}
            </span>
            <span className="font-display text-[16px] font-semibold tracking-tight">
              TATÁ<span className="text-accent"> PLUS</span>
              <span className="ml-1 align-baseline text-[10px] font-medium text-muted">2.0</span>
            </span>
          </Link>
        )}
        <div className="hstack gap-2">
          {right}
          <Notificacoes />
        </div>
      </div>
    </header>
  )
}

import { NavLink } from 'react-router-dom'
import { Home, Trophy, UsersRound, Ear, Menu, ShieldCheck } from 'lucide-react'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'

export function BottomNav() {
  const { usuario } = useAuth()
  // slot 4 reveza: quem tem acesso ao portal de Governança vê Governança;
  // quem não tem vê Ouvidoria no lugar (a Ouvidoria fica no menu "Mais" p/ quem vê Governança).
  const slotCanal = usuario?.governanca?.tem
    ? { to: '/governanca', label: 'Governança', Icon: ShieldCheck }
    : { to: '/ouvidoria', label: 'Ouvidoria', Icon: Ear }
  const items = [
    { to: '/', label: 'Início', Icon: Home, end: true },
    { to: '/ranking', label: 'Ranking', Icon: Trophy },
    { to: '/comunidade', label: 'Feed', Icon: UsersRound },
    slotCanal,
    { to: '/mais', label: 'Mais', Icon: Menu },
  ]
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur"
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, Icon, end }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end={end}
              onClick={tapHaptic}
              className={({ isActive }) =>
                cn(
                  'relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 py-2.5 text-[9px] font-medium tap',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 h-0.5 w-6 rounded-pill bg-accent shadow-glow" />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

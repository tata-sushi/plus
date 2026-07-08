import { NavLink } from 'react-router-dom'
import { Home, Megaphone, GraduationCap, ClipboardList, Menu } from 'lucide-react'
import { cn } from '../lib/cn'

const items = [
  { to: '/', label: 'Início', Icon: Home, end: true },
  { to: '/comunicados', label: 'Comunicados', Icon: Megaphone },
  { to: '/treinamentos', label: 'Treinamentos', Icon: GraduationCap },
  { to: '/procedimentos', label: 'Procedimentos', Icon: ClipboardList },
  { to: '/mais', label: 'Mais', Icon: Menu },
]

export function BottomNav() {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-bg/95 backdrop-blur"
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium tap',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { NavLink } from 'react-router-dom'
import { Home, Trophy, Megaphone, Ear, UtensilsCrossed, Menu } from 'lucide-react'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

const items = [
  { to: '/', label: 'Início', Icon: Home, end: true },
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
  { to: '/comunicados', label: 'Comunicados', Icon: Megaphone },
  { href: 'https://ouvidoria.tatasushi.tech/', label: 'Ouvidoria', Icon: Ear },
  { to: '/cardapio', label: 'Cardápio', Icon: UtensilsCrossed },
  { to: '/mais', label: 'Mais', Icon: Menu },
]

const itemBase =
  'relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 py-2.5 text-[9px] font-medium tap'

function ItemInner({ Icon, label, isActive }) {
  return (
    <>
      {isActive && <span className="absolute top-0 h-0.5 w-6 rounded-pill bg-accent shadow-glow" />}
      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
      <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
    </>
  )
}

export function BottomNav() {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-bg/95 backdrop-blur"
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-6">
        {items.map(({ to, href, label, Icon, end }) => (
          <li key={to ?? href} className="min-w-0">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={tapHaptic}
                className={cn(itemBase, 'text-muted')}
              >
                <ItemInner Icon={Icon} label={label} isActive={false} />
              </a>
            ) : (
              <NavLink
                to={to}
                end={end}
                onClick={tapHaptic}
                className={({ isActive }) => cn(itemBase, isActive ? 'text-accent' : 'text-muted')}
              >
                {({ isActive }) => <ItemInner Icon={Icon} label={label} isActive={isActive} />}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { NavLink, useLocation } from 'react-router-dom'
import { Home, Trophy, Newspaper, Ear, Menu, ShieldCheck, KanbanSquare, CircleAlert, Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { podeVerDestaques } from '../lib/beta.js'

// flow: renderiza a barra em fluxo (dentro de uma coluna flex) em vez de fixa —
// usado na Governança, onde o iframe ocupa o espaço acima da barra.
export function BottomNav({ flow = false }) {
  const { usuario } = useAuth()
  // slot 2 reveza, por prioridade:
  //  1) quem tem Kanban → Kanban (as pendências aparecem no topo do próprio
  //     quadro, igual ao desktop; o ícone não muda);
  //  2) quem NÃO tem Kanban mas tem pendências → Pendências (única porta de
  //     entrada dessa pessoa; some e volta o Ranking quando zera);
  //  3) senão → Ranking.
  // (Ranking/Kanban deslocados ficam sempre acessíveis pelo menu "Mais".)
  const slotRanking = usuario?.podeQuadros
    ? { to: '/quadros', label: 'Kanban', Icon: KanbanSquare }
    : (usuario?.pendencias ?? 0) > 0
      ? { to: '/pendencias', label: 'Pendências', Icon: CircleAlert }
      : { to: '/ranking', label: 'Ranking', Icon: Trophy }
  // slot 4 reveza: quem tem acesso ao portal de Governança vê Governança;
  // quem não tem vê Ouvidoria no lugar (a Ouvidoria fica no menu "Mais" p/ quem vê Governança).
  const slotCanal = usuario?.governanca?.tem
    ? { to: '/governanca', label: 'Governança', Icon: ShieldCheck }
    : { to: '/ouvidoria', label: 'Ouvidoria', Icon: Ear }
  const items = [
    { to: '/', label: 'Início', Icon: Home, end: true },
    slotRanking,
    { to: '/comunidade', label: 'Feed', Icon: Newspaper },
    slotCanal,
    { to: '/mais', label: 'Mais', Icon: Menu },
  ]
  // No feed (e só em teste), o slot "Feed" vira "Compartilhar" (＋): dispara o
  // compositor no lugar de navegar. Fora do feed, volta a ser "Feed".
  const location = useLocation()
  const feedComoCompor = podeVerDestaques(usuario) && location.pathname === '/comunidade'
  return (
    <nav
      className={cn(
        'safe-bottom z-30 border-t border-line bg-bg/95 backdrop-blur',
        flow ? 'shrink-0' : 'fixed inset-x-0 bottom-0',
      )}
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, Icon, end }) => {
          // Slot "Feed" vira botão "＋ Compartilhar" quando já se está no feed (teste).
          if (to === '/comunidade' && feedComoCompor) {
            return (
              <li key={to} className="min-w-0">
                <button
                  onClick={() => {
                    tapHaptic()
                    window.dispatchEvent(new CustomEvent('abrir-compositor'))
                  }}
                  className="relative flex w-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 py-2.5 text-[9px] font-medium text-accent tap"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-black">
                    <Plus size={16} />
                  </span>
                  <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    Compartilhar
                  </span>
                </button>
              </li>
            )
          }
          return (
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
                    <span className="grid h-7 place-items-center">
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={cn('shrink-0', !isActive && 'text-carbon')}
                      />
                    </span>
                    <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

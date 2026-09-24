import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Trophy, Newspaper, Ear, Menu, ShieldCheck, KanbanSquare, CircleAlert } from 'lucide-react'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { useMenuLateral } from '../lib/menuLateral.jsx'

// flow: renderiza a barra em fluxo (dentro de uma coluna flex) em vez de fixa —
// usado na Governança, onde o iframe ocupa o espaço acima da barra.
export function BottomNav({ flow = false }) {
  const { usuario } = useAuth()
  const { aberto, alternar, fechar } = useMenuLateral()
  const navRef = useRef(null)

  // Publica a altura da barra numa CSS var (--tp-nav-h) pra o menu lateral
  // encaixar ACIMA dela, sem cobrir a navegação inferior.
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const set = () =>
      document.documentElement.style.setProperty('--tp-nav-h', el.offsetHeight + 'px')
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
  // slot 4 reveza: quem tem acesso à Governança abre AQUI o menu de navegação
  // lateral (drawer) — sem sair da tela nem abrir o portal de cara; quem não tem
  // vê Ouvidoria no lugar (a Ouvidoria fica no menu "Mais" p/ quem vê Governança).
  const slotCanal = usuario?.governanca?.tem
    ? { acao: 'menu', label: 'Governança', Icon: ShieldCheck }
    : { to: '/ouvidoria', label: 'Ouvidoria', Icon: Ear }
  const items = [
    { to: '/', label: 'Início', Icon: Home, end: true },
    slotRanking,
    { to: '/comunidade', label: 'Feed', Icon: Newspaper },
    slotCanal,
    { to: '/mais', label: 'Mais', Icon: Menu },
  ]

  const base =
    'relative flex w-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 py-2.5 text-[9px] font-medium tap'

  const miolo = (ativo, Icon, label) => (
    <>
      {ativo && <span className="absolute top-0 h-0.5 w-6 rounded-pill bg-accent shadow-glow" />}
      <span className="grid h-7 place-items-center">
        <Icon size={20} strokeWidth={ativo ? 2.5 : 2} className={cn('shrink-0', !ativo && 'text-carbon')} />
      </span>
      <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
    </>
  )

  return (
    <nav
      ref={navRef}
      className={cn(
        'safe-bottom z-30 border-t border-line bg-bg/95 backdrop-blur',
        flow ? 'shrink-0' : 'fixed inset-x-0 bottom-0',
      )}
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const { to, label, Icon, end, acao } = item
          // Slot que abre o menu lateral (Governança): botão, destaca enquanto aberto.
          if (acao === 'menu') {
            return (
              <li key="menu-lateral" className="min-w-0">
                <button
                  onClick={() => {
                    tapHaptic()
                    alternar()
                  }}
                  aria-label={label}
                  aria-expanded={aberto}
                  className={cn(base, aberto ? 'text-accent' : 'text-muted')}
                >
                  {miolo(aberto, Icon, label)}
                </button>
              </li>
            )
          }
          // Enquanto o drawer está aberto, nenhum link mostra "ativo" (só o slot
          // da Governança fica destacado).
          return (
            <li key={to} className="min-w-0">
              <NavLink
                to={to}
                end={end}
                onClick={() => {
                  tapHaptic()
                  fechar()
                }}
                className={({ isActive }) => cn(base, isActive && !aberto ? 'text-accent' : 'text-muted')}
              >
                {({ isActive }) => miolo(isActive && !aberto, Icon, label)}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

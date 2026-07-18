import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Home,
  Trophy,
  Newspaper,
  Gift,
  Ear,
  Menu,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Network,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'

// Portais que ocupam a área principal (só para quem tem Governança).
const CANVAS = {
  portal: 'https://lideres.tatasushi.tech/compliance/index2.html',
  organograma: 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html',
}

// Shell de desktop: navegação dupla.
// [ rail ] [ painel do app (retrátil) ] [ área principal: portal/organograma ou logo ]
export function DesktopShell() {
  const location = useLocation()
  const { usuario } = useAuth()
  const gov = !!usuario?.governanca?.tem
  const podePublicar = !!usuario?.podePublicar

  const [aberto, setAberto] = useState(
    () => localStorage.getItem('tp_painel') !== '0',
  )
  const [canvas, setCanvas] = useState('portal')

  function alternarPainel() {
    setAberto((v) => {
      localStorage.setItem('tp_painel', v ? '0' : '1')
      return !v
    })
  }

  const itens = [
    { to: '/', label: 'Início', Icon: Home, end: true },
    { to: '/ranking', label: 'Ranking', Icon: Trophy },
    { to: '/comunidade', label: 'Feed', Icon: Newspaper },
    { to: '/recompensas', label: 'Recompensas', Icon: Gift },
    ...(gov ? [] : [{ to: '/ouvidoria', label: 'Ouvidoria', Icon: Ear }]),
    { to: '/mais', label: 'Mais', Icon: Menu },
    ...(podePublicar ? [{ to: '/admin', label: 'Admin', Icon: ShieldCheck }] : []),
  ]

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg">
      {/* Rail de navegação */}
      <nav
        className="flex w-[96px] shrink-0 flex-col items-center gap-1 border-r border-line bg-bg py-4"
        aria-label="Navegação principal"
      >
        <img
          src="/icons/icon-192.png"
          alt="Tatá Plus"
          className="mb-3 h-10 w-10 rounded-xl"
          width={40}
          height={40}
        />
        <div className="flex flex-1 flex-col items-center gap-1">
          {itens.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => !aberto && setAberto(true)}
              className={({ isActive }) =>
                cn(
                  'flex w-[80px] flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold tap',
                  isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} className={cn(!isActive && 'text-carbon')} />
                  <span className="w-full text-center leading-tight">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <button
          onClick={alternarPainel}
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl text-muted tap hover:text-text"
          aria-label={aberto ? 'Recolher painel' : 'Expandir painel'}
          title={aberto ? 'Recolher painel' : 'Expandir painel'}
        >
          {aberto ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </nav>

      {/* Painel do app (retrátil) — o conteúdo fica montado para preservar estado */}
      <div
        className={cn(
          'shrink-0 overflow-y-auto bg-bg transition-[width] duration-200 ease-out',
          aberto ? 'w-[340px] border-r border-line lg:w-[400px]' : 'w-0',
        )}
      >
        <div className="w-[340px] lg:w-[400px]">
          <main key={location.pathname} className="animate-page pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Área principal */}
      <section className="relative flex flex-1 flex-col bg-bg">
        {gov ? (
          <>
            <div className="flex shrink-0 items-center gap-1.5 border-b border-line bg-bg px-3 py-2">
              {[
                { id: 'portal', label: 'Portal', Icon: ShieldCheck },
                { id: 'organograma', label: 'Organograma', Icon: Network },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setCanvas(id)}
                  className={cn(
                    'hstack gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold tap',
                    canvas === id ? 'bg-accent text-black' : 'bg-fill text-muted hover:text-text',
                  )}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 bg-white">
              <iframe
                src={CANVAS.portal}
                title="Portal de Governança"
                className={cn('absolute inset-0 h-full w-full border-0 bg-white', canvas !== 'portal' && 'hidden')}
                allow="clipboard-write; camera; microphone; geolocation; fullscreen"
              />
              <iframe
                src={CANVAS.organograma}
                title="Organograma"
                className={cn('absolute inset-0 h-full w-full border-0 bg-white', canvas !== 'organograma' && 'hidden')}
                allow="clipboard-write; fullscreen"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <img src="/icons/logo-mark.png" alt="Tatá Plus" className="logo-dark h-24 w-auto opacity-90" />
            <img src="/icons/logo-mark-light.png" alt="Tatá Plus" className="logo-light h-24 w-auto opacity-90" />
            <div>
              <div className="font-display text-3xl font-bold tracking-tight">
                TATÁ<span className="text-accent"> PLUS</span>
              </div>
              <div className="mt-1 text-sm text-muted">Portal do colaborador</div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

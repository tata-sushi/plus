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
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'
import { DesktopCanvasContext } from '../lib/desktopCanvas.js'

// Páginas que ocupam a área principal (só para quem tem Governança).
const CANVAS = {
  portal: 'https://lideres.tatasushi.tech/compliance/index2.html',
  organograma: 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html',
}

// Shell de desktop: navegação dupla.
// [ rail de ícones ] [ painel do app (retrátil) ] [ área principal ]
// Área principal: portal (padrão, p/ Governança) ou organograma (aberto pelo
// atalho da Home); para quem não tem Governança, o logo grande do Tatá.
export function DesktopShell() {
  const location = useLocation()
  const { usuario } = useAuth()
  const gov = !!usuario?.governanca?.tem
  const podePublicar = !!usuario?.podePublicar

  const [aberto, setAberto] = useState(() => localStorage.getItem('tp_painel') !== '0')
  // null = padrão (portal p/ gov, logo p/ demais); 'organograma' = organograma
  const [canvas, setCanvas] = useState(null)

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

  const railBtn = 'grid h-11 w-11 place-items-center rounded-2xl tap'

  return (
    <DesktopCanvasContext.Provider value={{ canvas, setCanvas }}>
      <div className="flex h-[100dvh] overflow-hidden bg-bg">
        {/* Rail de navegação — só ícones */}
        <nav
          className="flex w-[56px] shrink-0 flex-col items-center gap-1.5 border-r border-line bg-bg py-3"
          aria-label="Navegação principal"
        >
          <div className="flex flex-1 flex-col items-center gap-1.5">
            {itens.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                aria-label={label}
                onClick={() => !aberto && setAberto(true)}
                className={({ isActive }) =>
                  cn(railBtn, isActive ? 'bg-accent-soft text-accent' : 'text-carbon hover:text-text')
                }
              >
                {({ isActive }) => <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />}
              </NavLink>
            ))}

            {/* Portal — controla a área principal (só p/ Governança) */}
            {gov && (
              <>
                <span className="my-1 h-px w-6 bg-line" />
                <button
                  onClick={() => setCanvas(null)}
                  title="Portal"
                  aria-label="Portal de Governança"
                  className={cn(
                    railBtn,
                    canvas !== 'organograma' ? 'bg-accent-soft text-accent' : 'text-carbon hover:text-text',
                  )}
                >
                  <LayoutDashboard size={21} strokeWidth={canvas !== 'organograma' ? 2.4 : 2} />
                </button>
              </>
            )}
          </div>

          <button
            onClick={alternarPainel}
            className={cn(railBtn, 'text-carbon hover:text-text')}
            aria-label={aberto ? 'Recolher painel' : 'Expandir painel'}
            title={aberto ? 'Recolher painel' : 'Expandir painel'}
          >
            {aberto ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
        </nav>

        {/* Painel do app (retrátil) — conteúdo montado para preservar estado */}
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
          {/* Portal — fica montado (p/ gov) e some quando o organograma abre */}
          {gov && (
            <iframe
              src={CANVAS.portal}
              title="Portal de Governança"
              className={cn(
                'absolute inset-0 h-full w-full border-0 bg-white',
                canvas === 'organograma' && 'hidden',
              )}
              allow="clipboard-write; camera; microphone; geolocation; fullscreen"
            />
          )}

          {/* Organograma — aberto pelo atalho da Home, dentro do app */}
          {canvas === 'organograma' && (
            <>
              <iframe
                src={CANVAS.organograma}
                title="Organograma"
                className="absolute inset-0 h-full w-full border-0 bg-white"
                allow="clipboard-write; fullscreen"
              />
              <button
                onClick={() => setCanvas(null)}
                className="absolute left-3 top-3 z-10 hstack gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold text-white tap"
                style={{ background: '#35383F', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}
              >
                <ArrowLeft size={14} color="#CFFF00" /> Voltar
              </button>
            </>
          )}

          {/* Sem Governança e sem organograma: logo grande */}
          {!gov && canvas !== 'organograma' && (
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
    </DesktopCanvasContext.Provider>
  )
}

import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Home,
  Trophy,
  Newspaper,
  Ear,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'
import { DesktopCanvasContext } from '../lib/desktopCanvas.js'
import { Ouvidoria } from '../routes/Ouvidoria.jsx'
import { AdminRecompensas } from '../routes/AdminRecompensas.jsx'

// Páginas que ocupam a área principal (só para quem tem Governança).
const CANVAS = {
  portal: 'https://lideres.tatasushi.tech/compliance/index2.html',
  organograma: 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html',
}

// Shell de desktop: navegação dupla.
// [ rail de ícones ] [ painel do app (retrátil) ] [ área principal ]
// Rail = itens da barra de baixo do app. Área principal: portal (padrão, p/
// Governança) ou logo grande; e, por cima, o que for aberto no centro
// (organograma pela Home, Ouvidoria e Admin pelo Mais/rail).
export function DesktopShell() {
  const location = useLocation()
  const { usuario } = useAuth()
  const gov = !!usuario?.governanca?.tem

  const [aberto, setAberto] = useState(() => localStorage.getItem('tp_painel') !== '0')
  // null = padrão (portal p/ gov, logo p/ demais); senão 'organograma' | 'ouvidoria' | 'admin'
  const [canvas, setCanvas] = useState(null)
  // Nó da área central — páginas de conteúdo (ex.: desafio aberto) podem abrir
  // aqui via portal, em vez de tomar a tela toda.
  const [canvasEl, setCanvasEl] = useState(null)

  function alternarPainel() {
    setAberto((v) => {
      localStorage.setItem('tp_painel', v ? '0' : '1')
      return !v
    })
  }

  // Espelha a barra de baixo do app. Quem não tem Governança abre a Ouvidoria no
  // centro (canvasKey); os demais itens navegam no painel.
  const itens = [
    { to: '/', label: 'Início', Icon: Home, end: true },
    { to: '/ranking', label: 'Ranking', Icon: Trophy },
    { to: '/comunidade', label: 'Feed', Icon: Newspaper },
    ...(gov ? [] : [{ canvasKey: 'ouvidoria', label: 'Ouvidoria', Icon: Ear }]),
    { to: '/mais', label: 'Mais', Icon: Menu },
  ]

  const railBtn = 'grid h-11 w-11 place-items-center rounded-2xl tap'

  return (
    <DesktopCanvasContext.Provider value={{ canvas, setCanvas, canvasEl }}>
      <div className="flex h-[100dvh] overflow-hidden bg-bg">
        {/* Rail de navegação — só ícones */}
        <nav
          className="flex w-[56px] shrink-0 flex-col items-center gap-1.5 border-r border-line bg-bg py-3"
          aria-label="Navegação principal"
        >
          {/* Recolher/expandir o painel — no topo */}
          <button
            onClick={alternarPainel}
            className={cn(railBtn, 'text-carbon hover:text-text')}
            aria-label={aberto ? 'Recolher painel' : 'Expandir painel'}
            title={aberto ? 'Recolher painel' : 'Expandir painel'}
          >
            {aberto ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <span className="my-0.5 h-px w-6 bg-line" />

          <div className="flex flex-1 flex-col items-center gap-1.5">
            {itens.map((it) => {
              const Icon = it.Icon
              if (it.canvasKey) {
                const ativo = canvas === it.canvasKey
                return (
                  <button
                    key={it.canvasKey}
                    onClick={() => setCanvas(it.canvasKey)}
                    title={it.label}
                    aria-label={it.label}
                    className={cn(railBtn, ativo ? 'bg-accent-soft text-accent' : 'text-carbon hover:text-text')}
                  >
                    <Icon size={21} strokeWidth={ativo ? 2.4 : 2} />
                  </button>
                )
              }
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  title={it.label}
                  aria-label={it.label}
                  onClick={() => !aberto && setAberto(true)}
                  className={({ isActive }) =>
                    cn(railBtn, isActive ? 'bg-accent-soft text-accent' : 'text-carbon hover:text-text')
                  }
                >
                  {({ isActive }) => <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />}
                </NavLink>
              )
            })}
          </div>
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
        <section ref={setCanvasEl} className="relative flex flex-1 flex-col bg-bg">
          {/* Base: portal (gov) ou logo grande (demais) */}
          {gov ? (
            <iframe
              src={CANVAS.portal}
              title="Portal de Governança"
              className="absolute inset-0 h-full w-full border-0 bg-white"
              allow="clipboard-write; camera; microphone; geolocation; fullscreen"
            />
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

          {/* Aberto no centro por cima: organograma / ouvidoria / admin */}
          {canvas && (
            <div className="absolute inset-0 z-20 flex flex-col bg-bg">
              <div className="flex shrink-0 items-center border-b border-line px-3 py-2">
                <button
                  onClick={() => setCanvas(null)}
                  className="hstack gap-1.5 rounded-full bg-surface px-3.5 py-2 text-xs font-semibold tap"
                >
                  <ArrowLeft size={15} /> Voltar
                </button>
              </div>
              <div className="min-h-0 flex-1">
                {canvas === 'organograma' && (
                  <iframe
                    src={CANVAS.organograma}
                    title="Organograma"
                    className="h-full w-full border-0 bg-white"
                    allow="clipboard-write; fullscreen"
                  />
                )}
                {canvas === 'ouvidoria' && (
                  <div className="h-full overflow-y-auto">
                    <Ouvidoria />
                  </div>
                )}
                {canvas === 'admin' && (
                  <div className="h-full overflow-y-auto">
                    <AdminRecompensas />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </DesktopCanvasContext.Provider>
  )
}

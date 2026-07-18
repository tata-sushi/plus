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

// Páginas que ocupam a área principal (só para quem tem Governança).
const CANVAS = {
  portal: 'https://lideres.tatasushi.tech/compliance/index2.html',
  organograma: 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html',
}

// Shell de desktop: navegação dupla.
// [ rail de ícones ] [ painel do app (retrátil) ] [ área principal ]
// Rail = mesmos itens da barra de baixo do app (Início, Ranking, Feed,
// Portal/Ouvidoria, Mais). Recompensas e Admin ficam nos lugares de sempre
// (Home e dentro do Mais). Área principal: portal (padrão, p/ Governança) ou
// organograma (aberto pelo atalho da Home); para os demais, o logo grande.
export function DesktopShell() {
  const location = useLocation()
  const { usuario } = useAuth()
  const gov = !!usuario?.governanca?.tem

  const [aberto, setAberto] = useState(() => localStorage.getItem('tp_painel') !== '0')
  // null = padrão (portal p/ gov, logo p/ demais); 'organograma' = organograma
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

  // Espelha a barra de baixo do app. Para quem tem Governança o portal já é o
  // padrão da área principal (e o "Voltar" do organograma retorna a ele), então
  // não há botão de portal no rail. Quem não tem Governança vê a Ouvidoria.
  const itens = [
    { to: '/', label: 'Início', Icon: Home, end: true },
    { to: '/ranking', label: 'Ranking', Icon: Trophy },
    { to: '/comunidade', label: 'Feed', Icon: Newspaper },
    ...(gov ? [] : [{ to: '/ouvidoria', label: 'Ouvidoria', Icon: Ear }]),
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

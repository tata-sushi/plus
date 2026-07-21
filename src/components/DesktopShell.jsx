import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Home,
  Trophy,
  Newspaper,
  Ear,
  Menu,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'
import { DesktopCanvasContext } from '../lib/desktopCanvas.js'
import { resolveIcon } from '../lib/icons.js'
import { Ouvidoria } from '../routes/Ouvidoria.jsx'
import { AdminRecompensas } from '../routes/AdminRecompensas.jsx'
import { GovFrame } from './GovFrame.jsx'

// Páginas que ocupam a área principal (só para quem tem Governança).
const CANVAS = {
  portal: 'https://lideres.tatasushi.tech/compliance/',
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
  const primeiroNome = usuario?.primeiroNome || (usuario?.nome || '').trim().split(/\s+/)[0] || ''

  const [aberto, setAberto] = useState(() => localStorage.getItem('tp_painel') !== '0')
  // null = padrão (portal p/ gov, logo p/ demais); senão 'organograma' | 'ouvidoria' | 'admin'
  const [canvas, setCanvas] = useState(null)
  // Nó da área central — páginas de conteúdo (ex.: desafio aberto) podem abrir
  // aqui via portal, em vez de tomar a tela toda.
  const [canvasEl, setCanvasEl] = useState(null)

  // Abas de governança abertas (estilo navegador): cada atalho aberto vira uma
  // aba mantida VIVA (iframe montado, só escondido) pra alternar sem recarregar.
  const [abas, setAbas] = useState([]) // [{ id, url, titulo, icon }]
  const [abaAtiva, setAbaAtiva] = useState(null) // id | null

  function abrirAba(pagina) {
    setAbas((prev) => (prev.some((a) => a.id === pagina.id) ? prev : [...prev, pagina]))
    setAbaAtiva(pagina.id)
    setCanvas(null) // sai do portal/organograma/etc pra mostrar a aba
  }
  function focarAba(id) {
    setAbaAtiva(id)
    setCanvas(null)
  }
  function fecharAba(id) {
    const restante = abas.filter((a) => a.id !== id)
    setAbas(restante)
    if (abaAtiva === id) setAbaAtiva(restante.length ? restante[restante.length - 1].id : null)
  }

  function alternarPainel() {
    setAberto((v) => {
      localStorage.setItem('tp_painel', v ? '0' : '1')
      return !v
    })
  }

  // Espelha a barra de baixo do app. O 4º slot abre no centro (canvasKey):
  // Governança (portal) para quem tem acesso, ou Ouvidoria para os demais.
  const itens = [
    { to: '/', label: 'Início', Icon: Home, end: true },
    { to: '/ranking', label: 'Ranking', Icon: Trophy },
    { to: '/comunidade', label: 'Feed', Icon: Newspaper },
    gov
      ? { canvasKey: 'portal', label: 'Governança', Icon: ShieldCheck }
      : { canvasKey: 'ouvidoria', label: 'Ouvidoria', Icon: Ear },
    { to: '/mais', label: 'Mais', Icon: Menu },
  ]

  const railBtn = 'grid h-11 w-11 place-items-center rounded-2xl tap'

  return (
    <DesktopCanvasContext.Provider value={{ canvas, setCanvas, canvasEl, abrirAba }}>
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

            {/* Abas de governança abertas — ícone + "x" pra fechar */}
            {abas.length > 0 && <span className="my-0.5 h-px w-6 bg-line" />}
            <div className="flex flex-col items-center gap-1.5 overflow-y-auto">
              {abas.map((aba) => {
                const AbaIcon = resolveIcon(aba.icon)
                const ativa = !canvas && abaAtiva === aba.id
                return (
                  <div key={aba.id} className="group relative">
                    <button
                      onClick={() => focarAba(aba.id)}
                      title={aba.titulo}
                      aria-label={aba.titulo}
                      className={cn(
                        railBtn,
                        ativa ? 'bg-accent-soft text-accent' : 'text-carbon hover:text-text',
                      )}
                    >
                      <AbaIcon size={20} strokeWidth={ativa ? 2.4 : 2} />
                    </button>
                    <button
                      onClick={() => fecharAba(aba.id)}
                      title={`Fechar ${aba.titulo}`}
                      aria-label={`Fechar ${aba.titulo}`}
                      className="absolute -right-0.5 -top-0.5 hidden h-4 w-4 place-items-center rounded-full bg-carbon text-white shadow group-hover:grid hover:bg-danger"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                )
              })}
            </div>
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
          {/* Base (para todos): boas-vindas com o logo grande. Portal, organograma,
              ouvidoria, admin e atalhos abrem por cima. */}
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <img src="/icons/logo-mark.png" alt="Tatá Plus" className="logo-dark h-24 w-auto opacity-90" />
            <img src="/icons/logo-mark-light.png" alt="Tatá Plus" className="logo-light h-24 w-auto opacity-90" />
            <div className="max-w-md">
              <div className="font-display text-3xl font-bold tracking-tight">
                TATÁ<span className="text-accent"> PLUS</span>
              </div>
              <div className="mt-1 text-sm text-muted">Portal do colaborador</div>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
                <p className="text-base font-semibold text-text">
                  Bem-vindo(a){primeiroNome ? `, ${primeiroNome}` : ''}!
                </p>
                <p>Este é o aplicativo do Tatá Sushi.</p>
                <p>
                  Aqui você encontra treinamentos, recompensas, comunicados e ferramentas para o
                  dia a dia, em um único lugar.
                </p>
                <p className="italic text-muted-2">Use o menu lateral para navegação.</p>
              </div>
            </div>
          </div>

          {/* Abas de governança abertas — montadas e mantidas VIVAS; só a ativa
              aparece (e só quando nada especial está aberto por cima). Esconder
              com `hidden` (display:none) preserva o estado do iframe. */}
          {abas.map((aba) => (
            <div
              key={aba.id}
              className={cn(
                'absolute inset-0 z-10 bg-white',
                !canvas && abaAtiva === aba.id ? '' : 'hidden',
              )}
            >
              <GovFrame
                src={aba.url}
                title={aba.titulo}
                allow="clipboard-write; camera; microphone; geolocation; fullscreen"
                className="h-full w-full"
              />
            </div>
          ))}

          {/* Aberto no centro por cima: portal / organograma / ouvidoria / admin /
              atalho de KPI — ocupa a área toda. Trocar de abertura é pelo rail /
              Home / Mais. */}
          {canvas && (
            <div className="absolute inset-0 z-20 bg-bg">
              {canvas === 'portal' && (
                <GovFrame
                  src={CANVAS.portal}
                  title="Portal de Governança"
                  allow="clipboard-write; camera; microphone; geolocation; fullscreen"
                  className="h-full w-full"
                />
              )}
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
              {canvas.tipo === 'painel' && (
                <GovFrame
                  src={canvas.url}
                  title={canvas.titulo || 'Painel'}
                  allow="clipboard-write; fullscreen"
                  className="h-full w-full"
                />
              )}
            </div>
          )}
        </section>
      </div>
    </DesktopCanvasContext.Provider>
  )
}

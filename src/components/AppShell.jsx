import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopShell } from './DesktopShell.jsx'
import { useDesktop } from '../lib/useDesktop.js'
import { estadoPush, ativarPush } from '../lib/push.js'
import { cn } from '../lib/cn'
import { PodcastPlayerProvider } from '../lib/podcastPlayer.jsx'
import { useGovPinBridge } from '../lib/useGovPinBridge.js'

// Rotas em tela cheia, sem a barra de navegação (ex.: organograma em paisagem).
const SEM_NAV = ['/organograma', '/governanca', '/perfil-disc', '/controle-escala']

// Orientação: o app fica travado em RETRATO pelo manifesto do PWA. O organograma
// vai para PAISAGEM por conta própria (tela cheia + orientation.lock — ver
// routes/Organograma.jsx), então aqui não é preciso mexer em orientação.
//
// O conteúdo de cada rota é montado dentro do PodcastPlayerProvider (nível do
// app): assim o player do Podcast CONTINUA tocando ao navegar entre as telas.
export function AppShell() {
  const location = useLocation()
  const desktop = useDesktop()
  // Ponte do botão "alfinete" das páginas do portal (fixar/desafixar atalhos).
  useGovPinBridge()
  // Rotas fixas ficam em tela cheia (sem a barra de navegação).
  const semNav = SEM_NAV.includes(location.pathname)
  // Governança e Controle de Escala embutem o portal com a mesma moldura.
  const ehPortal =
    location.pathname === '/governanca' || location.pathname === '/controle-escala'

  // Primeiro acesso: sobe o pop-up NATIVO de permissão de notificação uma vez.
  // Se a pessoa não ativar aqui, o toggle continua no Painel de manutenção.
  useEffect(() => {
    if (localStorage.getItem('tp_push_ask')) return
    estadoPush().then((e) => {
      if (e.suportado && e.permissao === 'default') {
        localStorage.setItem('tp_push_ask', '1')
        ativarPush()
      }
    })
  }, [])

  let conteudo
  if (ehPortal && !desktop) {
    // Celular no portal (Governança / Controle de Escala): mantém a barra de
    // navegação em fluxo na base; o iframe ocupa o espaço acima dela.
    conteudo = (
      <div className="flex h-[100dvh] flex-col bg-bg">
        <main key={location.pathname} className="animate-page min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
        <BottomNav flow />
      </div>
    )
  } else if (semNav) {
    // Telas cheias (organograma, DISC e a Governança no desktop) ocupam tudo.
    conteudo = (
      <div className="min-h-[100dvh] bg-bg">
        <main key={location.pathname} className={cn('animate-page', ehPortal && 'h-[100dvh]')}>
          <Outlet />
        </main>
      </div>
    )
  } else if (desktop) {
    // Desktop: navegação dupla (painel do app + portal/organograma na área grande).
    conteudo = <DesktopShell />
  } else {
    // Celular: coluna única com a barra de navegação embaixo.
    conteudo = (
      <div className="min-h-[100dvh] bg-bg">
        <main key={location.pathname} className="animate-page pb-24">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    )
  }

  return <PodcastPlayerProvider>{conteudo}</PodcastPlayerProvider>
}

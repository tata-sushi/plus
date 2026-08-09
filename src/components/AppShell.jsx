import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopShell } from './DesktopShell.jsx'
import { RadioPlayerBar } from './RadioPlayerBar.jsx'
import { useDesktop } from '../lib/useDesktop.js'
import { estadoPush, ativarPush } from '../lib/push.js'
import { cn } from '../lib/cn'

// Rotas em tela cheia, sem a barra de navegação (ex.: organograma em paisagem).
const SEM_NAV = ['/organograma', '/governanca', '/perfil-disc']

// Orientação: o app fica travado em RETRATO pelo manifesto do PWA. O organograma
// vai para PAISAGEM por conta própria (tela cheia + orientation.lock — ver
// routes/Organograma.jsx), então aqui não é preciso mexer em orientação.
export function AppShell() {
  const location = useLocation()
  const desktop = useDesktop()
  // Rotas fixas ficam em tela cheia (sem a barra de navegação).
  const semNav = SEM_NAV.includes(location.pathname)
  const ehGov = location.pathname === '/governanca'

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

  // Celular na Governança: mantém a barra de navegação (a barra sumindo
  // atrapalhava a volta). O iframe ocupa todo o espaço acima da barra, que
  // fica em fluxo (não fixa) na base da coluna.
  if (ehGov && !desktop) {
    return (
      <div className="flex h-[100dvh] flex-col bg-bg">
        <main key={location.pathname} className="animate-page min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
        <BottomNav flow />
      </div>
    )
  }

  // Telas cheias (organograma, DISC e a Governança no desktop) ocupam tudo.
  if (semNav) {
    return (
      <div className="min-h-[100dvh] bg-bg">
        <main key={location.pathname} className={cn('animate-page', ehGov && 'h-[100dvh]')}>
          <Outlet />
        </main>
      </div>
    )
  }

  // Desktop: navegação dupla (painel do app + portal/organograma na área grande).
  if (desktop) return <DesktopShell />

  // Celular: coluna única com a barra de navegação embaixo.
  return (
    <div className="min-h-[100dvh] bg-bg">
      <main key={location.pathname} className="animate-page pb-24">
        <Outlet />
      </main>
      <RadioPlayerBar />
      <BottomNav />
    </div>
  )
}

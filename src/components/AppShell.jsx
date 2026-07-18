import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { cn } from '../lib/cn'
import { estadoPush, ativarPush } from '../lib/push.js'

// Rotas em tela cheia, sem a barra de navegação (ex.: organograma em paisagem).
const SEM_NAV = ['/organograma', '/ouvidoria', '/perfil-disc']

// Orientação: o app fica travado em RETRATO pelo manifesto do PWA. O organograma
// vai para PAISAGEM por conta própria (tela cheia + orientation.lock — ver
// routes/Organograma.jsx), então aqui não é preciso mexer em orientação.
export function AppShell() {
  const location = useLocation()
  // Rotas fixas ficam em tela cheia (sem a barra de navegação).
  const semNav = SEM_NAV.includes(location.pathname)

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

  return (
    <div className="min-h-[100dvh] bg-bg">
      <main key={location.pathname} className={cn('animate-page', !semNav && 'pb-24')}>
        <Outlet />
      </main>
      {!semNav && <BottomNav />}
    </div>
  )
}

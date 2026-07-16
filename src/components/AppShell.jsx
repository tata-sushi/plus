import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { cn } from '../lib/cn'

// Rotas em tela cheia, sem a barra de navegação (ex.: organograma em landscape).
const SEM_NAV = ['/organograma']

export function AppShell() {
  const location = useLocation()
  const semNav = SEM_NAV.includes(location.pathname)
  return (
    <div className="min-h-[100dvh] bg-bg">
      <main key={location.pathname} className={cn('animate-page', !semNav && 'pb-24')}>
        <Outlet />
      </main>
      {!semNav && <BottomNav />}
    </div>
  )
}

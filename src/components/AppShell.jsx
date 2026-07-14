import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  const location = useLocation()
  return (
    <div className="min-h-[100dvh] bg-bg">
      <main key={location.pathname} className="animate-page pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

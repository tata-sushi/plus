import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { cn } from '../lib/cn'

// Rotas em tela cheia, sem a barra de navegação (ex.: organograma em landscape).
const SEM_NAV = ['/organograma']

export function AppShell() {
  const location = useLocation()
  const semNav = SEM_NAV.includes(location.pathname)

  // Orientação: o app é retrato; só o organograma vai para paisagem (e já entra
  // girado). O manifest é 'any' para permitir; aqui a gente trava por rota.
  // Best-effort: navegadores sem a API (ex.: iOS) simplesmente ignoram.
  useEffect(() => {
    const o = window.screen?.orientation
    if (!o?.lock) return
    o.lock(semNav ? 'landscape' : 'portrait').catch(() => {})
  }, [semNav])

  return (
    <div className="min-h-[100dvh] bg-bg">
      <main key={location.pathname} className={cn('animate-page', !semNav && 'pb-24')}>
        <Outlet />
      </main>
      {!semNav && <BottomNav />}
    </div>
  )
}

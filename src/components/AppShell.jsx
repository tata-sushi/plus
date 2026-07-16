import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { cn } from '../lib/cn'

// Rotas em tela cheia, sem a barra de navegação (ex.: organograma em landscape).
const SEM_NAV = ['/organograma']

export function AppShell() {
  const location = useLocation()
  const semNav = SEM_NAV.includes(location.pathname)

  // Orientação: o app fica travado em RETRATO; só o organograma vai para
  // PAISAGEM (e já entra girado). O manifest é 'any' para permitir os dois; aqui
  // a gente trava por rota. Best-effort e à prova de erro (iOS etc. ignoram).
  useEffect(() => {
    const o = window.screen?.orientation
    try {
      const p = o?.lock?.(semNav ? 'landscape' : 'portrait')
      if (p?.catch) p.catch(() => {})
    } catch {
      /* sem suporte à API de orientação */
    }
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

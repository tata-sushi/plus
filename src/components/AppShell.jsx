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
  // girado). O manifest é 'any' para permitir; aqui a gente ajusta por rota.
  // Best-effort e à prova de erro: navegadores sem a API (ex.: iOS) ignoram.
  useEffect(() => {
    const o = window.screen?.orientation
    try {
      if (semNav) {
        const p = o?.lock?.('landscape')
        if (p?.catch) p.catch(() => {})
      } else {
        // não força retrato (evita travar e impedir o giro do organograma);
        // libera e deixa o aparelho seguir seu padrão (retrato ao segurar em pé).
        o?.unlock?.()
      }
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

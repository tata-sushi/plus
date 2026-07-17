import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { cn } from '../lib/cn'

// Rotas em tela cheia, sem a barra de navegação. O /organograma é um "trampolim"
// que abre o organograma no navegador (ver routes/Organograma.jsx); some a nav
// para não piscar a barra durante essa passagem.
const SEM_NAV = ['/organograma']

// Orientação: o app fica travado em RETRATO pelo manifesto do PWA. O organograma
// abre no navegador (fora do PWA), então aqui não é preciso mexer em orientação.
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

import { useEffect } from 'react'
import { Home } from './Home.jsx'

// Preview: mesma Home, mas com o fundo na cor Carbon (#53585F = 83 88 95)
// enquanto esta rota estiver ativa. Ao sair, volta ao preto padrão.
export function InicioCarbon() {
  useEffect(() => {
    const root = document.documentElement
    const anterior = root.style.getPropertyValue('--app-bg')
    root.style.setProperty('--app-bg', '83 88 95')
    return () => {
      if (anterior) root.style.setProperty('--app-bg', anterior)
      else root.style.removeProperty('--app-bg')
    }
  }, [])

  return <Home />
}

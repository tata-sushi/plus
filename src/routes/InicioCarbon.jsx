import { useEffect } from 'react'
import { Home } from './Home.jsx'

// Preview: mesma Home com fundo Carbon (#53585F) e cards em tons mais
// claros que o fundo, para dar elevação. Restaura ao sair da rota.
const CARBON_VARS = {
  '--app-bg': '83 88 95', // #53585F fundo
  '--surface': '98 103 111', // #62676F cards
  '--surface-2': '112 117 125', // #70757D cards internos
  '--surface-3': '126 131 139', // #7E838B divisores/realces
}

export function InicioCarbon() {
  useEffect(() => {
    const root = document.documentElement
    const anterior = Object.fromEntries(
      Object.keys(CARBON_VARS).map((k) => [k, root.style.getPropertyValue(k)]),
    )
    Object.entries(CARBON_VARS).forEach(([k, v]) => root.style.setProperty(k, v))
    return () => {
      Object.entries(anterior).forEach(([k, v]) => {
        if (v) root.style.setProperty(k, v)
        else root.style.removeProperty(k)
      })
    }
  }, [])

  return <Home />
}

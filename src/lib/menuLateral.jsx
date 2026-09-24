import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

const MenuLateralContext = createContext(null)

// Estado global do menu de navegação lateral (drawer da Governança). É aberto
// pelo slot "Governança" da barra de baixo e fecha sozinho ao trocar de rota.
export function MenuLateralProvider({ children }) {
  const [aberto, setAberto] = useState(false)
  const location = useLocation()
  useEffect(() => {
    setAberto(false)
  }, [location.pathname])
  const value = useMemo(
    () => ({
      aberto,
      abrir: () => setAberto(true),
      fechar: () => setAberto(false),
      alternar: () => setAberto((v) => !v),
    }),
    [aberto],
  )
  return <MenuLateralContext.Provider value={value}>{children}</MenuLateralContext.Provider>
}

export function useMenuLateral() {
  return (
    useContext(MenuLateralContext) || {
      aberto: false,
      abrir() {},
      fechar() {},
      alternar() {},
    }
  )
}

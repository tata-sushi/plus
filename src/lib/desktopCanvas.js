import { createContext, useContext } from 'react'

// Controla o que aparece na ÁREA PRINCIPAL do shell de desktop (portal padrão
// ou organograma). Fica num contexto para que a Home (renderizada no painel do
// app, dentro do DesktopShell) possa abrir o organograma na área grande.
// Fora do desktop / sem provider, devolve um no-op.
export const DesktopCanvasContext = createContext(null)

export function useDesktopCanvas() {
  return (
    useContext(DesktopCanvasContext) || {
      canvas: null,
      setCanvas: () => {},
      canvasEl: null,
      abrirAba: () => {},
    }
  )
}

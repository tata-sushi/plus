import { useEffect, useState } from 'react'

// True quando a tela é larga (desktop). Usado para trocar o layout de coluna
// única (celular) pelo shell de duas colunas (painel do app + portal).
const CONSULTA = '(min-width: 1024px)'

export function useDesktop() {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(CONSULTA).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA)
    const aoMudar = () => setDesktop(mq.matches)
    mq.addEventListener?.('change', aoMudar)
    return () => mq.removeEventListener?.('change', aoMudar)
  }, [])
  return desktop
}

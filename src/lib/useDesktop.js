import { useEffect, useState } from 'react'

// True quando a tela é larga o bastante para o shell de duas colunas (painel do
// app + portal). Abaixo disso fica o layout vertical (celular, barra de baixo).
// A altura mínima evita que um celular em PAISAGEM (largura > 640, mas baixo)
// caia no layout de desktop — o que remontava telas em tela cheia (ex.: vídeo
// do YouTube no desafio, que gira pra paisagem e fazia "sair do desafio").
const CONSULTA = '(min-width: 640px) and (min-height: 600px)'

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

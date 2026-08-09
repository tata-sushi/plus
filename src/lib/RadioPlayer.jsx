import { createContext, useCallback, useContext, useRef, useState } from 'react'

// Estado global do player da Rádio Tatá. Fica acima das rotas pra a faixa
// sobreviver à navegação. O motor de áudio (iframe do Spotify) e os controles
// ficam no RadioPlayerBar, montado no shell — por isso a música não para ao
// trocar de tela. Aqui guardamos a faixa, o estado (tocando/pausado) e o
// controller do Spotify pra comandar play/pause/troca.
const Ctx = createContext(null)

export function RadioPlayerProvider({ children }) {
  const [faixa, setFaixa] = useState(null) // { trackId, titulo, capa, por } | null
  const [pausado, setPausado] = useState(true)
  const controllerRef = useRef(null)

  const registrarController = useCallback((c) => {
    controllerRef.current = c
  }, [])
  const registrarEstado = useCallback((p) => setPausado(!!p), [])

  // Toca uma faixa. Se o controller já existe, comanda direto (mantém o gesto
  // do toque → play funciona no mobile). Se ainda não, o RadioPlayerBar toca ao
  // criar o controller com essa faixa.
  const tocar = useCallback((f) => {
    setFaixa(f)
    setPausado(false)
    const c = controllerRef.current
    if (c) {
      try {
        c.loadUri(`spotify:track:${f.trackId}`)
        c.play()
      } catch {
        // controller ainda não pronto — o bar cuida ao criar
      }
    }
  }, [])

  const alternar = useCallback(() => {
    const c = controllerRef.current
    if (c) {
      try {
        c.togglePlay()
      } catch {
        // ignora
      }
    }
  }, [])

  const fechar = useCallback(() => {
    const c = controllerRef.current
    if (c) {
      try {
        c.pause()
      } catch {
        // ignora
      }
    }
    controllerRef.current = null
    setPausado(true)
    setFaixa(null)
  }, [])

  return (
    <Ctx.Provider
      value={{ faixa, pausado, tocar, alternar, fechar, registrarController, registrarEstado }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useRadioPlayer() {
  return (
    useContext(Ctx) || {
      faixa: null,
      pausado: true,
      tocar: () => {},
      alternar: () => {},
      fechar: () => {},
      registrarController: () => {},
      registrarEstado: () => {},
    }
  )
}

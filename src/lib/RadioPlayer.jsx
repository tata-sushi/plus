import { createContext, useContext, useState } from 'react'

// Estado global do player da Rádio Tatá. Fica acima das rotas pra a faixa
// escolhida sobreviver à navegação — o player em si (RadioPlayerBar) é montado
// no shell, fora do <main>, então continua tocando ao trocar de tela.
const Ctx = createContext(null)

export function RadioPlayerProvider({ children }) {
  const [faixa, setFaixa] = useState(null) // { trackId, titulo, capa, por } | null
  return (
    <Ctx.Provider value={{ faixa, tocar: setFaixa, fechar: () => setFaixa(null) }}>
      {children}
    </Ctx.Provider>
  )
}

export function useRadioPlayer() {
  return useContext(Ctx) || { faixa: null, tocar: () => {}, fechar: () => {} }
}

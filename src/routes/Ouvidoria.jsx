import { Header } from '../components/Header.jsx'
import { ComingSoon } from '../components/ComingSoon.jsx'

export function Ouvidoria() {
  return (
    <>
      <Header title="Ouvidoria" />
      <ComingSoon
        titulo="Canal de ouvidoria em construção"
        descricao="Em breve você vai poder enviar sugestões, dúvidas e reclamações direto por aqui."
      />
    </>
  )
}

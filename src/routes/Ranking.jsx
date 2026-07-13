import { Header } from '../components/Header.jsx'
import { ComingSoon } from '../components/ComingSoon.jsx'

export function Ranking() {
  return (
    <>
      <Header title="Ranking" />
      <ComingSoon
        titulo="Ranking chegando"
        descricao="Em breve você vai poder ver sua posição no ranking de pontos entre os colaboradores."
      />
    </>
  )
}

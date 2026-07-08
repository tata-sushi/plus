import { Header } from '../components/Header.jsx'
import { ComingSoon } from '../components/ComingSoon.jsx'

export function Manutencao() {
  return (
    <>
      <Header title="Painel de manutenção" />
      <ComingSoon
        titulo="Painel administrativo em construção"
        descricao="Aqui vai ficar CRUD de treinamentos, recompensas, moderação de feed e ajustes de pontos."
      />
    </>
  )
}

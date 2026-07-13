import { Header } from '../components/Header.jsx'
import { ComingSoon } from '../components/ComingSoon.jsx'

export function Cardapio() {
  return (
    <>
      <Header title="Cardápio" />
      <ComingSoon
        titulo="Cardápio chegando"
        descricao="Em breve o cardápio completo vai estar disponível por aqui."
      />
    </>
  )
}

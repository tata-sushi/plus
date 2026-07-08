import { Header } from '../components/Header.jsx'
import { ComingSoon } from '../components/ComingSoon.jsx'

export function RhFacil() {
  return (
    <>
      <Header title="RH Fácil" />
      <ComingSoon
        titulo="Atendimento RH em breve"
        descricao="Estamos preparando os fluxos de chamados, solicitação de documentos, férias e contracheque."
      />
    </>
  )
}

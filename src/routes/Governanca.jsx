import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header.jsx'
import { ListaGovernanca } from '../components/ListaGovernanca.jsx'

// Governança de Processos (modelo novo, mobile): lista nativa das páginas
// liberadas; cada uma abre no visualizador in-app (/painel/:id), que passa o
// token da sessão pra página checar o acesso na hora.
export function Governanca() {
  const navigate = useNavigate()
  return (
    <>
      <Header title="Governança de Processos" />
      <ListaGovernanca onAbrir={(p) => navigate(`/painel/${p.pagina_id}`)} />
    </>
  )
}

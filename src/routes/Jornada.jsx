import { ProfileView } from '../components/ProfileView.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { currentUser, getColaborador } from '../lib/mockData.js'

export function Jornada() {
  const { usuario } = useAuth()
  const base = getColaborador(currentUser.id)
  // Identidade real do profiles; gamificação segue mock por enquanto
  const colaborador = {
    ...base,
    nome: usuario?.nome || base.nome,
    cargo: usuario?.cargo || base.cargo,
    loja: usuario?.loja || base.loja,
  }
  return <ProfileView colaborador={colaborador} isSelf />
}

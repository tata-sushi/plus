import { ProfileView } from '../components/ProfileView.jsx'
import { useAuth } from '../lib/AuthContext.jsx'

// Minha jornada — identidade real do colaborador logado (profiles).
export function Jornada() {
  const { usuario } = useAuth()
  const colaborador = {
    nome: usuario?.nome || 'Colaborador',
    cargo: usuario?.cargo || '',
    loja: usuario?.loja || '',
    avatar: usuario?.avatarUrl || null,
  }
  return <ProfileView colaborador={colaborador} isSelf />
}

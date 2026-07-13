import { useParams, Navigate } from 'react-router-dom'
import { ProfileView } from '../components/ProfileView.jsx'
import { currentUser, getColaborador } from '../lib/mockData.js'

export function Perfil() {
  const { id } = useParams()
  const colaborador = getColaborador(id)

  if (!colaborador) return <Navigate to="/" replace />

  return <ProfileView colaborador={colaborador} isSelf={colaborador.id === currentUser.id} />
}

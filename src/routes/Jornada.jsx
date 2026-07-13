import { ProfileView } from '../components/ProfileView.jsx'
import { currentUser, getColaborador } from '../lib/mockData.js'

export function Jornada() {
  const colaborador = getColaborador(currentUser.id)
  return <ProfileView colaborador={colaborador} isSelf />
}

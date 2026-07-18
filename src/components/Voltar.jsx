import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Botão "voltar" padrão das subpáginas — vai logo abaixo do Header.
// Sem `to`, volta para a tela anterior (navigate(-1)).
export function Voltar({ label = 'Voltar', to }) {
  const navigate = useNavigate()
  function onClick() {
    tapHaptic()
    if (to) navigate(to)
    else navigate(-1)
  }
  return (
    <div className="px-5 pt-2">
      <button onClick={onClick} className="hstack gap-1 text-sm font-medium text-muted tap">
        <ArrowLeft size={16} /> {label}
      </button>
    </div>
  )
}

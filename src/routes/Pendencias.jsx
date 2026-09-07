import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { PainelPendencias } from '../components/PainelPendencias.jsx'
import { tapHaptic } from '../lib/haptics.js'

// Rota leve das Pendências — pra quem NÃO tem quadros (não precisa abrir o Kanban
// grande). Quem tem quadros vê o mesmo painel no topo da tela de Quadros.
export function Pendencias() {
  const navigate = useNavigate()
  return (
    <div className="min-h-[100dvh] bg-bg">
      <Header />
      <div className="px-5 pt-2">
        <button
          onClick={() => {
            tapHaptic()
            navigate(-1)
          }}
          className="hstack gap-1 text-sm font-medium text-muted tap"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      <div className="mx-auto w-full max-w-[520px] px-5 pb-28 pt-4">
        <PainelPendencias />
      </div>
    </div>
  )
}

export default Pendencias

import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

const OUVIDORIA_URL = 'https://ouvidoria.tatasushi.tech/'

// Ouvidoria (form externo). Abre em tela cheia como o organograma, porém em
// RETRATO (sem rotação): apenas o iframe + o botão "App" para voltar. A barra
// de navegação some (rota listada em SEM_NAV no AppShell).
export function Ouvidoria() {
  const navigate = useNavigate()

  function voltar() {
    tapHaptic()
    navigate(-1)
  }

  return (
    <div className="fixed inset-0 bg-white">
      <iframe
        src={OUVIDORIA_URL}
        title="Ouvidoria Tatá"
        allow="clipboard-write; camera; microphone; geolocation"
        className="h-full w-full border-0 bg-white"
      />

      {/* Único elemento de UI do app: botão "App" (mesmo padrão do organograma). */}
      <button
        onClick={voltar}
        aria-label="Voltar ao aplicativo"
        className="fixed z-50 flex items-center gap-1.5 rounded-pill text-[11.5px] font-semibold text-white tap"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 14px)',
          height: '36px',
          padding: '0 14px',
          background: '#35383F',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
      >
        <ArrowLeft size={16} strokeWidth={2.2} color="#CFFF00" /> App
      </button>
    </div>
  )
}

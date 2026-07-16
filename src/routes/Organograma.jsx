import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Organograma (HTML no portal Líderes) em tela cheia, SEM a barra de navegação
// (a nav é escondida para esta rota no AppShell — a página força visualização
// na horizontal). Como não há nav, um botão flutuante "App" volta ao aplicativo.
const ORGANOGRAMA_URL = 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html'

export function Organograma() {
  const navigate = useNavigate()
  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <iframe
        src={ORGANOGRAMA_URL}
        title="Organograma"
        className="w-full flex-1 border-0 bg-white"
        allow="clipboard-write; fullscreen"
      />
      <button
        onClick={() => {
          tapHaptic()
          navigate('/')
        }}
        aria-label="Voltar ao aplicativo"
        className="fixed z-50 flex items-center gap-1.5 rounded-pill bg-black/70 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur tap"
        style={{
          top: 'calc(env(safe-area-inset-top) + 12px)',
          left: 'calc(env(safe-area-inset-left) + 12px)',
        }}
      >
        <ArrowLeft size={16} /> App
      </button>
    </div>
  )
}

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
      {/* Botão "App" no mesmo padrão do aviso do portal (organograma2.html, .hint-bar):
          grafite #35383F, seta citric #CFFF00, pílula 100px, altura 36px,
          fonte sans 11.5px peso 600, no topo a 8px (offset mobile do portal). */}
      <button
        onClick={() => {
          tapHaptic()
          navigate('/')
        }}
        aria-label="Voltar ao aplicativo"
        className="fixed z-50 flex items-center gap-1.5 rounded-pill text-[11.5px] font-semibold text-white tap"
        style={{
          top: 'calc(env(safe-area-inset-top) + 8px)',
          left: 'calc(env(safe-area-inset-left) + 12px)',
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

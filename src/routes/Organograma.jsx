import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Organograma (HTML no portal Líderes) em tela cheia. O app fica travado em
// RETRATO pelo manifesto (o device ignora screen.orientation.lock), então aqui
// giramos o conteúdo 90° via CSS: o iframe é renderizado em "paisagem"
// (100vh de largura x 100vw de altura) e rotacionado para preencher a tela.
// Basta segurar o celular deitado que o organograma aparece na horizontal.
const ORGANOGRAMA_URL = 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html'

export function Organograma() {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 overflow-hidden bg-white">
      {/* moldura em paisagem: dimensões trocadas (100vh x 100vw) + rotação 90° */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vh',
          height: '100vw',
          transformOrigin: 'top left',
          transform: 'translateX(100vw) rotate(90deg)',
        }}
      >
        <iframe
          src={ORGANOGRAMA_URL}
          title="Organograma"
          allow="clipboard-write; fullscreen"
          style={{ display: 'block', width: '100%', height: '100%', border: 0, background: '#fff' }}
        />

        {/* Botão "App" no padrão do aviso do portal (.hint-bar). Fica no canto
            superior esquerdo já a partir da perspectiva do celular deitado, pois
            está dentro da moldura rotacionada. */}
        <button
          onClick={() => {
            tapHaptic()
            navigate('/')
          }}
          aria-label="Voltar ao aplicativo"
          className="absolute z-50 flex items-center gap-1.5 rounded-pill text-[11.5px] font-semibold text-white tap"
          style={{
            top: '12px',
            left: '14px',
            height: '36px',
            padding: '0 14px',
            background: '#35383F',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.2} color="#CFFF00" /> App
        </button>
      </div>
    </div>
  )
}

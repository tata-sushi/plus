import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Organograma (HTML no portal Líderes) em tela cheia. O app fica travado em
// RETRATO pelo manifesto (o device ignora screen.orientation.lock), então aqui
// giramos o conteúdo 90° via CSS: o iframe é renderizado em "paisagem"
// (100vh de largura x 100vw de altura) e rotacionado para preencher a tela.
// Basta segurar o celular deitado que o organograma aparece na horizontal.
//
// A rotação é aplicada DIRETAMENTE no <iframe> (e não num container em volta):
// no Android/Chromium, rotacionar um ancestral do iframe costuma gerar um
// "tile" preto (bug de compositing). Rotacionando o próprio iframe + will-change
// ele ganha a sua camada de GPU já na posição certa e pinta normalmente.
const ORGANOGRAMA_URL = 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html'

// mesma transformação usada no iframe e na camada do botão, para os dois
// girarem juntos (o "canto superior esquerdo" do botão cai no canto superior
// esquerdo da visão de quem está com o celular deitado).
const PAISAGEM = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100vh',
  height: '100vw',
  transformOrigin: 'top left',
  transform: 'translateX(100vw) rotate(90deg)',
}

export function Organograma() {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 overflow-hidden bg-white">
      <iframe
        src={ORGANOGRAMA_URL}
        title="Organograma"
        allow="clipboard-write; fullscreen"
        style={{
          ...PAISAGEM,
          border: 0,
          background: '#fff',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      />

      {/* Camada só do botão, com a MESMA rotação do iframe. pointer-events:none
          deixa os toques passarem para o iframe; só o botão captura. */}
      <div style={{ ...PAISAGEM, pointerEvents: 'none' }}>
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
            pointerEvents: 'auto',
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.2} color="#CFFF00" /> App
        </button>
      </div>
    </div>
  )
}

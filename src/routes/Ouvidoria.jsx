import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Ouvidoria (form externo). Abre em tela cheia como o organograma, porém em
// RETRATO (sem rotação): só o iframe + o botão "App" para voltar.
//
// Entramos em TELA CHEIA (requestFullscreen) como no organograma — sem isso o
// container `fixed` fica preso ao <main> animado (que tem transform) e colapsa
// para altura 0 (a "tela preta"). Aqui NÃO travamos a orientação.
const OUVIDORIA_URL = 'https://ouvidoria.tatasushi.tech/'

function pedirTelaCheia(el) {
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen
  if (!req) return Promise.reject(new Error('sem fullscreen'))
  return Promise.resolve(req.call(el))
}

function emTelaCheia() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement)
}

function sairTelaCheia() {
  if (!emTelaCheia()) return
  const ex = document.exitFullscreen || document.webkitExitFullscreen
  try {
    ex?.call(document)
  } catch {
    /* ignore */
  }
}

export function Ouvidoria() {
  const navigate = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
    // a navegação até aqui é um toque recente: entra direto em tela cheia.
    if (boxRef.current) pedirTelaCheia(boxRef.current).catch(() => {})
    return () => sairTelaCheia()
  }, [])

  function voltar() {
    tapHaptic()
    sairTelaCheia()
    navigate(-1)
  }

  return (
    // Tamanho explícito em unidades de viewport: mesmo se a tela cheia falhar,
    // o container não colapsa (evita a tela preta).
    <div ref={boxRef} className="fixed left-0 top-0 z-40 h-[100dvh] w-screen bg-white">
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

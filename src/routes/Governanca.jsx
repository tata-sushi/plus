import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Portal de Governança (Líderes) rodando dentro do app, em tela cheia (sem a
// barra de navegação) — mesmo padrão da Ouvidoria. Só o iframe + botão "App".
const GOVERNANCA_URL = 'https://lideres.tatasushi.tech/compliance/index2.html'

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

export function Governanca() {
  const navigate = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
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
    // o container não colapsa.
    <div ref={boxRef} className="fixed left-0 top-0 z-40 h-[100dvh] w-screen bg-white">
      <iframe
        src={GOVERNANCA_URL}
        title="Governança de Processos"
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

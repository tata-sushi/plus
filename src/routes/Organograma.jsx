import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Organograma (HTML no portal Líderes). Abre DIRETO em tela cheia + paisagem —
// sem tela de aviso e sem UI extra além do botão "App".
//
// O app é travado em RETRATO pelo manifesto do PWA e a página do organograma só
// renderiza bem em PAISAGEM/tela cheia. Um `screen.orientation.lock` "pelado"
// não funciona nesse cenário no Android; o que funciona é o par clássico:
// entrar em TELA CHEIA (requestFullscreen) e então travar em 'landscape'.
// Ao voltar pelo botão "App", saímos da tela cheia (volta ao retrato do app).
const ORGANOGRAMA_URL = 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html'

function pedirTelaCheia(el) {
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen
  if (!req) return Promise.reject(new Error('sem fullscreen'))
  return Promise.resolve(req.call(el))
}

function emTelaCheia() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement)
}

function sairTelaCheia() {
  try {
    window.screen?.orientation?.unlock?.()
  } catch {
    /* ignore */
  }
  if (!emTelaCheia()) return
  const ex = document.exitFullscreen || document.webkitExitFullscreen
  try {
    ex?.call(document)
  } catch {
    /* ignore */
  }
}

// entra em tela cheia e trava em paisagem (best-effort e à prova de erro)
function entrarPaisagem(el) {
  return pedirTelaCheia(el)
    .then(() => {
      try {
        const p = window.screen?.orientation?.lock?.('landscape')
        if (p?.catch) p.catch(() => {})
      } catch {
        /* device sem lock de orientação */
      }
    })
    .catch(() => {})
}

export function Organograma() {
  const navigate = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
    // a navegação até aqui é um toque recente: entra direto em paisagem.
    if (boxRef.current) entrarPaisagem(boxRef.current)
    return () => sairTelaCheia()
  }, [])

  function voltar() {
    tapHaptic()
    sairTelaCheia()
    navigate('/')
  }

  return (
    <div ref={boxRef} className="fixed inset-0 bg-white">
      <iframe
        src={ORGANOGRAMA_URL}
        title="Organograma"
        allow="clipboard-write; fullscreen"
        className="h-full w-full border-0 bg-white"
      />

      {/* Único elemento de UI do app: botão "App" (padrão do aviso do portal). */}
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

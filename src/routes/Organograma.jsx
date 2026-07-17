import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Smartphone } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Organograma (HTML no portal Líderes). Abre em RETRATO e deixa a pessoa
// ESCOLHER ir para paisagem — não força.
//
// O app é travado em RETRATO pelo manifesto do PWA. Um `screen.orientation.lock`
// "pelado" NÃO funciona nesse cenário no Android. O que funciona é o par
// clássico: entrar em TELA CHEIA (requestFullscreen) e então travar em
// 'landscape'. Enquanto está em tela cheia o Chrome respeita a trava; ao sair,
// volta para o retrato do manifesto. Sem rotação por CSS — logo, sem tela preta
// e com zoom/arrasto nativos do organograma. O botão flutuante é um liga/desliga
// entre retrato e paisagem.
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
  const [cheia, setCheia] = useState(false)

  useEffect(() => {
    // NÃO força paisagem: abre em retrato e deixa a pessoa escolher pelo botão.
    const aoMudar = () => setCheia(emTelaCheia())
    document.addEventListener('fullscreenchange', aoMudar)
    document.addEventListener('webkitfullscreenchange', aoMudar)
    return () => {
      document.removeEventListener('fullscreenchange', aoMudar)
      document.removeEventListener('webkitfullscreenchange', aoMudar)
      sairTelaCheia()
    }
  }, [])

  function voltar() {
    tapHaptic()
    sairTelaCheia()
    navigate('/')
  }

  // liga/desliga a paisagem sem sair da página
  function alternarPaisagem() {
    tapHaptic()
    if (cheia) sairTelaCheia()
    else if (boxRef.current) entrarPaisagem(boxRef.current)
  }

  return (
    <div ref={boxRef} className="fixed inset-0 bg-white">
      <iframe
        src={ORGANOGRAMA_URL}
        title="Organograma"
        allow="clipboard-write; fullscreen"
        className="h-full w-full border-0 bg-white"
      />

      {/* Botão "App" (padrão do aviso do portal): volta ao aplicativo. */}
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

      {/* Liga/desliga a paisagem — a pessoa escolhe. */}
      <button
        onClick={alternarPaisagem}
        className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-accent px-5 py-3 text-sm font-semibold text-black shadow-lg tap"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {cheia ? (
          <>
            <Smartphone size={16} /> Voltar ao retrato
          </>
        ) : (
          <>
            <RotateCcw size={16} /> Girar para paisagem
          </>
        )}
      </button>
    </div>
  )
}

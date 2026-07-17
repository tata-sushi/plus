import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Smartphone, Network } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Organograma (HTML no portal Líderes). O app é travado em RETRATO pelo
// manifesto do PWA e a página do organograma só renderiza bem em PAISAGEM/tela
// cheia (embutida em retrato ela fica preta). Então:
//   - Em retrato mostramos uma tela de abertura com o botão "Girar para
//     paisagem" (a pessoa ESCOLHE — não força).
//   - Ao tocar, entramos em TELA CHEIA (requestFullscreen) e travamos em
//     'landscape' — o par que o Chrome respeita. Só aí o iframe é exibido.
//   - "Voltar ao retrato" sai da tela cheia sem sair da página.
// Sem rotação por CSS (que deixava o iframe preto) e com zoom/arrasto nativos.
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

  function girar() {
    tapHaptic()
    if (boxRef.current) entrarPaisagem(boxRef.current)
  }

  function voltarRetrato() {
    tapHaptic()
    sairTelaCheia()
  }

  return (
    <div ref={boxRef} className="fixed inset-0 bg-white">
      {/* O iframe só aparece em paisagem/tela cheia (em retrato ele fica preto). */}
      {cheia && (
        <iframe
          src={ORGANOGRAMA_URL}
          title="Organograma"
          allow="clipboard-write; fullscreen"
          className="h-full w-full border-0 bg-white"
        />
      )}

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

      {cheia ? (
        // Em paisagem: opção de voltar ao retrato sem sair da página.
        <button
          onClick={voltarRetrato}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-accent px-5 py-3 text-sm font-semibold text-black shadow-lg tap"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <Smartphone size={16} /> Voltar ao retrato
        </button>
      ) : (
        // Em retrato: tela de abertura — a pessoa escolhe girar.
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-bg px-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Network size={30} />
          </div>
          <div>
            <div className="font-display text-lg font-bold">Organograma</div>
            <p className="mt-1.5 text-sm text-muted">
              Melhor visualizado na horizontal. Toque para abrir em tela cheia.
            </p>
          </div>
          <button
            onClick={girar}
            className="flex items-center gap-2 rounded-pill bg-accent px-6 py-3.5 text-sm font-semibold text-black shadow-lg tap"
          >
            <RotateCcw size={16} /> Girar para paisagem
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Radio as RadioIcon, Play, Pause, X, Music2 } from 'lucide-react'
import { useRadioPlayer } from '../lib/RadioPlayer.jsx'
import { carregarSpotifyApi } from '../lib/spotifyApi.js'
import { cn } from '../lib/cn'

function Capa({ src, size = 'h-11 w-11' }) {
  return (
    <div className={cn('shrink-0 overflow-hidden rounded-lg bg-surface-2', size)}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-muted-2">
          <Music2 size={16} />
        </div>
      )}
    </div>
  )
}

// Mini-player persistente da Rádio Tatá. Montado no shell (fora das rotas), então
// a música continua tocando ao navegar. O iframe do Spotify é só o MOTOR DE ÁUDIO
// (fica fora da tela); os controles são próprios:
//  - na página da Rádio → barra "tocando agora" (capa + título + play/pausa)
//  - fora dela          → aba mínima encostada na lateral (ícone + play/pausa)
export function RadioPlayerBar() {
  const { faixa, pausado, alternar, fechar, registrarController, registrarEstado } = useRadioPlayer()
  const location = useLocation()
  const naRadio = location.pathname === '/radio'
  const wrapRef = useRef(null)
  const criado = useRef(false)
  const faixaRef = useRef(faixa)
  faixaRef.current = faixa

  // Recomeça do zero quando o player é fechado (faixa some).
  useEffect(() => {
    if (!faixa) criado.current = false
  }, [faixa])

  // Cria o controller (motor de áudio) quando surge a 1ª faixa. Usa um filho
  // criado imperativamente pra o Spotify substituir por iframe sem o React
  // se perder na reconciliação.
  useEffect(() => {
    if (!faixa || criado.current || !wrapRef.current) return
    criado.current = true
    let vivo = true
    carregarSpotifyApi().then((API) => {
      if (!vivo || !wrapRef.current || !API) return
      const el = document.createElement('div')
      wrapRef.current.appendChild(el)
      API.createController(
        el,
        { uri: `spotify:track:${faixaRef.current.trackId}`, width: '100%', height: 80 },
        (c) => {
          registrarController(c)
          c.addListener('playback_update', (e) => {
            if (e?.data && typeof e.data.isPaused === 'boolean') registrarEstado(e.data.isPaused)
          })
          try {
            c.play() // toca a 1ª faixa assim que o player estiver pronto
          } catch {
            // ignora
          }
        },
      )
    })
    return () => {
      vivo = false
    }
  }, [faixa, registrarController, registrarEstado])

  if (!faixa) return null

  const BotaoPlay = ({ size = 18, box = 'h-10 w-10' }) => (
    <button
      onClick={alternar}
      aria-label={pausado ? 'Tocar' : 'Pausar'}
      className={cn('grid shrink-0 place-items-center rounded-full bg-accent text-black tap', box)}
    >
      {pausado ? <Play size={size} fill="currentColor" /> : <Pause size={size} fill="currentColor" />}
    </button>
  )

  return (
    <>
      {/* Motor de áudio: iframe do Spotify fora da tela (continua tocando). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[80px] w-[300px] -translate-x-[10000px] opacity-0"
      >
        <div ref={wrapRef} />
      </div>

      {naRadio ? (
        // Barra "tocando agora" na página da Rádio.
        <div className="fixed inset-x-2 bottom-[calc(68px+env(safe-area-inset-bottom))] z-40 md:left-[68px] md:right-auto md:w-[360px]">
          <div className="card hstack gap-3 p-2 shadow-glow">
            <Capa src={faixa.capa} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{faixa.titulo || 'Tocando agora'}</div>
              <div className="truncate text-[11px] text-muted">Rádio Tatá</div>
            </div>
            <BotaoPlay />
            <button
              onClick={fechar}
              aria-label="Fechar player"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fill text-muted-2 tap"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        // Aba mínima encostada na lateral direita, fora da página da Rádio.
        <div className="fixed right-0 top-1/2 z-40 -translate-y-1/2">
          <div className="flex flex-col items-center gap-1.5 rounded-l-2xl border border-r-0 border-line bg-surface py-2.5 pl-2.5 pr-2 shadow-glow">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-accent">
              <RadioIcon size={15} />
            </span>
            <BotaoPlay size={16} box="h-9 w-9" />
            <button
              onClick={fechar}
              aria-label="Fechar player"
              className="grid h-6 w-6 place-items-center rounded-full text-muted-2 tap"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

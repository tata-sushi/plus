import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'

// Player de vídeo do desafio: toca dentro do app, fundo cinema.
// onAssistido() é chamado quando o vídeo termina (gate de conclusão).
export function VideoPlayer({ src, onAssistido }) {
  const [erro, setErro] = useState(false)
  const videoRef = useRef(null)

  // tela cheia: gira pra paisagem (Android; iOS não expõe essa API)
  useEffect(() => {
    function aoMudarTelaCheia() {
      const cheio = document.fullscreenElement === videoRef.current
      if (cheio) {
        screen.orientation?.lock?.('landscape').catch(() => {})
      } else {
        try {
          screen.orientation?.unlock?.()
        } catch {
          /* ignore */
        }
      }
    }
    document.addEventListener('fullscreenchange', aoMudarTelaCheia)
    document.addEventListener('webkitfullscreenchange', aoMudarTelaCheia)
    return () => {
      document.removeEventListener('fullscreenchange', aoMudarTelaCheia)
      document.removeEventListener('webkitfullscreenchange', aoMudarTelaCheia)
    }
  }, [])

  if (erro) {
    return (
      <div className="grid flex-1 place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-muted">Não deu pra tocar o vídeo aqui.</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-3 inline-flex !py-2 text-xs"
          >
            <ExternalLink size={14} /> Abrir o vídeo
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className="max-h-full w-full"
        onEnded={() => onAssistido?.()}
        onError={() => {
          setErro(true)
          onAssistido?.() // sem player, libera concluir (assiste pelo link)
        }}
      />
    </div>
  )
}

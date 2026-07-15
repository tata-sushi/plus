import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

// Carrega a IFrame Player API do YouTube uma única vez.
let ytPromise
function carregarYT() {
  if (ytPromise) return ytPromise
  ytPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT)
    const anterior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      anterior?.()
      resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  })
  return ytPromise
}

function VideoYT({ id, onFim }) {
  const ref = useRef(null)
  useEffect(() => {
    let player
    let cancelado = false
    carregarYT().then((YT) => {
      if (cancelado || !ref.current) return
      player = new YT.Player(ref.current, {
        videoId: id,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === 0) onFim() // 0 = ENDED
          },
        },
      })
    })
    return () => {
      cancelado = true
      try {
        player?.destroy?.()
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return <div ref={ref} className="h-full w-full" />
}

// Lista de vídeos do YouTube; onAssistidos() dispara quando TODOS terminaram.
export function VideosYouTube({ videos, onAssistidos }) {
  const [vistos, setVistos] = useState(() => new Set())

  useEffect(() => {
    if (videos.length && vistos.size >= videos.length) onAssistidos?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistos, videos.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-5">
        {videos.map((v, i) => (
          <div key={v.yt}>
            <div className="mb-1.5 hstack gap-2">
              {vistos.has(i) ? (
                <CheckCircle2 size={16} className="text-accent" />
              ) : (
                <Circle size={16} className="text-muted-2" />
              )}
              <span className="text-sm font-semibold">{v.nome}</span>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black [&>iframe]:h-full [&>iframe]:w-full">
              <VideoYT id={v.yt} onFim={() => setVistos((s) => new Set(s).add(i))} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-2">
        Assista os {videos.length} vídeos até o fim para concluir o desafio.
      </p>
    </div>
  )
}

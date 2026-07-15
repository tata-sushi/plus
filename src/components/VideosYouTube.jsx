import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { cn } from '../lib/cn'

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

const TOLERANCIA_S = 1.5 // margem pra não travar por buffering

// Player do vídeo atual — trava avanço (não deixa passar pra frente do que já assistiu).
function VideoYT({ id, onFim }) {
  const ref = useRef(null)
  useEffect(() => {
    let player
    let intervalo
    let cancelado = false
    const maxAssistido = { current: 0 }

    carregarYT().then((YT) => {
      if (cancelado || !ref.current) return
      player = new YT.Player(ref.current, {
        videoId: id,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === 0) onFim() // 0 = ENDED
          },
        },
      })
      // trava o avanço: se o usuário arrastar pra frente, volta pro ponto máximo já assistido
      intervalo = setInterval(() => {
        if (!player?.getCurrentTime) return
        const atual = player.getCurrentTime()
        if (atual > maxAssistido.current + TOLERANCIA_S) {
          player.seekTo(maxAssistido.current, true)
        } else {
          maxAssistido.current = Math.max(maxAssistido.current, atual)
        }
      }, 500)
    })

    return () => {
      cancelado = true
      clearInterval(intervalo)
      try {
        player?.destroy?.()
      } catch {
        /* ignore */
      }
    }
  }, [id])
  return <div ref={ref} className="h-full w-full" />
}

// Vídeos em sequência: só o atual toca; os concluídos ficam com check (colapsados);
// os futuros ficam bloqueados. onAssistidos() dispara quando TODOS terminaram.
export function VideosYouTube({ videos, onAssistidos }) {
  const [vistos, setVistos] = useState(() => new Set())
  const atual = videos.findIndex((_, i) => !vistos.has(i))

  useEffect(() => {
    if (videos.length && vistos.size >= videos.length) onAssistidos?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistos, videos.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-3">
        {videos.map((v, i) => {
          const concluido = vistos.has(i)
          const ativo = i === atual
          return (
            <div key={v.yt}>
              <div className="mb-1.5 hstack gap-2">
                {concluido ? (
                  <CheckCircle2 size={16} className="text-accent" />
                ) : ativo ? (
                  <Circle size={16} className="text-muted-2" />
                ) : (
                  <Lock size={13} className="text-muted-2" />
                )}
                <span className={cn('text-sm font-semibold', !concluido && !ativo && 'text-muted-2')}>
                  {v.nome}
                </span>
              </div>
              {ativo && (
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-black [&>iframe]:h-full [&>iframe]:w-full">
                  <VideoYT id={v.yt} onFim={() => setVistos((s) => new Set(s).add(i))} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-center text-xs text-muted-2">
        Assista os {videos.length} vídeos, um de cada vez, para concluir o desafio.
      </p>
    </div>
  )
}

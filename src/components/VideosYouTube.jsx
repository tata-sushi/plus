import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Lock } from 'lucide-react'
import { IntroDesafio } from './IntroDesafio.jsx'
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
// travado=false (rever): navegação livre.
function VideoYT({ id, onFim, travado = true }) {
  const ref = useRef(null)
  useEffect(() => {
    let player
    let intervalo
    let iframeEl = null
    let cancelado = false
    const maxAssistido = { current: 0 }

    // tela cheia: gira pra paisagem (Android; iOS não expõe essa API)
    function aoMudarTelaCheia() {
      const cheio = document.fullscreenElement === iframeEl
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

    carregarYT().then((YT) => {
      if (cancelado || !ref.current) return
      player = new YT.Player(ref.current, {
        videoId: id,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1 },
        events: {
          onReady: (e) => {
            iframeEl = e.target.getIframe?.() || null
          },
          onStateChange: (e) => {
            if (e.data === 0) onFim() // 0 = ENDED
          },
        },
      })
      // trava o avanço: se o usuário arrastar pra frente, volta pro ponto máximo já assistido
      if (travado) {
        intervalo = setInterval(() => {
          if (!player?.getCurrentTime) return
          const atual = player.getCurrentTime()
          if (atual > maxAssistido.current + TOLERANCIA_S) {
            player.seekTo(maxAssistido.current, true)
          } else {
            maxAssistido.current = Math.max(maxAssistido.current, atual)
          }
        }, 500)
      }
    })

    return () => {
      cancelado = true
      clearInterval(intervalo)
      document.removeEventListener('fullscreenchange', aoMudarTelaCheia)
      document.removeEventListener('webkitfullscreenchange', aoMudarTelaCheia)
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
// O progresso (quais vídeos já foram assistidos) fica salvo por desafio — quem
// já viu não precisa rever ao reabrir.
export function VideosYouTube({ chave, videos, jaConcluido, onAssistidos, intro }) {
  const storageKey = `tp_videos_${chave}`
  const [reaberto, setReaberto] = useState(null) // vídeo já visto reaberto pra rever
  const [vistos, setVistos] = useState(() => {
    // desafio já concluído no app → todos contam como vistos
    if (jaConcluido) return new Set(videos.map((_, i) => i))
    try {
      const salvo = JSON.parse(localStorage.getItem(storageKey) || '[]')
      return new Set(Array.isArray(salvo) ? salvo : [])
    } catch {
      return new Set()
    }
  })
  const atual = videos.findIndex((_, i) => !vistos.has(i))

  function marcar(i) {
    setVistos((s) => {
      const n = new Set(s).add(i)
      try {
        localStorage.setItem(storageKey, JSON.stringify([...n]))
      } catch {
        /* ignore */
      }
      return n
    })
  }

  useEffect(() => {
    if (videos.length && vistos.size >= videos.length) onAssistidos?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistos, videos.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {intro && (
        <div className="mb-5">
          <IntroDesafio titulo={intro.titulo} frase={intro.frase} />
        </div>
      )}
      <div className="flex flex-col gap-3">
        {videos.map((v, i) => {
          const concluido = vistos.has(i)
          const ativo = i === atual
          const mostrando = ativo || reaberto === i
          return (
            <div key={v.yt}>
              <button
                onClick={() => concluido && setReaberto(reaberto === i ? null : i)}
                disabled={!concluido}
                className="mb-1.5 hstack w-full gap-2 text-left tap"
              >
                {concluido && <CheckCircle2 size={16} className="shrink-0 text-accent" />}
                {!concluido && !ativo && <Lock size={13} className="shrink-0 text-muted-2" />}
                <span className={cn('text-sm font-semibold', !concluido && !ativo && 'text-muted-2')}>
                  {v.nome}
                </span>
                {concluido && (
                  <span className="ml-auto shrink-0 text-[11px] font-semibold text-muted">
                    {reaberto === i ? 'Fechar' : 'Rever'}
                  </span>
                )}
              </button>
              {mostrando && (
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-black [&>iframe]:h-full [&>iframe]:w-full">
                  <VideoYT id={v.yt} travado={!concluido} onFim={() => marcar(i)} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-center text-xs text-muted-2">
        Assista os vídeos para concluir o desafio.
      </p>
    </div>
  )
}

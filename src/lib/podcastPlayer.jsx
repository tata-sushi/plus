import { createContext, useContext, useRef, useState, useCallback } from 'react'
import { Play, Pause, X, Loader2 } from 'lucide-react'
import { cn } from './cn'
import { useDesktop } from './useDesktop.js'

// ─────────────────────────────────────────────────────────────────────────────
// Player GLOBAL do Podcast (Rádio 2.0). Vive no nível do app (montado no
// AppShell), então o áudio CONTINUA tocando ao navegar por outras telas.
// Um mini-player persistente aparece embaixo enquanto houver episódio no ar.
// Regras mantidas: não dá pra avançar; pontua só ao concluir (aqui é visual).
// ─────────────────────────────────────────────────────────────────────────────

const Ctx = createContext(null)
export const usePodcastPlayer = () => useContext(Ctx)

export function PodcastPlayerProvider({ children }) {
  const audioRef = useRef(null)
  const [url, setUrl] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [atual, setAtual] = useState(null) // objeto do episódio no ar
  const [tocando, setTocando] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [duracao, setDuracao] = useState(0)
  const [concluidos, setConcluidos] = useState(() => new Set())
  const [aviso, setAviso] = useState('')
  const maxRef = useRef(0) // ponto máximo já ouvido (trava o avançar)
  const avisoTimer = useRef(null)

  // O áudio demo (~1MB) carrega sob demanda no 1º play.
  const garantirUrl = useCallback(async () => {
    if (url) return url
    setCarregando(true)
    const mod = await import('../routes/podcastDemoAudio.js')
    setCarregando(false)
    setUrl(mod.podcastDemoAudio)
    return mod.podcastDemoAudio
  }, [url])

  const tocar = useCallback(
    async (ep) => {
      const a = audioRef.current
      if (atual?.id === ep.id && a) {
        if (a.paused) a.play()
        else a.pause()
        return
      }
      const u = await garantirUrl()
      setAtual(ep)
      setTempo(0)
      maxRef.current = 0
      const el = audioRef.current
      if (!el) return
      if (!el.src) el.src = u
      el.currentTime = 0
      el.play().catch(() => {})
    },
    [atual, garantirUrl],
  )

  const toggle = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) a.play()
    else a.pause()
  }, [])

  const fechar = useCallback(() => {
    const a = audioRef.current
    if (a) a.pause()
    setAtual(null)
    setTocando(false)
    setTempo(0)
    setDuracao(0)
  }, [])

  function aoTempo(e) {
    const t = e.currentTarget.currentTime
    setTempo(t)
    if (t > maxRef.current) maxRef.current = t
  }
  function impedirAvanco(e) {
    const el = e.currentTarget
    if (el.currentTime > maxRef.current + 0.6) el.currentTime = maxRef.current
  }
  function concluir() {
    setTocando(false)
    const ep = atual
    if (!ep || ep.concluido || concluidos.has(ep.id)) return
    setConcluidos((s) => new Set(s).add(ep.id))
    setAviso(`🎉 +${ep.pontos} pts — episódio concluído!`)
    clearTimeout(avisoTimer.current)
    avisoTimer.current = setTimeout(() => setAviso(''), 3500)
  }

  const pct = duracao ? (tempo / duracao) * 100 : 0
  const estaConcluido = useCallback(
    (ep) => !!ep && (ep.concluido || concluidos.has(ep.id)),
    [concluidos],
  )

  const value = {
    atual, tocando, tempo, duracao, pct, carregando, aviso,
    tocar, toggle, fechar, estaConcluido,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <MiniPlayer />
      <audio
        ref={audioRef}
        src={url || undefined}
        preload="none"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={concluir}
        onSeeking={impedirAvanco}
        onTimeUpdate={aoTempo}
        onLoadedMetadata={(e) => setDuracao(e.currentTarget.duration)}
      />
    </Ctx.Provider>
  )
}

// Barrinha persistente — aparece em qualquer tela enquanto houver episódio no ar.
function MiniPlayer() {
  const p = usePodcastPlayer()
  const desktop = useDesktop()
  if (!p?.atual) return null
  const ep = p.atual
  return (
    <>
      {p.aviso && (
        <div
          className="fixed inset-x-0 z-[45] flex justify-center px-4"
          style={{ bottom: desktop ? '92px' : 'calc(env(safe-area-inset-bottom, 0px) + 150px)' }}
        >
          <div className="rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-black shadow-[0_10px_24px_-8px_rgb(var(--accent)/0.6)]">
            {p.aviso}
          </div>
        </div>
      )}
      <div
        className="fixed inset-x-0 z-40 px-3"
        style={{ bottom: desktop ? '16px' : 'calc(env(safe-area-inset-bottom, 0px) + 68px)' }}
      >
        <div
          className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border p-2.5 backdrop-blur"
          style={{
            background: 'rgb(var(--surface) / 0.96)',
            borderColor: 'rgb(var(--accent) / 0.3)',
            boxShadow: '0 14px 34px -14px rgba(0,0,0,.7)',
          }}
        >
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-base font-extrabold text-white/95"
            style={{ background: ep.cor || 'rgb(var(--surface-3))' }}
          >
            {ep.id}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-bold">{ep.titulo}</div>
            <div className="text-[10.5px] text-muted">Podcast · Episódio {ep.id}</div>
            {/* progresso só visual — não dá pra arrastar/avançar */}
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-pill bg-surface-3">
              <div className="h-full rounded-pill bg-accent" style={{ width: `${p.pct}%` }} />
            </div>
          </div>
          <button
            onClick={p.toggle}
            aria-label={p.tocando ? 'Pausar' : 'Tocar'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-black"
          >
            {p.carregando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : p.tocando ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={p.fechar}
            aria-label="Fechar player"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-2 tap"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </>
  )
}

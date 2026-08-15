import { createContext, useContext, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, Radio, Loader2 } from 'lucide-react'
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

// Mini-player compacto — só o ícone da Rádio + play/pause.
// MOBILE: barrinha flutuante na lateral direita. DESKTOP: o controle vai no rail
// (ver PodcastRailControl, renderizado pelo DesktopShell).
function MiniPlayer() {
  const p = usePodcastPlayer()
  const desktop = useDesktop()
  const navigate = useNavigate()
  if (!p?.atual) return null
  return (
    <>
      {p.aviso && (
        <div
          className="fixed inset-x-0 z-[45] flex justify-center px-4"
          style={{ bottom: desktop ? '24px' : 'calc(env(safe-area-inset-bottom, 0px) + 150px)' }}
        >
          <div className="rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-black shadow-[0_10px_24px_-8px_rgb(var(--accent)/0.6)]">
            {p.aviso}
          </div>
        </div>
      )}
      {!desktop && (
        <div
          className="fixed right-3 z-40 flex flex-col items-center gap-1 rounded-full border p-1.5 backdrop-blur"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
            background: 'rgb(var(--surface) / 0.96)',
            borderColor: 'rgb(var(--accent) / 0.3)',
            boxShadow: '0 12px 28px -12px rgba(0,0,0,.7)',
          }}
        >
          <button
            onClick={() => navigate('/radio')}
            aria-label="Abrir a Rádio"
            title={p.atual.titulo}
            className="grid h-9 w-9 place-items-center rounded-full text-accent tap"
          >
            <Radio size={18} />
          </button>
          <button
            onClick={p.toggle}
            aria-label={p.tocando ? 'Pausar' : 'Tocar'}
            className="grid h-9 w-9 place-items-center rounded-full bg-accent text-black tap"
          >
            {p.carregando ? (
              <Loader2 size={15} className="animate-spin" />
            ) : p.tocando ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        </div>
      )}
    </>
  )
}

// Controle do Podcast no RAIL do desktop (barra lateral): ícone da Rádio + play/pause.
export function PodcastRailControl() {
  const p = usePodcastPlayer()
  const navigate = useNavigate()
  if (!p?.atual) return null
  return (
    <>
      <span className="my-0.5 h-px w-6 bg-line" />
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-accent-soft p-1">
        <button
          onClick={() => navigate('/radio')}
          aria-label="Abrir a Rádio"
          title={p.atual.titulo}
          className="grid h-8 w-8 place-items-center rounded-xl text-accent tap"
        >
          <Radio size={18} />
        </button>
        <button
          onClick={p.toggle}
          aria-label={p.tocando ? 'Pausar' : 'Tocar'}
          title={p.tocando ? 'Pausar' : 'Tocar'}
          className="grid h-8 w-8 place-items-center rounded-full bg-accent text-black tap"
        >
          {p.carregando ? (
            <Loader2 size={14} className="animate-spin" />
          ) : p.tocando ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
    </>
  )
}

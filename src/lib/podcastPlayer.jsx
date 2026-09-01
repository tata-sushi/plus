import { createContext, useContext, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Play, Pause, Radio, Loader2, X } from 'lucide-react'
import { useDesktop } from './useDesktop.js'
import { supabase } from './supabase.js'

// ─────────────────────────────────────────────────────────────────────────────
// Player GLOBAL do Podcast (Rádio 2.0). Vive no nível do app (montado no
// AppShell), então o áudio CONTINUA tocando ao navegar por outras telas.
// Um mini-player persistente aparece embaixo enquanto houver episódio no ar.
// Regras mantidas: não dá pra avançar; pontua só ao concluir (aqui é visual).
// ─────────────────────────────────────────────────────────────────────────────

const Ctx = createContext(null)
export const usePodcastPlayer = () => useContext(Ctx)

// Velocidades de reprodução (1x até 2x).
const VELOCIDADES = [1, 1.25, 1.5, 1.75, 2]

export function PodcastPlayerProvider({ children }) {
  const audioRef = useRef(null)
  const [carregando, setCarregando] = useState(false)
  const [atual, setAtual] = useState(null) // objeto do episódio no ar
  const [tocando, setTocando] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [duracao, setDuracao] = useState(0)
  const [concluidos, setConcluidos] = useState(() => new Set())
  const [aviso, setAviso] = useState('')
  const [velocidade, setVelocidadeState] = useState(1)
  const velRef = useRef(1) // velocidade atual (aplicada mesmo após trocar de faixa)
  const maxRef = useRef(0) // ponto máximo já ouvido (trava o avançar)
  const avisoTimer = useRef(null)

  const ciclarVelocidade = useCallback(() => {
    const i = VELOCIDADES.indexOf(velRef.current)
    const nova = VELOCIDADES[(i + 1) % VELOCIDADES.length]
    velRef.current = nova
    setVelocidadeState(nova)
    if (audioRef.current) audioRef.current.playbackRate = nova
  }, [])

  // Toca um episódio (áudio hospedado no bucket 'podcast'). Como o player é
  // global, segue tocando ao navegar. Mesmo episódio → alterna play/pause.
  const tocar = useCallback(
    (ep) => {
      const a = audioRef.current
      if (atual?.id === ep.id && a) {
        if (a.paused) a.play()
        else a.pause()
        return
      }
      if (!ep.audio_url) return
      setAtual(ep)
      setTempo(0)
      setDuracao(0)
      maxRef.current = 0
      setCarregando(true)
      const el = audioRef.current
      if (!el) return
      // iOS/Safari: NÃO mexer em currentTime antes de carregar (lança
      // InvalidStateError e trava o play). Um src novo já começa do 0.
      el.src = ep.audio_url
      el.playbackRate = velRef.current
      el.play().catch(() => {})
    },
    [atual],
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
  function mostrarAviso(txt) {
    setAviso(txt)
    clearTimeout(avisoTimer.current)
    avisoTimer.current = setTimeout(() => setAviso(''), 3500)
  }
  function concluir() {
    setTocando(false)
    const ep = atual
    if (!ep || concluidos.has(ep.id)) return
    // Credita de verdade na carteira (idempotente por episódio no servidor).
    // Só marca como concluído localmente se o crédito confirmar — assim uma
    // falha de rede permite tentar de novo ao reouvir.
    supabase
      .rpc('podcast_pontuar', { p_episodio: ep.id })
      .then(({ data, error }) => {
        if (error || !data?.ok) return mostrarAviso('Episódio concluído ✓')
        setConcluidos((s) => new Set(s).add(ep.id))
        mostrarAviso(
          data.pontuou ? `🎉 +${data.pontos} pts — episódio concluído!` : 'Episódio concluído ✓',
        )
      })
      .catch(() => mostrarAviso('Episódio concluído ✓'))
  }

  const pct = duracao ? (tempo / duracao) * 100 : 0
  const estaConcluido = useCallback(
    (ep) => !!ep && (ep.concluido || concluidos.has(ep.id)),
    [concluidos],
  )

  const value = {
    atual, tocando, tempo, duracao, pct, carregando, aviso,
    velocidade, ciclarVelocidade,
    tocar, toggle, fechar, estaConcluido,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <MiniPlayer />
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => {
          setTocando(true)
          setCarregando(false)
        }}
        onPlaying={() => setCarregando(false)}
        onCanPlay={() => setCarregando(false)}
        onWaiting={() => setCarregando(true)}
        onError={(e) => {
          setCarregando(false)
          const c = e.currentTarget.error?.code
          mostrarAviso(c ? `Não consegui tocar o áudio (erro ${c})` : 'Não consegui tocar o áudio')
        }}
        onPause={() => setTocando(false)}
        onEnded={concluir}
        onSeeking={impedirAvanco}
        onTimeUpdate={aoTempo}
        onLoadedMetadata={(e) => {
          setDuracao(e.currentTarget.duration)
          e.currentTarget.playbackRate = velRef.current
        }}
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
  const { pathname } = useLocation()
  if (!p?.atual) return null
  const naRadio = pathname === '/radio'
  return (
    <>
      {p.aviso && (
        <div
          className="fixed inset-x-0 z-[45] flex justify-center px-4"
          style={{ bottom: desktop ? '24px' : 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}
        >
          <div className="rounded-pill bg-accent px-4 py-2 text-[12.5px] font-bold text-black shadow-[0_10px_24px_-8px_rgb(var(--accent)/0.6)]">
            {p.aviso}
          </div>
        </div>
      )}
      {/* Mobile: barrinha QUADRADA, colada na margem esquerda, no meio da tela.
          Só aparece FORA da Rádio (na Rádio o controle já está na tela). */}
      {!desktop && !naRadio && (
        <div
          className="fixed left-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-r-2xl border border-l-0 p-1.5 backdrop-blur"
          style={{
            background: 'rgb(var(--surface) / 0.96)',
            borderColor: 'rgb(var(--accent) / 0.3)',
            boxShadow: '0 12px 28px -12px rgba(0,0,0,.7)',
          }}
        >
          <button
            onClick={p.fechar}
            aria-label="Fechar player"
            className="grid h-6 w-6 place-items-center rounded-full text-muted-2 tap"
          >
            <X size={13} />
          </button>
          <button
            onClick={() => navigate('/radio')}
            aria-label="Abrir a Rádio"
            title={p.atual.titulo}
            className="grid h-9 w-9 place-items-center rounded-lg text-accent tap"
          >
            <Radio size={18} />
          </button>
          <button
            onClick={p.toggle}
            aria-label={p.tocando ? 'Pausar' : 'Tocar'}
            className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-black tap"
          >
            {p.carregando ? (
              <Loader2 size={15} className="animate-spin" />
            ) : p.tocando ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={p.ciclarVelocidade}
            aria-label="Velocidade de reprodução"
            className="rounded-lg bg-fill px-1.5 py-1 text-[10px] font-bold text-muted tap"
          >
            {p.velocidade}x
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
          onClick={p.fechar}
          aria-label="Fechar player"
          className="grid h-6 w-6 place-items-center rounded-full text-muted-2 tap"
        >
          <X size={12} />
        </button>
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
        <button
          onClick={p.ciclarVelocidade}
          aria-label="Velocidade de reprodução"
          title={`Velocidade ${p.velocidade}x`}
          className="rounded-lg bg-bg/70 px-1 py-0.5 text-[10px] font-bold text-muted tap"
        >
          {p.velocidade}x
        </button>
      </div>
    </>
  )
}

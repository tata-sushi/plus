import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Headphones, Check, Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'

// ─────────────────────────────────────────────────────────────────────────────
// Rádio 2.0 — aba PODCAST ("Tatá Cast"). TESTE: visível só para a matrícula 7.
// O áudio de todos os episódios abaixo é um DEMO sintético (~24s) embutido no app
// (carregado sob demanda). É só para validar a disposição e o player tocando
// dentro do app. Episódios/áudios reais entram quando definirmos a hospedagem.
// ─────────────────────────────────────────────────────────────────────────────

const EPISODIOS = [
  {
    id: 1,
    titulo: 'Bem-vindo à Tatá',
    descricao: 'Nossa cultura, nossos valores e o que faz a Tatá ser a Tatá.',
    publico: 'Todos',
    tag: 'Cultura',
    dur: '8 min',
    pontos: 10,
    cor: 'linear-gradient(145deg,#1f7a12,#0a3d03)',
  },
  {
    id: 2,
    titulo: 'Atendimento que encanta no salão',
    descricao: 'Boas práticas pra deixar cada cliente com vontade de voltar.',
    publico: 'Salão',
    tag: null,
    dur: '12 min',
    pontos: 10,
    cor: 'linear-gradient(145deg,#0d5f5a,#052a2c)',
  },
  {
    id: 3,
    titulo: 'Segurança alimentar na cozinha',
    descricao: 'Higiene, armazenamento e os cuidados que não podem faltar.',
    publico: 'Cozinha',
    tag: null,
    dur: '10 min',
    pontos: 10,
    concluido: true,
    cor: 'linear-gradient(145deg,#5a4a0d,#2c2405)',
  },
  {
    id: 4,
    titulo: 'Como brilhar no Tatá Plus',
    descricao: 'Um tour rápido pra você aproveitar tudo que o app oferece.',
    publico: 'Todos',
    tag: 'App',
    dur: '6 min',
    pontos: 5,
    cor: 'linear-gradient(145deg,#3a2f6b,#160f2c)',
  },
]

const mmss = (s) => {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

function Capa({ ep, size = 54 }) {
  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl font-display font-extrabold text-white/95"
      style={{ background: ep.cor, width: size, height: size, fontSize: size * 0.32 }}
    >
      <span className="relative z-10 drop-shadow">{ep.id}</span>
      <Headphones
        size={size * 0.26}
        className="absolute bottom-1 right-1 z-10 text-white/70"
        strokeWidth={2.4}
      />
    </div>
  )
}

export function PodcastTab() {
  const audioRef = useRef(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [carregandoAudio, setCarregandoAudio] = useState(false)
  const [atual, setAtual] = useState(null) // id do episódio no player
  const [tocando, setTocando] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [duracao, setDuracao] = useState(0)

  // O áudio demo (~1MB) é carregado sob demanda — só quando a pessoa dá o 1º play.
  async function garantirAudio() {
    if (audioUrl) return audioUrl
    setCarregandoAudio(true)
    const mod = await import('./podcastDemoAudio.js')
    setCarregandoAudio(false)
    setAudioUrl(mod.podcastDemoAudio)
    return mod.podcastDemoAudio
  }

  async function tocar(ep) {
    const a = audioRef.current
    // mesmo episódio → alterna play/pause
    if (atual === ep.id && a) {
      if (a.paused) a.play()
      else a.pause()
      return
    }
    const url = await garantirAudio()
    setAtual(ep.id)
    setTempo(0)
    const el = audioRef.current
    if (!el) return
    // garante a src no 1º play (antes do re-render do React) — todos os
    // episódios usam o mesmo áudio demo, então só troca de fato uma vez.
    if (!el.src) el.src = url
    el.currentTime = 0
    el.play().catch(() => {})
  }

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (a.paused) a.play()
    else a.pause()
  }

  function buscar(e) {
    const a = audioRef.current
    if (!a || !duracao) return
    a.currentTime = (Number(e.target.value) / 100) * duracao
  }

  const epAtual = EPISODIOS.find((e) => e.id === atual) || null
  const pct = duracao ? (tempo / duracao) * 100 : 0

  return (
    <div className="px-5 pt-2 pb-44">
      {/* Hero do podcast */}
      <div
        className="mb-4 flex items-center gap-3.5 overflow-hidden rounded-card border border-line p-4"
        style={{
          background:
            'radial-gradient(130% 150% at 0% 0%, rgb(var(--accent) / 0.20), rgb(var(--accent) / 0.04) 55%, transparent 72%), rgb(var(--surface))',
        }}
      >
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-accent"
          style={{
            background: 'linear-gradient(150deg,#0f3d05,#061f00)',
            border: '1px solid rgb(var(--accent) / 0.3)',
            boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.5)',
          }}
        >
          <Headphones size={30} strokeWidth={1.9} />
        </div>
        <div className="min-w-0">
          <div className="hstack gap-2">
            <span className="font-display text-xl font-extrabold tracking-tight">Tatá Cast</span>
            <span className="rounded-pill bg-accent px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-black">
              beta
            </span>
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-muted">
            Treinamento no seu ritmo, em áudio. Deu o play, ouviu,{' '}
            <span className="font-semibold text-accent">pontuou</span>.
          </p>
        </div>
      </div>

      {/* Aviso do teste */}
      <div className="mb-4 rounded-xl border border-dashed border-line bg-fill px-3 py-2 text-[11px] leading-snug text-muted-2">
        🔒 Prévia só pra você (matrícula 7). O áudio dos episódios é um{' '}
        <b className="text-muted">demo de ~24s</b> só pra testar o player.
      </div>

      <div className="mb-2.5 mt-1 hstack items-center justify-between px-0.5">
        <div className="font-display text-sm font-bold">Episódios</div>
        <div className="text-[11px] text-muted-2">{EPISODIOS.length} disponíveis</div>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2.5">
        {EPISODIOS.map((ep) => {
          const ativo = atual === ep.id
          return (
            <div
              key={ep.id}
              className={cn(
                'card gap-3 p-2.5 transition-colors',
                ativo ? 'border-accent/50' : '',
              )}
            >
              <div className="hstack items-start gap-3">
                <Capa ep={ep} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold leading-tight">{ep.titulo}</div>
                  <p
                    className="mt-0.5 text-[11.5px] leading-snug text-muted"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {ep.descricao}
                  </p>
                  <div className="mt-2 hstack flex-wrap gap-1.5">
                    <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10.5px] font-bold text-accent">
                      Para: {ep.publico}
                    </span>
                    {ep.tag && (
                      <span className="rounded-pill bg-fill px-2 py-0.5 text-[10.5px] font-semibold text-muted">
                        {ep.tag}
                      </span>
                    )}
                    {ep.concluido && (
                      <span className="hstack gap-1 rounded-pill bg-accent/15 px-2 py-0.5 text-[10.5px] font-bold text-accent">
                        <Check size={11} strokeWidth={3.2} /> concluído
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-2">
                    <b className="font-semibold text-muted">{ep.dur}</b>
                    {' · '}
                    {ep.concluido ? (
                      <span className="font-semibold text-accent">+{ep.pontos} pts ganhos</span>
                    ) : (
                      <>
                        vale <b className="font-semibold text-muted">+{ep.pontos} pts</b>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => tocar(ep)}
                  aria-label={ativo && tocando ? 'Pausar' : 'Tocar'}
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full tap',
                    'bg-accent text-black shadow-[0_6px_14px_-6px_rgb(var(--accent)/0.6)]',
                  )}
                >
                  {carregandoAudio && ativo ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : ativo && tocando ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
              </div>

              {/* progresso no card ativo */}
              {ativo && (
                <div className="mt-2.5">
                  <div className="h-1 overflow-hidden rounded-pill bg-surface-3">
                    <div
                      className="h-full rounded-pill bg-accent transition-[width] duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-2">
                    <span>{mmss(tempo)}</span>
                    <span>{mmss(duracao)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Player fixo — "tocando agora" (acima da barra de navegação) */}
      {epAtual && (
        <div
          className="fixed inset-x-0 z-20 px-3"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)' }}
        >
          <div
            className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border p-2.5 backdrop-blur"
            style={{
              background: 'rgb(var(--surface) / 0.94)',
              borderColor: 'rgb(var(--accent) / 0.3)',
              boxShadow: '0 14px 34px -14px rgba(0,0,0,.7)',
            }}
          >
            <Capa ep={epAtual} size={42} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-bold">{epAtual.titulo}</div>
              <div className="text-[10.5px] text-muted">Tatá Cast · Episódio {epAtual.id}</div>
              <input
                type="range"
                min={0}
                max={100}
                value={pct || 0}
                onChange={buscar}
                aria-label="Progresso do episódio"
                className="mt-1.5 h-1 w-full cursor-pointer"
                style={{ accentColor: 'rgb(var(--accent))' }}
              />
            </div>
            <button
              onClick={togglePlay}
              aria-label={tocando ? 'Pausar' : 'Tocar'}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-black"
            >
              {tocando ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* elemento de áudio único */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="none"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => setTocando(false)}
        onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuracao(e.currentTarget.duration)}
      />
    </div>
  )
}

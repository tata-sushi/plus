import { Play, Pause, Headphones, Check, Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { usePodcastPlayer } from '../lib/podcastPlayer.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// Rádio 2.0 — aba PODCAST. TESTE: visível só para a matrícula 7.
// Episódios vêm do banco (tata_plus.podcast_episodios via RPC podcast_listar,
// carregados no Radio.jsx e passados por props). A reprodução é do PLAYER GLOBAL
// (../lib/podcastPlayer.jsx), então o áudio segue tocando ao sair da Rádio.
// ─────────────────────────────────────────────────────────────────────────────

const mmss = (s) => {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

function Capa({ ep, size = 54 }) {
  if (ep.capa_url) {
    return (
      <div
        className="shrink-0 overflow-hidden rounded-xl bg-surface-2"
        style={{ width: size, height: size }}
      >
        <img src={ep.capa_url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl text-accent"
      style={{ width: size, height: size, background: 'linear-gradient(150deg,#0f3d05,#061f00)' }}
    >
      <Headphones size={size * 0.4} strokeWidth={1.9} />
    </div>
  )
}

export function PodcastTab({ episodios = [] }) {
  const player = usePodcastPlayer()

  return (
    <div className="px-5 pt-1 pb-24">
      <div className="mb-2.5 mt-1 hstack items-center justify-between px-0.5">
        <div className="font-display text-sm font-bold">Episódios</div>
        <div className="text-[11px] text-muted-2">
          {episodios.length} {episodios.length === 1 ? 'episódio' : 'episódios'}
        </div>
      </div>

      {episodios.length === 0 ? (
        <div className="mt-2 rounded-card border border-dashed border-line px-4 py-10 text-center">
          <Headphones size={26} className="mx-auto text-muted-2" />
          <div className="mt-2 text-sm font-semibold">Nenhum episódio ainda</div>
          <div className="mt-1 text-xs text-muted">
            Publique episódios pelo painel de administração → Podcast.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {episodios.map((ep) => {
            const ativo = player.atual?.id === ep.id
            const concluido = player.estaConcluido(ep)
            return (
              <div
                key={ep.id}
                className={cn('card gap-3 p-2.5 transition-colors', ativo ? 'border-accent/50' : '')}
              >
                <div className="hstack items-center gap-3">
                  {/* Capa + pontuação logo abaixo dela (alinhada no centro) */}
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <Capa ep={ep} />
                    <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                      +{ep.pontos} pts
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold leading-tight">{ep.titulo}</div>
                    {ep.legenda && (
                      <p
                        className="mt-0.5 text-[11.5px] leading-snug text-muted"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {ep.legenda}
                      </p>
                    )}
                    <div className="mt-2 hstack flex-wrap gap-1.5">
                      {ep.publico && (
                        <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10.5px] font-bold text-accent">
                          Para: {ep.publico}
                        </span>
                      )}
                      {concluido && (
                        <span className="hstack gap-1 rounded-pill bg-accent/15 px-2 py-0.5 text-[10.5px] font-bold text-accent">
                          <Check size={11} strokeWidth={3.2} /> concluído
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => player.tocar(ep)}
                    aria-label={ativo && player.tocando ? 'Pausar' : 'Tocar'}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-black shadow-[0_6px_14px_-6px_rgb(var(--accent)/0.6)] tap"
                  >
                    {player.carregando && ativo ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : ativo && player.tocando ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>
                </div>

                {ativo && (
                  <div className="mt-2.5">
                    <div className="h-1 overflow-hidden rounded-pill bg-surface-3">
                      <div
                        className="h-full rounded-pill bg-accent transition-[width] duration-200"
                        style={{ width: `${player.pct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-muted-2">
                      <span>{mmss(player.tempo)}</span>
                      <button
                        onClick={player.ciclarVelocidade}
                        aria-label="Velocidade de reprodução"
                        className="rounded-pill bg-fill px-2 py-0.5 text-[10px] font-bold text-muted tap"
                      >
                        {player.velocidade}x
                      </button>
                      <span>{mmss(player.duracao)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

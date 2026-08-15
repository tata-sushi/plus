import { Play, Pause, Headphones, Check, Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { usePodcastPlayer } from '../lib/podcastPlayer.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// Rádio 2.0 — aba PODCAST. TESTE: visível só para a matrícula 7.
// A reprodução é feita pelo PLAYER GLOBAL (../lib/podcastPlayer.jsx), montado no
// AppShell — então o áudio continua tocando ao sair da Rádio (mini-player fixo).
// O áudio dos episódios é um DEMO sintético (~24s). Episódios/áudios reais entram
// quando definirmos a hospedagem.
// ─────────────────────────────────────────────────────────────────────────────

const EPISODIOS = [
  {
    id: 1,
    titulo: 'Bem-vindo à Tatá',
    descricao: 'Nossa cultura, nossos valores e o que faz a Tatá ser a Tatá.',
    publico: 'Todos',
    tag: 'Cultura',
    pontos: 10,
    cor: 'linear-gradient(145deg,#1f7a12,#0a3d03)',
  },
  {
    id: 2,
    titulo: 'Atendimento que encanta no salão',
    descricao: 'Boas práticas pra deixar cada cliente com vontade de voltar.',
    publico: 'Salão',
    tag: null,
    pontos: 10,
    cor: 'linear-gradient(145deg,#0d5f5a,#052a2c)',
  },
  {
    id: 3,
    titulo: 'Segurança alimentar na cozinha',
    descricao: 'Higiene, armazenamento e os cuidados que não podem faltar.',
    publico: 'Cozinha',
    tag: null,
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
    pontos: 5,
    cor: 'linear-gradient(145deg,#3a2f6b,#160f2c)',
  },
]

// Contagem de episódios (usada no cabeçalho fixo da Rádio 2.0).
export const podcastQtd = EPISODIOS.length

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
  const player = usePodcastPlayer()

  return (
    <div className="px-5 pt-1 pb-24">
      {/* Aviso do teste + regra de pontuação */}
      <div className="mb-4 rounded-xl border border-dashed border-line bg-fill px-3 py-2 text-[11px] leading-snug text-muted-2">
        🔒 Prévia só pra você (matrícula 7). O áudio é um{' '}
        <b className="text-muted">demo de ~24s</b> só pra testar o player.
        <br />
        🎧 Pra pontuar, <b className="text-muted">ouça até o fim</b> — não dá pra
        adiantar o áudio.
      </div>

      <div className="mb-2.5 mt-1 hstack items-center justify-between px-0.5">
        <div className="font-display text-sm font-bold">Episódios</div>
        <div className="text-[11px] text-muted-2">{EPISODIOS.length} disponíveis</div>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2.5">
        {EPISODIOS.map((ep) => {
          const ativo = player.atual?.id === ep.id
          const concluido = player.estaConcluido(ep)
          return (
            <div
              key={ep.id}
              className={cn('card gap-3 p-2.5 transition-colors', ativo ? 'border-accent/50' : '')}
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
                    {concluido && (
                      <span className="hstack gap-1 rounded-pill bg-accent/15 px-2 py-0.5 text-[10.5px] font-bold text-accent">
                        <Check size={11} strokeWidth={3.2} /> concluído
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-2">
                    {concluido ? (
                      <span className="font-semibold text-accent">+{ep.pontos} pts ganhos</span>
                    ) : (
                      <>
                        vale <b className="font-semibold text-muted">+{ep.pontos} pts</b>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => player.tocar(ep)}
                  aria-label={ativo && player.tocando ? 'Pausar' : 'Tocar'}
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full tap',
                    'bg-accent text-black shadow-[0_6px_14px_-6px_rgb(var(--accent)/0.6)]',
                  )}
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

              {/* progresso no card ativo */}
              {ativo && (
                <div className="mt-2.5">
                  <div className="h-1 overflow-hidden rounded-pill bg-surface-3">
                    <div
                      className="h-full rounded-pill bg-accent transition-[width] duration-200"
                      style={{ width: `${player.pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-2">
                    <span>{mmss(player.tempo)}</span>
                    <span>{mmss(player.duracao)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

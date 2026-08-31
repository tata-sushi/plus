import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw, HelpCircle, Check, Trophy, Loader2, Clock, Flame, X, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { Header } from '../components/Header.jsx'
import { cn } from '../lib/cn'

const JOGO = 'memoria'
const PARES = 8 // 8 pares = 16 cartas (grade 4×4)
// Emojis temáticos (restaurante / oriental) — sorteia PARES por dia.
const EMOJIS = ['🍣', '🍤', '🍜', '🍥', '🥟', '🍶', '🐟', '🍚', '🍙', '🍱', '🧋', '🦐', '🍡', '🥑', '🌶️', '🍢']

function fmtTempo(s) {
  if (s == null) return '—'
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// PRNG determinístico por semente (mulberry32) → mesmo tabuleiro pra mesma fase.
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function embaralhar(arr, rnd) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
// Tabuleiro determinístico da fase: escolhe PARES emojis, duplica e embaralha.
function gerarTabuleiro(fase) {
  const rnd = mulberry32(hashSeed(JOGO + ':' + fase))
  const escolhidos = embaralhar(EMOJIS, rnd).slice(0, PARES)
  const cartas = escolhidos.flatMap((e, par) => [
    { emoji: e, par },
    { emoji: e, par },
  ])
  return embaralhar(cartas, rnd).map((c, id) => ({ ...c, id }))
}

export function Memoria() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [params] = useSearchParams()
  // Prévia (só matrícula 7): ?fase=N força uma fase pra conferir sem esperar dias.
  const mat7 = String(usuario?.matricula) === '7'
  const previewFase = mat7 ? Math.floor(Number(params.get('fase'))) : 0
  const preview = previewFase >= 1

  const [estado, setEstado] = useState(null) // null = carregando
  const [cartas, setCartas] = useState([])
  const [viradas, setViradas] = useState([]) // ids virados agora (0..2)
  const [achados, setAchados] = useState(() => new Set()) // pares encontrados
  const [movimentos, setMovimentos] = useState(0)
  const [resolvido, setResolvido] = useState(false)
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const [pontosGanhos, setPontosGanhos] = useState(0)
  const [segundos, setSegundos] = useState(0)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [intro, setIntro] = useState(false)
  const [travado, setTravado] = useState(false) // durante a checagem de 2 cartas
  const inicio = useRef(Date.now())
  const enviando = useRef(false)

  const completadas = estado?.completadas ?? 0
  const jogouHoje = !preview && !!estado?.jogou_hoje
  // Já jogou hoje → mostra o tabuleiro resolvido (todos os pares), sem revelar a próxima.
  const fase = preview ? previewFase : jogouHoje ? Math.max(1, completadas) : completadas + 1

  const tabuleiro = useMemo(
    () => (estado?.ok || preview ? gerarTabuleiro(fase) : null),
    [estado?.ok, preview, fase],
  )

  // carrega estado do jogo
  useEffect(() => {
    let ativo = true
    supabase.rpc('jogo_estado', { p_jogo: JOGO }).then(({ data }) => {
      if (!ativo) return
      setEstado(data?.ok ? data : { ok: true, completadas: 0, jogou_hoje: false, streak: 0 })
    })
    return () => {
      ativo = false
    }
  }, [])

  // primeiro acesso: boas-vindas uma vez (por aparelho)
  useEffect(() => {
    try {
      if (!localStorage.getItem('memoria.intro.v1')) setIntro(true)
    } catch {
      /* ignore */
    }
  }, [])

  // (re)inicia quando o tabuleiro muda
  useEffect(() => {
    if (!tabuleiro) return
    setCartas(tabuleiro)
    setViradas([])
    setMovimentos(0)
    setTravado(false)
    if (jogouHoje) {
      setAchados(new Set(tabuleiro.map((c) => c.par)))
      setResolvido(true)
      setGanhouAgora(false)
    } else {
      setAchados(new Set())
      setResolvido(false)
      setGanhouAgora(false)
    }
    inicio.current = Date.now()
    setSegundos(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabuleiro])

  // cronômetro
  useEffect(() => {
    if (resolvido || intro || !tabuleiro) return
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [resolvido, intro, tabuleiro])

  // vitória (todos os pares)
  useEffect(() => {
    if (!tabuleiro || resolvido || jogouHoje) return
    if (achados.size === PARES) ganhar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achados])

  function virar(carta) {
    if (resolvido || travado) return
    if (viradas.includes(carta.id) || achados.has(carta.par)) return
    tapHaptic()
    const nv = [...viradas, carta.id]
    setViradas(nv)
    if (nv.length === 2) {
      setMovimentos((m) => m + 1)
      const a = cartas.find((c) => c.id === nv[0])
      const b = cartas.find((c) => c.id === nv[1])
      if (a && b && a.par === b.par) {
        setAchados((s) => new Set(s).add(a.par))
        setViradas([])
      } else {
        setTravado(true)
        setTimeout(() => {
          setViradas([])
          setTravado(false)
        }, 800)
      }
    }
  }

  async function ganhar() {
    if (enviando.current) return
    const tempo = Math.floor((Date.now() - inicio.current) / 1000)
    setSegundos(tempo)
    tapHaptic()
    setResolvido(true)
    setGanhouAgora(true)
    if (preview) return
    enviando.current = true
    const { data } = await supabase.rpc('jogo_concluir', { p_jogo: JOGO, p_fase: fase, p_tempo_seg: tempo })
    enviando.current = false
    if (data?.ok) {
      setPontosGanhos(data.pontos_ganhos || 0)
      setEstado((e) => ({ ...e, ...data }))
    }
  }

  function recomecar() {
    if (resolvido) return
    tapHaptic()
    setViradas([])
    setAchados(new Set())
    setMovimentos(0)
    setTravado(false)
    inicio.current = Date.now()
    setSegundos(0)
  }

  function fecharIntro() {
    try {
      localStorage.setItem('memoria.intro.v1', '1')
    } catch {
      /* ignore */
    }
    inicio.current = Date.now()
    setSegundos(0)
    setIntro(false)
  }

  const carregando = !estado && !preview

  // BETA: jogo travado para todos menos o dono (mat 7) enquanto não vai pra
  // produção. Bloqueia tanto jogar quanto pontuar (mesmo entrando pela URL).
  if (usuario && !mat7) {
    return (
      <div className="min-h-[100dvh] bg-bg">
        <Header />
        <div className="px-5 pt-2">
          <button
            onClick={() => {
              tapHaptic()
              navigate(-1)
            }}
            className="hstack gap-1 text-sm font-medium text-muted tap"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
        <div className="mx-auto w-full max-w-[420px] px-5 pt-24 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-muted-2">
            <Lock size={26} />
          </div>
          <div className="mt-4 font-display text-lg font-bold">Em breve</div>
          <p className="mx-auto mt-1 max-w-[300px] text-sm text-muted">
            Este jogo ainda está em testes. Logo ele chega pra todo mundo!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-bg">
      <Header />
      <div className="px-5 pt-2">
        <button
          onClick={() => {
            tapHaptic()
            navigate(-1)
          }}
          className="hstack gap-1 text-sm font-medium text-muted tap"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      {carregando || !tabuleiro ? (
        <div className="hstack justify-center py-24 text-muted-2">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[420px] px-5 pb-28 pt-4">
          <div className="mb-5 text-center">
            <div className="font-display text-[19px] font-bold leading-tight">Memória Tatá</div>
            {preview && (
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Prévia · Fase {fase} · não pontua
              </div>
            )}
          </div>

          {/* barra: 🔥 ofensiva · ⏱ tempo · ↺ recomeçar + ? */}
          <div className="mb-4 grid grid-cols-3 items-center px-2 text-muted">
            <span className="hstack justify-self-start gap-1.5 text-sm font-semibold">
              <Flame size={18} className="text-accent" /> {estado?.streak || 0}
            </span>
            <span className="hstack justify-self-center gap-1.5 font-mono text-sm">
              <Clock size={18} /> {fmtTempo(segundos)}
            </span>
            <span className="hstack justify-self-end gap-4">
              <button
                onClick={recomecar}
                disabled={resolvido}
                aria-label="Recomeçar"
                title="Recomeçar"
                className="tap disabled:opacity-40"
              >
                <RotateCcw size={18} />
              </button>
              <button onClick={() => setAjudaAberta(true)} aria-label="Como jogar" title="Como jogar" className="tap">
                <HelpCircle size={18} />
              </button>
            </span>
          </div>

          {/* tabuleiro de cartas */}
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="grid grid-cols-4 gap-2.5">
              {cartas.map((carta) => {
                const aberta = viradas.includes(carta.id) || achados.has(carta.par) || resolvido
                const casada = achados.has(carta.par)
                return (
                  <button
                    key={carta.id}
                    onClick={() => virar(carta)}
                    disabled={aberta || travado}
                    aria-label={aberta ? carta.emoji : 'Carta virada'}
                    className={cn(
                      'grid aspect-square place-items-center rounded-xl text-[clamp(22px,7.5vw,36px)] transition-colors tap',
                      aberta
                        ? casada
                          ? 'bg-accent-soft ring-1 ring-accent/50'
                          : 'bg-surface-2'
                        : 'bg-[#1f2024] active:bg-[#26272c]',
                    )}
                  >
                    {aberta ? (
                      <span>{carta.emoji}</span>
                    ) : (
                      <span className="text-base text-accent/50">🍥</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* resultado / progresso */}
          {resolvido ? (
            <div className="mt-5 hstack gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 px-4 py-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-black">
                {ganhouAgora ? <Check size={22} strokeWidth={3} /> : <Trophy size={20} />}
              </div>
              <div className="min-w-0">
                <div className="font-display text-base font-bold text-accent-ink">
                  {ganhouAgora ? 'Todos os pares!' : 'Fase concluída hoje'}
                </div>
                <div className="text-sm text-muted">
                  {preview ? (
                    'Prévia · não pontua'
                  ) : ganhouAgora && pontosGanhos > 0 ? (
                    <>
                      <b className="text-text">+{pontosGanhos}</b> pontos · Volte amanhã
                    </>
                  ) : (
                    'Volte amanhã'
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-center text-xs text-muted-2">
              {achados.size}/{PARES} pares · {movimentos} jogadas
            </p>
          )}
        </div>
      )}

      {ajudaAberta && <FolhaAjuda onClose={() => setAjudaAberta(false)} />}
      {intro && <FolhaIntro onClose={fecharIntro} />}
    </div>
  )
}

// Folha "Como jogar" — mesmo padrão dos outros jogos.
function FolhaAjuda({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-bg px-5 pb-8 pt-4 shadow-xl sm:max-w-[520px] sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line sm:hidden" />
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        <div className="font-display text-lg font-bold">Como jogar</div>
        <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <li>• Vire <b className="text-text">duas cartas</b> por vez.</li>
          <li>• Achou o <b className="text-text">par igual</b>? Ele fica aberto.</li>
          <li>• Errou? As cartas viram de novo — memorize onde estão.</li>
          <li>• Complete <b className="text-text">todos os pares</b> pra vencer.</li>
          <li>• 1 rodada por dia · tempo cronometrado.</li>
        </ul>
      </div>
    </div>,
    document.body,
  )
}

// Boas-vindas — só no primeiro acesso.
function FolhaIntro({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[86dvh] w-full max-w-[400px] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-bg px-5 pb-6 pt-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-3xl">🍣</div>
          <div className="font-display text-xl font-bold">Bem-vindo à Memória Tatá!</div>
          <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-muted">
            Um tabuleiro novo <b className="text-text">todo dia</b>. Ache os pares, mantenha a{' '}
            <b className="text-text">ofensiva 🔥</b>.
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm font-bold text-text">Como funciona</div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
            <li>• Vire <b className="text-text">duas cartas</b> e ache os pares iguais.</li>
            <li>• Errou, elas viram de novo — <b className="text-text">memorize</b>.</li>
            <li>• Complete todos os pares.</li>
            <li>• 1 rodada por dia · tempo cronometrado.</li>
          </ul>
        </div>
        <button onClick={onClose} className="btn-primary mt-5 w-full !py-3 text-sm font-bold">
          Bora jogar!
        </button>
      </div>
    </div>,
    document.body,
  )
}

// React.lazy exige export default.
export default Memoria

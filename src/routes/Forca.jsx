import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Check, Trophy, Loader2, Clock, Flame, X, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { Header } from '../components/Header.jsx'
import { cn } from '../lib/cn'
import PALAVRAS from '../lib/palavras-tata.js'
import { podeBetaJogos } from '../lib/beta.js'

const JOGO = 'forca'
const MAX_ERROS = 6 // cabeça, tronco, 2 braços, 2 pernas
const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function fmtTempo(s) {
  if (s == null) return '0:00'
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// PRNG determinístico por semente → mesma palavra pra mesma fase (todo mundo joga a mesma).
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
function palavraDaFase(fase) {
  const rnd = mulberry32(hashSeed(JOGO + ':' + fase))
  return PALAVRAS[Math.floor(rnd() * PALAVRAS.length)]
}

// Bonequinho da forca — vai aparecendo conforme os erros (0 a 6).
function Boneco({ erros }) {
  const cor = erros >= MAX_ERROS ? 'rgb(var(--danger))' : 'currentColor'
  return (
    <svg viewBox="0 0 120 140" className="h-36 w-auto text-muted" aria-hidden="true">
      {/* forca */}
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5">
        <line x1="12" y1="132" x2="72" y2="132" />
        <line x1="32" y1="132" x2="32" y2="12" />
        <line x1="32" y1="12" x2="86" y2="12" />
        <line x1="86" y1="12" x2="86" y2="26" />
      </g>
      {/* partes do corpo */}
      <g stroke={cor} strokeWidth="3.5" strokeLinecap="round" fill="none">
        {erros >= 1 && <circle cx="86" cy="38" r="12" />}
        {erros >= 2 && <line x1="86" y1="50" x2="86" y2="86" />}
        {erros >= 3 && <line x1="86" y1="60" x2="70" y2="74" />}
        {erros >= 4 && <line x1="86" y1="60" x2="102" y2="74" />}
        {erros >= 5 && <line x1="86" y1="86" x2="72" y2="106" />}
        {erros >= 6 && <line x1="86" y1="86" x2="100" y2="106" />}
      </g>
    </svg>
  )
}

export function Forca() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [params] = useSearchParams()
  const mat7 = String(usuario?.matricula) === '7'
  const previewFase = mat7 ? Math.floor(Number(params.get('fase'))) : 0
  const preview = previewFase >= 1

  const [estado, setEstado] = useState(null)
  const [letras, setLetras] = useState(() => new Set()) // letras já chutadas (certas + erradas)
  const [resolvido, setResolvido] = useState(false)
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const [perdeu, setPerdeu] = useState(false)
  const [pontosGanhos, setPontosGanhos] = useState(0)
  const [segundos, setSegundos] = useState(0)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [intro, setIntro] = useState(false)
  const inicio = useRef(Date.now())
  const enviando = useRef(false)

  const completadas = estado?.completadas ?? 0
  const jogouHoje = !preview && !!estado?.jogou_hoje
  const fase = preview ? previewFase : jogouHoje ? Math.max(1, completadas) : completadas + 1

  const item = useMemo(() => (estado?.ok || preview ? palavraDaFase(fase) : null), [estado?.ok, preview, fase])
  const palavra = item?.p || ''
  const dica = item?.d || ''
  const letrasPalavra = useMemo(() => new Set(palavra.split('')), [palavra])
  const erros = useMemo(() => [...letras].filter((l) => !letrasPalavra.has(l)).length, [letras, letrasPalavra])
  const completou = !!palavra && palavra.split('').every((l) => letras.has(l))

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

  // boas-vindas no primeiro acesso (por aparelho)
  useEffect(() => {
    try {
      if (!localStorage.getItem('forca.intro.v1')) setIntro(true)
    } catch {
      /* ignore */
    }
  }, [])

  // (re)inicia quando a palavra muda
  useEffect(() => {
    if (!palavra) return
    setLetras(new Set())
    setPerdeu(false)
    setGanhouAgora(false)
    if (jogouHoje) {
      setResolvido(true)
    } else {
      setResolvido(false)
    }
    inicio.current = Date.now()
    setSegundos(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palavra])

  // cronômetro
  useEffect(() => {
    if (resolvido || intro || !palavra) return
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [resolvido, intro, palavra])

  // vitória / derrota
  useEffect(() => {
    if (!palavra || resolvido || jogouHoje) return
    if (completou) ganhar()
    else if (erros >= MAX_ERROS) perder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letras])

  function chutar(l) {
    if (resolvido || letras.has(l)) return
    tapHaptic()
    setLetras((s) => new Set(s).add(l))
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
    const { data } = await supabase.rpc('jogo_concluir', { p_jogo: JOGO, p_fase: fase, p_tempo_seg: tempo, p_resolvido: true })
    enviando.current = false
    if (data?.ok) {
      setPontosGanhos(data.pontos_ganhos || 0)
      setEstado((e) => ({ ...e, ...data }))
    }
  }

  async function perder() {
    if (enviando.current) return
    setResolvido(true)
    setPerdeu(true)
    if (preview) return
    enviando.current = true
    const { data } = await supabase.rpc('jogo_concluir', { p_jogo: JOGO, p_fase: fase, p_tempo_seg: null, p_resolvido: false })
    enviando.current = false
    if (data?.ok) setEstado((e) => ({ ...e, ...data }))
  }

  function fecharIntro() {
    try {
      localStorage.setItem('forca.intro.v1', '1')
    } catch {
      /* ignore */
    }
    inicio.current = Date.now()
    setSegundos(0)
    setIntro(false)
  }

  const carregando = !estado && !preview

  // BETA: travado para todos menos os testadores (ver lib/beta.js) enquanto não vai pra produção.
  if (usuario && !podeBetaJogos(usuario)) {
    return (
      <div className="min-h-[100dvh] bg-bg">
        <Header />
        <div className="px-5 pt-2">
          <button onClick={() => { tapHaptic(); navigate(-1) }} className="hstack gap-1 text-sm font-medium text-muted tap">
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
        <div className="mx-auto w-full max-w-[420px] px-5 pt-24 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-muted-2">
            <Lock size={26} />
          </div>
          <div className="mt-4 font-display text-lg font-bold">Em breve</div>
          <p className="mx-auto mt-1 max-w-[300px] text-sm text-muted">Este jogo ainda está em testes. Logo ele chega pra todo mundo!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-bg">
      <Header />
      <div className="px-5 pt-2">
        <button onClick={() => { tapHaptic(); navigate(-1) }} className="hstack gap-1 text-sm font-medium text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      {carregando || !palavra ? (
        <div className="hstack justify-center py-24 text-muted-2">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[420px] px-5 pb-28 pt-4">
          <div className="mb-4 text-center">
            <div className="font-display text-[19px] font-bold leading-tight">Forca</div>
            {preview && (
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Prévia · Fase {fase} · não pontua
              </div>
            )}
          </div>

          {/* barra: 🔥 ofensiva · ⏱ tempo · ? */}
          <div className="mb-3 grid grid-cols-3 items-center px-2 text-muted">
            <span className="hstack justify-self-start gap-1.5 text-sm font-semibold">
              <Flame size={18} className="text-accent" /> {estado?.streak || 0}
            </span>
            <span className="hstack justify-self-center gap-1.5 font-mono text-sm">
              <Clock size={18} /> {fmtTempo(segundos)}
            </span>
            <span className="justify-self-end">
              <button onClick={() => setAjudaAberta(true)} aria-label="Como jogar" title="Como jogar" className="tap">
                <HelpCircle size={18} />
              </button>
            </span>
          </div>

          {/* boneco + dica */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="grid place-items-center">
              <Boneco erros={erros} />
            </div>
            <div className="mt-1 text-center text-sm text-muted">
              <span className="text-muted-2">Dica: </span>
              {dica}
            </div>
          </div>

          {/* palavra */}
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {palavra.split('').map((l, i) => {
              const mostra = letras.has(l) || resolvido
              const errou = resolvido && perdeu && !letras.has(l)
              return (
                <span
                  key={i}
                  className={cn(
                    'grid h-11 w-8 place-items-center rounded-md border-b-2 pb-0.5 font-display text-2xl font-bold',
                    errou ? 'border-danger text-danger' : 'border-line text-text',
                  )}
                >
                  {mostra ? l : ''}
                </span>
              )
            })}
          </div>

          {/* teclado */}
          <div className="mt-6 grid grid-cols-7 gap-1.5">
            {ALFA.map((l) => {
              const usada = letras.has(l)
              const certa = usada && letrasPalavra.has(l)
              const errada = usada && !letrasPalavra.has(l)
              return (
                <button
                  key={l}
                  onClick={() => chutar(l)}
                  disabled={usada || resolvido}
                  className={cn(
                    'grid aspect-[4/5] place-items-center rounded-lg text-sm font-bold tap transition-colors',
                    certa && 'bg-accent-soft text-accent',
                    errada && 'bg-surface text-muted-2 line-through opacity-50',
                    !usada && 'bg-surface-2 text-text active:bg-[#2a2b30]',
                    resolvido && !usada && 'opacity-40',
                  )}
                >
                  {l}
                </button>
              )
            })}
          </div>

          {/* resultado */}
          {resolvido && (
            <div
              className={cn(
                'mt-6 hstack gap-3 rounded-2xl border px-4 py-3.5',
                perdeu ? 'border-danger/40 bg-danger/10' : 'border-accent/40 bg-accent-soft/60',
              )}
            >
              <div
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-full',
                  perdeu ? 'bg-danger text-white' : 'bg-accent text-black',
                )}
              >
                {perdeu ? <X size={22} strokeWidth={3} /> : ganhouAgora ? <Check size={22} strokeWidth={3} /> : <Trophy size={20} />}
              </div>
              <div className="min-w-0">
                <div className={cn('font-display text-base font-bold', perdeu ? 'text-danger' : 'text-accent-ink')}>
                  {perdeu ? 'Não foi dessa vez' : ganhouAgora ? 'Acertou!' : 'Fase concluída hoje'}
                </div>
                <div className="text-sm text-muted">
                  {perdeu ? (
                    <>
                      A palavra era <b className="text-text">{palavra}</b> · Volte amanhã
                    </>
                  ) : preview ? (
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
          )}
        </div>
      )}

      {ajudaAberta && <FolhaAjuda onClose={() => setAjudaAberta(false)} />}
      {intro && <FolhaIntro onClose={fecharIntro} />}
    </div>
  )
}

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
          <li>• Descubra a <b className="text-text">palavra escondida</b> tocando nas letras.</li>
          <li>• A <b className="text-text">dica</b> mostra do que se trata.</li>
          <li>• Cada letra errada desenha uma parte do bonequinho.</li>
          <li>• São <b className="text-text">6 erros</b> no máximo. Complete antes disso pra vencer.</li>
          <li>• 1 palavra por dia · tempo cronometrado.</li>
        </ul>
      </div>
    </div>,
    document.body,
  )
}

function FolhaIntro({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[86dvh] w-full max-w-[400px] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-bg px-5 pb-6 pt-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-3xl">🔤</div>
          <div className="font-display text-xl font-bold">Bem-vindo à Forca!</div>
          <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-muted">
            Uma palavra nova <b className="text-text">todo dia</b>, sempre do nosso mundo. Adivinhe e mantenha a{' '}
            <b className="text-text">ofensiva 🔥</b>.
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm font-bold text-text">Como funciona</div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
            <li>• Toque nas letras pra montar a palavra.</li>
            <li>• Use a dica pra ajudar.</li>
            <li>• Errou 6 vezes? O bonequinho fica pronto e acaba.</li>
            <li>• 1 palavra por dia · tempo cronometrado.</li>
          </ul>
        </div>
        <button onClick={onClose} className="btn-primary mt-5 w-full !py-3 text-sm font-bold">Bora jogar!</button>
      </div>
    </div>,
    document.body,
  )
}

export default Forca

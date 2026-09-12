import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Check, Trophy, Loader2, Clock, Flame, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { Header } from '../components/Header.jsx'
import { cn } from '../lib/cn'
import FORCA from '../lib/palavras-forca.js'
import { TECLADO } from '../lib/termo.js'

const JOGO = 'forca'
const MAX_ERROS = 6 // cabeça, tronco, 2 braços, 2 pernas
// Teclado QWERTY igual ao Termo, SEM a tecla de apagar (na Forca cada letra é
// um chute direto — não dá pra desfazer).
const LINHAS = TECLADO.map((linha) => linha.filter((k) => k !== 'APAGAR'))

function fmtTempo(s) {
  if (s == null) return '0:00'
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// Programa de 200 dias: fase 1 → dia 1, fase 2 → dia 2… (cicla após o fim).
// Determinístico: todo mundo na mesma fase joga a mesma palavra.
function palavraDaFase(fase) {
  const i = (((Math.max(1, fase) - 1) % FORCA.length) + FORCA.length) % FORCA.length
  return FORCA[i]
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
  const palavra = item?.n || '' // normalizada: A-Z + espaço (separador), sem acento — é o que se joga
  const display = item?.p || '' // como aparece na revelação (com acento/espaço)
  const dica = item?.d || ''
  // só letras contam (o espaço em nomes compostos já aparece revelado)
  const letrasPalavra = useMemo(() => new Set(palavra.replace(/ /g, '').split('')), [palavra])
  const erros = useMemo(() => [...letras].filter((l) => !letrasPalavra.has(l)).length, [letras, letrasPalavra])
  const completou = !!palavra && palavra.split('').every((l) => l === ' ' || letras.has(l))

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
            <div className="mt-1 text-center text-sm text-muted">{dica}</div>
          </div>

          {/* palavra — nomes compostos quebram em linhas (um bloco por palavra) */}
          <div className="mt-5 flex flex-col items-center gap-2">
            {palavra.split(' ').map((bloco, bi) => (
              <div key={bi} className="flex flex-wrap justify-center gap-1.5">
                {bloco.split('').map((l, i) => {
                  const mostra = letras.has(l) || resolvido
                  const errou = resolvido && perdeu && !letras.has(l)
                  return (
                    <span
                      key={i}
                      className={cn(
                        'grid h-11 w-11 place-items-center rounded-md border-2 font-display text-2xl font-bold leading-none',
                        errou ? 'border-danger text-danger' : 'border-line text-text',
                      )}
                    >
                      {mostra ? l : ''}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>

          {/* teclado — QWERTY no estilo do Termo (sem apagar) */}
          <div className="mt-6 flex flex-col gap-1.5">
            {LINHAS.map((linha, i) => (
              <div key={i} className="flex justify-center gap-1.5">
                {linha.map((l) => (
                  <button
                    key={l}
                    onClick={() => chutar(l)}
                    disabled={resolvido}
                    className={cn(
                      'grid h-12 max-w-[38px] flex-1 place-items-center rounded-md bg-surface text-sm font-bold uppercase text-text tap transition-colors',
                      resolvido && 'opacity-40',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            ))}
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
                      A palavra era <b className="text-text">{display}</b> · Volte amanhã
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

      {ajudaAberta && <FolhaComoJogar onClose={() => setAjudaAberta(false)} />}
      {intro && <FolhaComoJogar primeiro onClose={fecharIntro} />}
    </div>
  )
}

// Simulação animada: "chuta" letras uma a uma — as certas revelam na palavra,
// as erradas desenham o boneco. Demonstra a Forca (alvo SUSHI).
const DEMO_PALAVRA = 'SUSHI'
const DEMO_SEQ = [
  { l: 'A', ok: false },
  { l: 'S', ok: true },
  { l: 'U', ok: true },
  { l: 'E', ok: false },
  { l: 'H', ok: true },
  { l: 'I', ok: true },
]

function DemoForca() {
  const [chutadas, setChutadas] = useState(() => new Set())
  const [erros, setErros] = useState(0)
  const cancel = useRef(false)

  useEffect(() => {
    cancel.current = false
    const reduz =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduz) {
      setChutadas(new Set(DEMO_PALAVRA.split('')))
      setErros(DEMO_SEQ.filter((s) => !s.ok).length)
      return
    }
    const timers = []
    const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)))
    async function run() {
      while (!cancel.current) {
        setChutadas(new Set())
        setErros(0)
        await wait(700)
        for (const s of DEMO_SEQ) {
          if (cancel.current) break
          if (s.ok) setChutadas((c) => new Set(c).add(s.l))
          else setErros((e) => e + 1)
          await wait(620)
        }
        await wait(1900)
      }
    }
    run()
    return () => {
      cancel.current = true
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      <Boneco erros={erros} />
      <div className="flex justify-center gap-1.5">
        {DEMO_PALAVRA.split('').map((l, i) => {
          const mostra = chutadas.has(l)
          return (
            <span
              key={i}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-md border-2 font-display text-xl font-bold transition-colors duration-200',
                mostra ? 'border-accent text-text' : 'border-line text-text',
              )}
            >
              {mostra ? l : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// Folha "Como jogar" / boas-vindas — com a simulação animada.
function FolhaComoJogar({ onClose, primeiro }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[88dvh] w-full max-w-[400px] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-bg px-5 pb-6 pt-6 shadow-xl">
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        <div className="text-center">
          <div className="font-display text-lg font-bold">{primeiro ? 'Bem-vindo à Forca!' : 'Como jogar'}</div>
          <p className="mx-auto mt-1.5 max-w-[330px] text-sm leading-relaxed text-muted">
            Descubra a <b className="text-text">palavra do dia</b> tocando nas letras, sempre no mundo do{' '}
            <b className="text-text">TATÁ</b>. Veja como funciona:
          </p>
        </div>

        <div className="my-4">
          <DemoForca />
        </div>

        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <li>• Toque nas letras pra descobrir a <b className="text-text">palavra</b>.</li>
          <li>• A <b className="text-text">dica</b> mostra do que se trata.</li>
          <li>• Cada letra <b className="text-text">errada</b> desenha uma parte do boneco.</li>
          <li>• São <b className="text-text">6 erros</b> no máximo — complete antes disso.</li>
          <li>• <b className="text-text">Uma palavra por dia</b> para manter a ofensiva 🔥.</li>
        </ul>

        <button onClick={onClose} className="btn-primary mt-5 w-full !py-3 text-sm font-bold">
          {primeiro ? 'Bora jogar!' : 'Entendi'}
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default Forca

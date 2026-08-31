import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw, HelpCircle, Check, Trophy, Loader2, Clock, Flame, X, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { Header } from '../components/Header.jsx'
import { cn } from '../lib/cn'
import PALAVRAS from '../lib/palavras-tata.js'

const JOGO = 'anagrama'

function fmtTempo(s) {
  if (s == null) return '0:00'
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

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
function palavraDaFase(fase) {
  const rnd = mulberry32(hashSeed(JOGO + ':' + fase))
  return PALAVRAS[Math.floor(rnd() * PALAVRAS.length)]
}
// Letras embaralhadas (com id, pra lidar com letras repetidas). Determinístico por fase.
function letrasEmbaralhadas(fase, palavra) {
  const rnd = mulberry32(hashSeed(JOGO + ':letras:' + fase))
  const tiles = palavra.split('').map((ch, id) => ({ id, ch }))
  let mis = embaralhar(tiles, rnd)
  if (palavra.length > 1 && mis.map((t) => t.ch).join('') === palavra) {
    mis = [...mis.slice(1), mis[0]] // evita cair já na ordem certa
  }
  return mis
}

export function Anagrama() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [params] = useSearchParams()
  const mat7 = String(usuario?.matricula) === '7'
  const previewFase = mat7 ? Math.floor(Number(params.get('fase'))) : 0
  const preview = previewFase >= 1

  const [estado, setEstado] = useState(null)
  const [ordem, setOrdem] = useState([]) // tiles embaralhados fixos do dia
  const [montada, setMontada] = useState([]) // ids na ordem que o jogador montou
  const [resolvido, setResolvido] = useState(false)
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const [errou, setErrou] = useState(false)
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
  const tiles = useMemo(() => (palavra ? letrasEmbaralhadas(fase, palavra) : []), [palavra, fase])
  const chDe = (id) => ordem.find((t) => t.id === id)?.ch || ''
  const pool = ordem.filter((t) => !montada.includes(t.id))
  const montadaStr = montada.map(chDe).join('')

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

  useEffect(() => {
    try {
      if (!localStorage.getItem('anagrama.intro.v1')) setIntro(true)
    } catch {
      /* ignore */
    }
  }, [])

  // (re)inicia quando as letras mudam
  useEffect(() => {
    if (!palavra) return
    setOrdem(tiles)
    setMontada([])
    setErrou(false)
    setGanhouAgora(false)
    setResolvido(!!jogouHoje)
    inicio.current = Date.now()
    setSegundos(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles])

  useEffect(() => {
    if (resolvido || intro || !palavra) return
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [resolvido, intro, palavra])

  // checa quando completa a palavra
  useEffect(() => {
    if (!palavra || resolvido || jogouHoje) return
    if (montada.length === palavra.length) {
      if (montadaStr === palavra) ganhar()
      else {
        setErrou(true)
        const t = setTimeout(() => setErrou(false), 600)
        return () => clearTimeout(t)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montada])

  function colocar(id) {
    if (resolvido) return
    tapHaptic()
    setErrou(false)
    setMontada((m) => [...m, id])
  }
  function tirar(id) {
    if (resolvido) return
    tapHaptic()
    setErrou(false)
    setMontada((m) => m.filter((x) => x !== id))
  }
  function limpar() {
    if (resolvido || !montada.length) return
    tapHaptic()
    setErrou(false)
    setMontada([])
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

  function fecharIntro() {
    try {
      localStorage.setItem('anagrama.intro.v1', '1')
    } catch {
      /* ignore */
    }
    inicio.current = Date.now()
    setSegundos(0)
    setIntro(false)
  }

  const carregando = !estado && !preview

  // BETA: travado para todos menos o dono (mat 7) enquanto não vai pra produção.
  if (usuario && !mat7) {
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
            <div className="font-display text-[19px] font-bold leading-tight">Anagrama</div>
            {preview && (
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Prévia · Fase {fase} · não pontua
              </div>
            )}
          </div>

          {/* barra: 🔥 ofensiva · ⏱ tempo · ↺ limpar + ? */}
          <div className="mb-4 grid grid-cols-3 items-center px-2 text-muted">
            <span className="hstack justify-self-start gap-1.5 text-sm font-semibold">
              <Flame size={18} className="text-accent" /> {estado?.streak || 0}
            </span>
            <span className="hstack justify-self-center gap-1.5 font-mono text-sm">
              <Clock size={18} /> {fmtTempo(segundos)}
            </span>
            <span className="hstack justify-self-end gap-4">
              <button onClick={limpar} disabled={resolvido || !montada.length} aria-label="Limpar" title="Limpar" className="tap disabled:opacity-40">
                <RotateCcw size={18} />
              </button>
              <button onClick={() => setAjudaAberta(true)} aria-label="Como jogar" title="Como jogar" className="tap">
                <HelpCircle size={18} />
              </button>
            </span>
          </div>

          {/* dica */}
          <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-center text-sm text-muted">
            <span className="text-muted-2">Dica: </span>
            {dica}
          </div>

          {/* resposta */}
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: palavra.length }).map((_, i) => {
              const id = montada[i]
              const preenchida = id !== undefined
              const ch = resolvido ? palavra[i] : preenchida ? chDe(id) : ''
              return (
                <button
                  key={i}
                  onClick={() => preenchida && tirar(id)}
                  disabled={!preenchida || resolvido}
                  className={cn(
                    'grid h-11 w-9 place-items-center rounded-lg border font-display text-xl font-bold transition-colors tap',
                    resolvido
                      ? 'border-accent/50 bg-accent-soft text-accent'
                      : errou
                        ? 'border-danger bg-danger/10 text-danger'
                        : preenchida
                          ? 'border-line bg-surface-2 text-text active:bg-[#2a2b30]'
                          : 'border-dashed border-line bg-transparent text-text',
                  )}
                >
                  {ch}
                </button>
              )
            })}
          </div>

          {/* letras disponíveis */}
          {!resolvido && (
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {pool.map((t) => (
                <button
                  key={t.id}
                  onClick={() => colocar(t.id)}
                  className="grid h-12 w-10 place-items-center rounded-xl bg-surface-2 font-display text-xl font-bold text-text tap transition-transform active:scale-95"
                >
                  {t.ch}
                </button>
              ))}
              {pool.length === 0 && <div className="py-2 text-xs text-muted-2">Toque numa letra da resposta pra devolver</div>}
            </div>
          )}

          {/* resultado */}
          {resolvido && (
            <div className="mt-6 hstack gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 px-4 py-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-black">
                {ganhouAgora ? <Check size={22} strokeWidth={3} /> : <Trophy size={20} />}
              </div>
              <div className="min-w-0">
                <div className="font-display text-base font-bold text-accent-ink">
                  {ganhouAgora ? 'Boa! Você desembaralhou' : 'Fase concluída hoje'}
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
          <li>• As letras vêm <b className="text-text">embaralhadas</b>.</li>
          <li>• Toque nelas pra montar a <b className="text-text">palavra certa</b>.</li>
          <li>• Tocou numa letra da resposta? Ela <b className="text-text">volta</b> pra baixo.</li>
          <li>• A dica mostra do que se trata.</li>
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
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-3xl">🔀</div>
          <div className="font-display text-xl font-bold">Bem-vindo ao Anagrama!</div>
          <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-muted">
            Uma palavra embaralhada <b className="text-text">todo dia</b>. Coloque as letras no lugar e mantenha a{' '}
            <b className="text-text">ofensiva 🔥</b>.
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm font-bold text-text">Como funciona</div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
            <li>• Toque nas letras pra formar a palavra.</li>
            <li>• Tocou errado? Toque na letra da resposta pra devolver.</li>
            <li>• Use a dica pra ajudar.</li>
            <li>• 1 palavra por dia · tempo cronometrado.</li>
          </ul>
        </div>
        <button onClick={onClose} className="btn-primary mt-5 w-full !py-3 text-sm font-bold">Bora jogar!</button>
      </div>
    </div>,
    document.body,
  )
}

export default Anagrama

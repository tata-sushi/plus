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

const JOGO = 'anagrama'
const NPAL = 3 // palavras na rodada (todas na mesma tela)
const DURACAO = 60 // segundos pra resolver as 3

function fmtTempo(s) {
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
function palavrasDaFase(fase) {
  const rnd = mulberry32(hashSeed(JOGO + ':' + fase))
  const idxs = []
  while (idxs.length < NPAL) {
    const i = Math.floor(rnd() * PALAVRAS.length)
    if (!idxs.includes(i)) idxs.push(i)
  }
  return idxs.map((i) => PALAVRAS[i])
}
function letrasEmbaralhadas(fase, idx, palavra) {
  const rnd = mulberry32(hashSeed(JOGO + ':letras:' + fase + ':' + idx))
  const tiles = palavra.split('').map((ch, id) => ({ id, ch }))
  let mis = embaralhar(tiles, rnd)
  if (palavra.length > 1 && mis.map((t) => t.ch).join('') === palavra) {
    mis = [...mis.slice(1), mis[0]]
  }
  return mis
}
const vazio = () => Array.from({ length: NPAL }, () => ({ montada: [], resolvido: false, errou: false }))

export function Anagrama() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [params] = useSearchParams()
  const mat7 = String(usuario?.matricula) === '7'
  const previewFase = mat7 ? Math.floor(Number(params.get('fase'))) : 0
  const preview = previewFase >= 1

  const [estado, setEstado] = useState(null)
  const [palavras, setPalavras] = useState(vazio) // estado de cada palavra: {montada, resolvido, errou}
  const [resolvido, setResolvido] = useState(false)
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const [perdeu, setPerdeu] = useState(false)
  const [pontosGanhos, setPontosGanhos] = useState(0)
  const [restante, setRestante] = useState(DURACAO)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [intro, setIntro] = useState(false)
  const inicio = useRef(Date.now())
  const enviando = useRef(false)
  const finalizado = useRef(false)

  const completadas = estado?.completadas ?? 0
  const jogouHoje = !preview && !!estado?.jogou_hoje
  const fase = preview ? previewFase : jogouHoje ? Math.max(1, completadas) : completadas + 1

  const lista = useMemo(() => (estado?.ok || preview ? palavrasDaFase(fase) : null), [estado?.ok, preview, fase])
  // tabuleiros: palavra + dica + letras embaralhadas (fixas do dia)
  const tabuleiros = useMemo(
    () => (lista ? lista.map((it, i) => ({ item: it, tiles: letrasEmbaralhadas(fase, i, it.p) })) : []),
    [lista, fase],
  )
  const chDe = (w, id) => tabuleiros[w]?.tiles.find((t) => t.id === id)?.ch || ''
  const acertos = palavras.filter((e) => e.resolvido).length

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

  // reinício da rodada (novo dia/fase)
  useEffect(() => {
    if (!lista) return
    setPalavras(vazio())
    setGanhouAgora(false)
    setPerdeu(false)
    finalizado.current = false
    setResolvido(!!jogouHoje)
    inicio.current = Date.now()
    setRestante(DURACAO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista])

  // contagem regressiva (1 minuto pra rodada toda)
  useEffect(() => {
    if (resolvido || intro || !lista) return
    const tick = () => {
      const rest = DURACAO - Math.floor((Date.now() - inicio.current) / 1000)
      if (rest <= 0) {
        setRestante(0)
        perderTempo()
      } else {
        setRestante(rest)
      }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvido, intro, lista])

  function colocar(w, id) {
    if (resolvido || palavras[w].resolvido) return
    tapHaptic()
    const word = tabuleiros[w].item.p
    const mont = [...palavras[w].montada, id]
    let novo = palavras.map((e, i) => (i === w ? { ...e, montada: mont, errou: false } : e))
    if (mont.length === word.length) {
      const str = mont.map((x) => chDe(w, x)).join('')
      if (str === word) {
        novo = novo.map((e, i) => (i === w ? { ...e, resolvido: true } : e))
        if (novo.every((e) => e.resolvido)) {
          setPalavras(novo)
          ganhar()
          return
        }
      } else {
        novo = novo.map((e, i) => (i === w ? { ...e, errou: true } : e))
        setTimeout(() => setPalavras((p) => p.map((e, i) => (i === w ? { ...e, errou: false } : e))), 600)
      }
    }
    setPalavras(novo)
  }
  function tirar(w, id) {
    if (resolvido || palavras[w].resolvido) return
    tapHaptic()
    setPalavras((p) => p.map((e, i) => (i === w ? { ...e, montada: e.montada.filter((x) => x !== id), errou: false } : e)))
  }

  async function ganhar() {
    if (finalizado.current) return
    finalizado.current = true
    const tempo = Math.min(DURACAO, Math.floor((Date.now() - inicio.current) / 1000))
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

  async function perderTempo() {
    if (finalizado.current) return
    finalizado.current = true
    setResolvido(true)
    setPerdeu(true)
    if (preview) return
    enviando.current = true
    const { data } = await supabase.rpc('jogo_concluir', { p_jogo: JOGO, p_fase: fase, p_tempo_seg: DURACAO, p_resolvido: false })
    enviando.current = false
    if (data?.ok) setEstado((e) => ({ ...e, ...data }))
  }

  function fecharIntro() {
    try {
      localStorage.setItem('anagrama.intro.v1', '1')
    } catch {
      /* ignore */
    }
    inicio.current = Date.now()
    setRestante(DURACAO)
    setIntro(false)
  }

  const carregando = !estado && !preview
  const urgente = !resolvido && restante <= 10

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

      {carregando || !tabuleiros.length ? (
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

          {resolvido ? (
            <div
              className={cn(
                'mt-2 hstack gap-3 rounded-2xl border px-4 py-3.5',
                perdeu ? 'border-danger/40 bg-danger/10' : 'border-accent/40 bg-accent-soft/60',
              )}
            >
              <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', perdeu ? 'bg-danger text-white' : 'bg-accent text-black')}>
                {perdeu ? <Clock size={22} /> : ganhouAgora ? <Check size={22} strokeWidth={3} /> : <Trophy size={20} />}
              </div>
              <div className="min-w-0">
                <div className={cn('font-display text-base font-bold', perdeu ? 'text-danger' : 'text-accent-ink')}>
                  {perdeu ? 'Tempo esgotado' : ganhouAgora ? 'Boa! Fez as 3 palavras' : 'Fase concluída hoje'}
                </div>
                <div className="text-sm text-muted">
                  {perdeu ? (
                    <>
                      Você fez <b className="text-text">{acertos} de {NPAL}</b> · Volte amanhã
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
          ) : (
            <>
              {/* barra: 🔥 ofensiva · ⏱ tempo restante · ? */}
              <div className="grid grid-cols-3 items-center px-2 text-muted">
                <span className="hstack justify-self-start gap-1.5 text-sm font-semibold">
                  <Flame size={18} className="text-accent" /> {estado?.streak || 0}
                </span>
                <span className={cn('hstack justify-self-center gap-1.5 font-mono text-base font-bold', urgente ? 'text-danger' : 'text-text')}>
                  <Clock size={18} /> {fmtTempo(restante)}
                </span>
                <span className="justify-self-end">
                  <button onClick={() => setAjudaAberta(true)} aria-label="Como jogar" title="Como jogar" className="tap">
                    <HelpCircle size={18} />
                  </button>
                </span>
              </div>
              <div className="mt-2 text-center text-xs text-muted-2">Resolva as 3 palavras · {acertos}/{NPAL}</div>

              {/* três palavras na mesma tela */}
              <div className="mt-4 flex flex-col gap-3">
                {tabuleiros.map((tb, w) => {
                  const es = palavras[w] || { montada: [], resolvido: false, errou: false }
                  const word = tb.item.p
                  const poolW = tb.tiles.filter((t) => !es.montada.includes(t.id))
                  return (
                    <div
                      key={w}
                      className={cn('rounded-2xl border p-3', es.resolvido ? 'border-accent/40 bg-accent-soft/30' : 'border-line bg-surface')}
                    >
                      <div className="hstack gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-muted-2">
                          {w + 1}
                        </span>
                        <div className="min-w-0 flex-1 truncate text-xs text-muted">
                          <span className="text-muted-2">Dica: </span>
                          {tb.item.d}
                        </div>
                        {es.resolvido && <Check size={16} className="shrink-0 text-accent" />}
                      </div>

                      {/* resposta */}
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {Array.from({ length: word.length }).map((_, i) => {
                          const id = es.montada[i]
                          const preenchida = id !== undefined
                          return (
                            <button
                              key={i}
                              onClick={() => preenchida && tirar(w, id)}
                              disabled={!preenchida || es.resolvido}
                              className={cn(
                                'grid h-9 w-7 place-items-center rounded-md border font-display text-lg font-bold transition-colors tap',
                                es.resolvido
                                  ? 'border-accent/50 bg-accent-soft text-accent'
                                  : es.errou
                                    ? 'border-danger bg-danger/10 text-danger'
                                    : preenchida
                                      ? 'border-line bg-surface-2 text-text active:bg-[#2a2b30]'
                                      : 'border-dashed border-line bg-transparent text-text',
                              )}
                            >
                              {es.resolvido ? word[i] : preenchida ? chDe(w, id) : ''}
                            </button>
                          )
                        })}
                      </div>

                      {/* letras */}
                      {!es.resolvido && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {poolW.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => colocar(w, t.id)}
                              className="grid h-10 w-8 place-items-center rounded-lg bg-surface-2 font-display text-lg font-bold text-text tap transition-transform active:scale-95"
                            >
                              {t.ch}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
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
          <li>• São <b className="text-text">3 palavras</b> na tela, <b className="text-text">1 minuto</b> pra todas.</li>
          <li>• Toque nas letras pra montar cada palavra.</li>
          <li>• Acertou uma? Ela trava em verde.</li>
          <li>• Tocou numa letra da resposta? Ela volta pra baixo.</li>
          <li>• Faça as 3 antes do tempo acabar pra vencer.</li>
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
            <b className="text-text">3 palavras</b> na tela, <b className="text-text">1 minuto</b> no relógio. Corra e mantenha a{' '}
            <b className="text-text">ofensiva 🔥</b>.
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm font-bold text-text">Como funciona</div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
            <li>• Monte as 3 palavras tocando nas letras.</li>
            <li>• Acertou uma? Ela trava em verde.</li>
            <li>• Use as dicas pra ajudar.</li>
            <li>• Faça as 3 em 1 minuto.</li>
          </ul>
        </div>
        <button onClick={onClose} className="btn-primary mt-5 w-full !py-3 text-sm font-bold">Bora jogar!</button>
      </div>
    </div>,
    document.body,
  )
}

export default Anagrama

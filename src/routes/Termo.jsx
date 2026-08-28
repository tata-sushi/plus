import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Check, Trophy, Loader2, Flame, X, Delete } from 'lucide-react'
import {
  palavraDoDia,
  normaliza,
  avalia,
  estadosDoTeclado,
  ehPalavraValida,
  hojeSP,
  TENTATIVAS,
  TECLADO,
} from '../lib/termo.js'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { Header } from '../components/Header.jsx'

const JOGO = 'termo'

// classes do tile do tabuleiro por estado
const CLS_TILE = {
  certo: 'bg-accent text-black border-accent',
  presente: 'bg-warn text-black border-warn',
  ausente: 'bg-surface-2 text-muted-2 border-transparent',
}
// classes da tecla por estado
const CLS_TECLA = {
  certo: 'bg-accent text-black',
  presente: 'bg-warn text-black',
  ausente: 'bg-surface-2 text-muted-2',
}

export function Termo() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [params] = useSearchParams()

  // Prévia (só matrícula 7): ?palavra=XXXX testa uma palavra sem pontuar/salvar.
  const mat7 = String(usuario?.matricula) === '7'
  const palavraPreview = mat7 ? normaliza(params.get('palavra')) : ''
  const preview = palavraPreview.length >= 4

  const [estado, setEstado] = useState(null) // null = carregando
  const [tentativas, setTentativas] = useState([]) // strings normalizadas enviadas
  const [atual, setAtual] = useState('') // buffer digitado
  const [status, setStatus] = useState('jogando') // jogando | ganhou | perdeu | concluido
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const [pontosGanhos, setPontosGanhos] = useState(0)
  const [aviso, setAviso] = useState('')
  const [tremendo, setTremendo] = useState(false)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [intro, setIntro] = useState(false)
  const enviando = useRef(false)

  // A data vem do SERVIDOR (jogo_estado.hoje) — assim palavra do dia, "jogou
  // hoje" e progresso ficam todos alinhados no mesmo dia, independentemente do
  // relógio do aparelho. Fallback pro relógio local só se o backend falhar.
  const serverHoje = estado?.hoje || null
  const doDia = useMemo(() => (serverHoje ? palavraDoDia(serverHoje) : null), [serverHoje])
  const alvo = preview ? palavraPreview : doDia?.palavra || ''
  const display = preview ? palavraPreview : doDia?.display || ''
  const LEN = alvo.length

  const completadas = estado?.completadas ?? 0
  const jogouHoje = !preview && !!estado?.jogou_hoje
  const fase = completadas + 1
  const encerrado = status !== 'jogando'

  // carrega estado do jogo (servidor) + o progresso do dia (servidor, cross-device)
  useEffect(() => {
    let ativo = true
    supabase.rpc('jogo_estado', { p_jogo: JOGO }).then(({ data }) => {
      if (!ativo) return
      setEstado(
        data?.ok
          ? data
          : { ok: true, completadas: 0, jogou_hoje: false, streak: 0, pontos_total: 0, hoje: hojeSP() },
      )
    })
    if (!preview) {
      supabase.rpc('termo_carregar').then(({ data }) => {
        if (!ativo || !data?.ok) return
        if (Array.isArray(data.tentativas) && data.tentativas.length) setTentativas(data.tentativas)
        if (data.status) setStatus(data.status)
      })
    }
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // primeiro acesso: boas-vindas uma vez (por aparelho)
  useEffect(() => {
    try {
      if (!localStorage.getItem('termo.intro.v2')) setIntro(true)
    } catch {
      /* ignore */
    }
  }, [])

  // Servidor diz que jogou hoje mas não há progresso salvo (jogada antiga, de
  // antes deste recurso): mostra como concluído, revelando a palavra do dia.
  useEffect(() => {
    if (jogouHoje && status === 'jogando' && tentativas.length === 0) {
      setStatus('concluido')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogouHoje])

  // Persiste o progresso do dia no servidor (cross-device). Fire-and-forget.
  function salvarProgresso(novas, novoStatus) {
    if (preview) return
    supabase.rpc('termo_salvar', { p_tentativas: novas, p_status: novoStatus })
  }

  const estadosTecla = useMemo(() => estadosDoTeclado(tentativas, alvo), [tentativas, alvo])

  function flashAviso(txt) {
    setAviso(txt)
    setTremendo(true)
    setTimeout(() => setTremendo(false), 420)
    setTimeout(() => setAviso(''), 1400)
  }

  async function registrar(resolvido, novasTentativas, novoStatus) {
    setTentativas(novasTentativas)
    setStatus(novoStatus)
    salvarProgresso(novasTentativas, novoStatus)
    tapHaptic()
    if (preview || enviando.current) return
    enviando.current = true
    const { data } = await supabase.rpc('jogo_concluir', {
      p_jogo: JOGO,
      p_fase: fase,
      p_tempo_seg: null,
      p_resolvido: resolvido,
    })
    enviando.current = false
    if (data?.ok) {
      setPontosGanhos(data.pontos_ganhos || 0)
      setEstado((e) => ({ ...e, ...data }))
    }
  }

  function enviar() {
    if (encerrado || !LEN) return
    if (atual.length !== LEN) {
      flashAviso(`Complete as ${LEN} letras`)
      return
    }
    if (atual !== alvo && !ehPalavraValida(atual)) {
      flashAviso('Palavra não encontrada')
      return
    }
    const novas = [...tentativas, atual]
    setAtual('')
    if (atual === alvo) {
      setGanhouAgora(true)
      registrar(true, novas, 'ganhou')
    } else if (novas.length >= TENTATIVAS) {
      registrar(false, novas, 'perdeu')
    } else {
      setTentativas(novas)
      salvarProgresso(novas, 'jogando')
    }
  }

  function digitar(ch) {
    if (encerrado) return
    if (atual.length >= LEN) return
    tapHaptic()
    setAtual((a) => a + ch)
  }
  function apagar() {
    if (encerrado) return
    setAtual((a) => a.slice(0, -1))
  }

  function onTecla(k) {
    if (k === 'ENTER') enviar()
    else if (k === 'APAGAR') apagar()
    else digitar(k)
  }

  // teclado físico (desktop)
  useEffect(() => {
    function onKey(e) {
      if (ajudaAberta || intro) return
      if (e.key === 'Enter') enviar()
      else if (e.key === 'Backspace') apagar()
      else {
        const ch = normaliza(e.key)
        if (ch.length === 1) digitar(ch)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual, tentativas, status, ajudaAberta, intro])

  function fecharIntro() {
    try {
      localStorage.setItem('termo.intro.v2', '1')
    } catch {
      /* ignore */
    }
    setIntro(false)
  }

  const carregando = !preview && (!estado || !doDia)
  const tentativaAtualIdx = tentativas.length

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

      {carregando ? (
        <div className="hstack justify-center py-24 text-muted-2">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[420px] flex-col px-5 pb-6 pt-4">
          {/* título */}
          <div className="mb-4 text-center">
            <div className="font-display text-[19px] font-bold leading-tight">Termo Tatá</div>
            {preview && (
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Prévia · {display} · não pontua
              </div>
            )}
          </div>

          {/* barra: 🔥 ofensiva · tentativa · ? */}
          <div className="mb-4 grid grid-cols-3 items-center px-2 text-muted">
            <span className="hstack justify-self-start gap-1.5 text-sm font-semibold">
              <Flame size={18} className="text-accent" /> {estado?.streak || 0}
            </span>
            <span className="hstack justify-self-center gap-1.5 text-sm font-semibold">
              {encerrado ? '—' : `${tentativaAtualIdx + 1}/${TENTATIVAS}`}
            </span>
            <span className="justify-self-end">
              <button onClick={() => setAjudaAberta(true)} aria-label="Como jogar" title="Como jogar" className="tap">
                <HelpCircle size={18} />
              </button>
            </span>
          </div>

          {/* tabuleiro — emoldurado no mesmo box do Tango/Rota */}
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className={`flex flex-col items-center gap-1.5 ${tremendo ? 'animate-tremor' : ''}`}>
              {Array.from({ length: TENTATIVAS }, (_, r) => {
                const enviada = r < tentativas.length
                const avaliacao = enviada ? avalia(tentativas[r], alvo) : null
                const ehAtual = r === tentativaAtualIdx && !encerrado
                const texto = enviada ? tentativas[r] : ehAtual ? atual : ''
                return (
                  <div key={r} className="flex w-full justify-center gap-1.5">
                    {Array.from({ length: LEN }, (_, c) => {
                      const letra = texto[c] || ''
                      let cls = 'border-line text-text'
                      if (enviada) cls = CLS_TILE[avaliacao[c]]
                      else if (letra) cls = 'border-muted-2/70 text-text'
                      return (
                        <div
                          key={c}
                          className={`grid aspect-square flex-1 max-w-[52px] place-items-center rounded-md border-2 text-[clamp(16px,6vw,26px)] font-bold uppercase ${cls}`}
                        >
                          {letra}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* aviso transitório */}
          <div className="mt-2 h-4 text-center text-xs font-semibold text-warn">{aviso}</div>

          {/* resultado */}
          {encerrado && (
            <div className="mb-2 hstack gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 px-4 py-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-black">
                {ganhouAgora ? <Check size={22} strokeWidth={3} /> : <Trophy size={20} />}
              </div>
              <div className="min-w-0">
                <div className="font-display text-base font-bold text-accent-ink">
                  {ganhouAgora ? 'Acertou!' : 'Fase concluída hoje'}
                </div>
                <div className="text-sm text-muted">
                  {preview ? (
                    'Prévia · não pontua'
                  ) : status === 'ganhou' && ganhouAgora && pontosGanhos > 0 ? (
                    <>
                      <b className="text-text">+{pontosGanhos}</b> pontos · Volte amanhã
                    </>
                  ) : status === 'ganhou' ? (
                    'Volte amanhã'
                  ) : (
                    <>
                      A palavra era <b className="text-text">{display}</b> · Volte amanhã
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* teclado */}
          {!encerrado && (
            <div className="mt-3 flex flex-col gap-1.5">
              {TECLADO.map((linha, i) => (
                <div key={i} className="flex justify-center gap-1.5">
                  {linha.map((k) => {
                    const especial = k === 'APAGAR'
                    const st = !especial ? estadosTecla[k] : null
                    const cls = st ? CLS_TECLA[st] : 'bg-surface text-text'
                    return (
                      <button
                        key={k}
                        onClick={() => onTecla(k)}
                        aria-label={k === 'APAGAR' ? 'Apagar' : k}
                        className={`grid h-12 place-items-center rounded-md text-sm font-bold uppercase tap ${especial ? 'px-4' : 'flex-1 max-w-[38px]'} ${cls}`}
                      >
                        {k === 'APAGAR' ? <Delete size={18} /> : k}
                      </button>
                    )
                  })}
                </div>
              ))}
              {/* ENVIAR — linha própria, largura total */}
              <button
                onClick={() => onTecla('ENTER')}
                aria-label="Enviar"
                className="mt-1 grid h-12 w-full place-items-center rounded-md bg-surface text-sm font-bold uppercase tap"
              >
                Enviar
              </button>
            </div>
          )}
        </div>
      )}

      {ajudaAberta && <FolhaComoJogar onClose={() => setAjudaAberta(false)} />}
      {intro && <FolhaComoJogar primeiro onClose={fecharIntro} />}
    </div>
  )
}

// Simulação animada do jogo: as palavras são "digitadas" letra a letra e os
// quadradinhos revelam as cores, demonstrando como o Termo funciona. Alvo SUSHI:
// primeiro um chute com as 3 cores (SAQUE), depois o acerto (SUSHI).
const DEMO_ALVO = 'SUSHI'
const DEMO_CHUTES = ['PEIXE', 'SAQUE', 'SUSHI']

function DemoTermo() {
  const [linhas, setLinhas] = useState([{ texto: '', estados: null }])
  const cancel = useRef(false)

  useEffect(() => {
    cancel.current = false
    const reduz =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduz) {
      setLinhas(DEMO_CHUTES.map((p) => ({ texto: p, estados: avalia(p, DEMO_ALVO) })))
      return
    }
    const timers = []
    const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)))
    async function run() {
      while (!cancel.current) {
        setLinhas([{ texto: '', estados: null }])
        await wait(700)
        for (let g = 0; g < DEMO_CHUTES.length && !cancel.current; g++) {
          const palavra = DEMO_CHUTES[g]
          for (let i = 1; i <= palavra.length && !cancel.current; i++) {
            setLinhas((ls) => {
              const n = ls.slice()
              n[g] = { texto: palavra.slice(0, i), estados: null }
              return n
            })
            await wait(165)
          }
          await wait(340)
          if (cancel.current) break
          setLinhas((ls) => {
            const n = ls.slice()
            n[g] = { texto: palavra, estados: avalia(palavra, DEMO_ALVO) }
            return n
          })
          if (g < DEMO_CHUTES.length - 1) {
            await wait(750)
            setLinhas((ls) => [...ls, { texto: '', estados: null }])
            await wait(250)
          } else {
            await wait(1900)
          }
        }
      }
    }
    run()
    return () => {
      cancel.current = true
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-1.5">
      {linhas.map((ln, r) => (
        <div key={r} className="flex justify-center gap-1.5">
          {Array.from({ length: DEMO_ALVO.length }, (_, c) => {
            const letra = ln.texto[c] || ''
            let cls = 'border-line text-text'
            if (ln.estados) cls = CLS_TILE[ln.estados[c]]
            else if (letra) cls = 'border-muted-2/70 text-text'
            return (
              <div
                key={c}
                style={ln.estados ? { transitionDelay: `${c * 80}ms` } : undefined}
                className={`grid h-10 w-10 place-items-center rounded-md border-2 text-lg font-bold uppercase transition-colors duration-200 ${cls}`}
              >
                {letra}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Folha "Como jogar" / boas-vindas — com a simulação animada do jogo.
function FolhaComoJogar({ onClose, primeiro }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[88dvh] w-full max-w-[400px] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-bg px-5 pb-6 pt-6 shadow-xl">
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        <div className="text-center">
          <div className="font-display text-lg font-bold">{primeiro ? 'Bem-vindo ao Termo Tatá!' : 'Como jogar'}</div>
          <p className="mx-auto mt-1.5 max-w-[330px] text-sm leading-relaxed text-muted">
            Descubra a <b className="text-text">palavra do dia</b> em {TENTATIVAS} tentativas, sempre no mundo do{' '}
            <b className="text-text">TATÁ</b>. Veja como as cores funcionam:
          </p>
        </div>

        <div className="my-4">
          <DemoTermo />
        </div>

        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <li>
            <span className="mr-1.5 inline-block h-3.5 w-3.5 rounded-sm bg-accent align-middle" /> letra <b className="text-text">certa</b>, no lugar certo.
          </li>
          <li>
            <span className="mr-1.5 inline-block h-3.5 w-3.5 rounded-sm bg-warn align-middle" /> letra <b className="text-text">existe</b>, mas em outro lugar.
          </li>
          <li>
            <span className="mr-1.5 inline-block h-3.5 w-3.5 rounded-sm bg-surface-2 align-middle" /> letra <b className="text-text">não</b> está na palavra.
          </li>
          <li>• Digite <b className="text-text">sem acento</b>. O acento aparece sozinho.</li>
          <li>• Cada chute precisa ser uma <b className="text-text">palavra de verdade</b>.</li>
          <li>• Acerte <b className="text-text">uma palavra por dia</b> para manter a ofensiva 🔥.</li>
        </ul>

        <button onClick={onClose} className="btn-primary mt-5 w-full !py-3 text-sm font-bold">
          {primeiro ? 'Bora jogar!' : 'Entendi'}
        </button>
      </div>
    </div>,
    document.body,
  )
}

// React.lazy exige export default (mesma convenção de Jogo/Rota/Quadros).
export default Termo

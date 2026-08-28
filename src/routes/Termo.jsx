import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Check, Trophy, Loader2, Flame, X, Delete } from 'lucide-react'
import {
  palavraDoDia,
  normaliza,
  avalia,
  estadosDoTeclado,
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

  const iso = hojeSP()
  const doDia = useMemo(() => palavraDoDia(iso), [iso])
  const alvo = preview ? palavraPreview : doDia.palavra
  const display = preview ? palavraPreview : doDia.display
  const LEN = alvo.length
  const chaveLocal = `termo.dia.${iso}`

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

  const completadas = estado?.completadas ?? 0
  const jogouHoje = !preview && !!estado?.jogou_hoje
  const fase = completadas + 1
  const encerrado = status !== 'jogando'

  // carrega estado do jogo + restaura o dia salvo (localStorage)
  useEffect(() => {
    let ativo = true
    supabase.rpc('jogo_estado', { p_jogo: JOGO }).then(({ data }) => {
      if (!ativo) return
      setEstado(data?.ok ? data : { ok: true, completadas: 0, jogou_hoje: false, streak: 0, pontos_total: 0 })
    })
    if (!preview) {
      try {
        const salvo = JSON.parse(localStorage.getItem(chaveLocal) || 'null')
        if (salvo && Array.isArray(salvo.tentativas)) {
          setTentativas(salvo.tentativas)
          setStatus(salvo.status || 'jogando')
        }
      } catch {
        /* ignore */
      }
    }
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // primeiro acesso: boas-vindas uma vez (por aparelho)
  useEffect(() => {
    try {
      if (!localStorage.getItem('termo.intro.v1')) setIntro(true)
    } catch {
      /* ignore */
    }
  }, [])

  // Backend diz que jogou hoje mas não temos o detalhe local (outro aparelho):
  // mostra como concluído, revelando a palavra do dia.
  useEffect(() => {
    if (jogouHoje && status === 'jogando' && tentativas.length === 0) {
      setStatus('concluido')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jogouHoje])

  function salvarLocal(novas, novoStatus) {
    if (preview) return
    try {
      localStorage.setItem(chaveLocal, JSON.stringify({ tentativas: novas, status: novoStatus }))
    } catch {
      /* ignore */
    }
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
    salvarLocal(novasTentativas, novoStatus)
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
    if (encerrado) return
    if (atual.length !== LEN) {
      flashAviso(`Complete as ${LEN} letras`)
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
      salvarLocal(novas, 'jogando')
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
      localStorage.setItem('termo.intro.v1', '1')
    } catch {
      /* ignore */
    }
    setIntro(false)
  }

  const carregando = !estado && !preview
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
            {preview ? (
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Prévia · {display} · não pontua
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted">Descubra a palavra do dia · tema do restaurante 🍣</div>
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

          {/* tabuleiro */}
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

          {/* aviso transitório */}
          <div className="mt-2 h-4 text-center text-xs font-semibold text-warn">{aviso}</div>

          {/* resultado */}
          {encerrado && (
            <div className="mb-2 hstack gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 px-4 py-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-black">
                {status === 'ganhou' ? <Check size={22} strokeWidth={3} /> : <Trophy size={20} />}
              </div>
              <div className="min-w-0">
                <div className="font-display text-base font-bold text-accent-ink">
                  {status === 'ganhou' ? 'Acertou!' : status === 'perdeu' ? 'Não foi hoje' : 'Você já jogou hoje'}
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
                    const especial = k === 'ENTER' || k === 'APAGAR'
                    const st = !especial ? estadosTecla[k] : null
                    const cls = st ? CLS_TECLA[st] : 'bg-surface text-text'
                    return (
                      <button
                        key={k}
                        onClick={() => onTecla(k)}
                        aria-label={k === 'APAGAR' ? 'Apagar' : k === 'ENTER' ? 'Enviar' : k}
                        className={`grid h-12 place-items-center rounded-md text-sm font-bold uppercase tap ${especial ? 'px-2.5 text-[11px]' : 'flex-1 max-w-[38px]'} ${cls}`}
                      >
                        {k === 'APAGAR' ? <Delete size={18} /> : k === 'ENTER' ? 'Enviar' : k}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ajudaAberta && <FolhaAjuda len={LEN} onClose={() => setAjudaAberta(false)} />}
      {intro && <FolhaIntro onClose={fecharIntro} />}
    </div>
  )
}

// Folha "Como jogar" — mesmo padrão dos outros jogos.
function FolhaAjuda({ len, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-bg px-5 pb-8 pt-4 shadow-xl sm:max-w-[520px] sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line sm:hidden" />
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        <div className="font-display text-lg font-bold">Como jogar</div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Descubra a <b className="text-text">palavra do dia</b> em {TENTATIVAS} tentativas. Toda palavra é do universo do{' '}
          <b className="text-text">restaurante e da culinária oriental</b>.
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <li>
            <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-accent align-middle" /> letra <b className="text-text">certa</b> no lugar certo.
          </li>
          <li>
            <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-warn align-middle" /> letra <b className="text-text">existe</b>, mas em outro lugar.
          </li>
          <li>
            <span className="mr-1 inline-block h-3 w-3 rounded-sm bg-surface-2 align-middle" /> letra <b className="text-text">não</b> está na palavra.
          </li>
          <li>• Digite <b className="text-text">sem acento</b> — o jogo revela o acento sozinho.</li>
          <li>• A palavra de hoje tem <b className="text-text">{len} letras</b> · 1 palavra por dia.</li>
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
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-3xl">🍱</div>
          <div className="font-display text-xl font-bold">Bem-vindo ao Termo Tatá!</div>
          <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-muted">
            Uma palavra nova <b className="text-text">todo dia</b>, sempre do mundo do restaurante e da culinária oriental.
            Acerte, mantenha a <b className="text-text">ofensiva 🔥</b>.
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm font-bold text-text">Como funciona</div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
            <li>• Tente adivinhar a palavra em {TENTATIVAS} chances.</li>
            <li>• As cores mostram o quão perto você está.</li>
            <li>• Digite <b className="text-text">sem acento</b>.</li>
            <li>• 1 palavra por dia.</li>
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

// React.lazy exige export default (mesma convenção de Jogo/Rota/Quadros).
export default Termo

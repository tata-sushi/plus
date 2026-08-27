import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw, HelpCircle, Check, Trophy, Loader2, Clock, Flame, X } from 'lucide-react'
import { gerarRota, seedDaFase, tierDaFase, estaResolvida, vizinhos } from '../lib/rotasushi.js'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { Header } from '../components/Header.jsx'

const JOGO = 'rotasushi'

function fmtTempo(s) {
  if (s == null) return '—'
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function RotaSushi() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [params] = useSearchParams()
  // Prévia (só matrícula 7): ?fase=N força uma fase pra conferir sem esperar dias.
  const mat7 = String(usuario?.matricula) === '7'
  const previewFase = mat7 ? Math.floor(Number(params.get('fase'))) : 0
  const preview = previewFase >= 1

  const [estado, setEstado] = useState(null) // null = carregando
  const [caminho, setCaminho] = useState([]) // células na ordem desenhada
  const [resolvido, setResolvido] = useState(false)
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [intro, setIntro] = useState(false)
  const gridRef = useRef(null)
  const inicio = useRef(Date.now())
  const desenhando = useRef(false)
  const enviando = useRef(false)

  const completadas = estado?.completadas ?? 0
  const jogouHoje = !preview && !!estado?.jogou_hoje
  // Já jogou hoje → mostra (resolvida) a fase que acabou de fazer, sem revelar a próxima.
  const fase = preview ? previewFase : jogouHoje ? Math.max(1, completadas) : completadas + 1
  const tier = useMemo(() => tierDaFase(fase), [fase])
  const puzzle = useMemo(
    () => (estado?.ok || preview ? gerarRota(seedDaFase(JOGO, fase), tier) : null),
    [estado?.ok, preview, fase, tier],
  )
  const rows = puzzle?.rows || tier.rows
  const cols = puzzle?.cols || tier.cols
  const n = rows * cols

  const cellUm = useMemo(() => {
    if (!puzzle) return -1
    for (const k in puzzle.numeros) if (puzzle.numeros[k] === 1) return +k
    return -1
  }, [puzzle])

  // carrega estado do jogo
  useEffect(() => {
    let ativo = true
    supabase.rpc('jogo_estado', { p_jogo: JOGO }).then(({ data }) => {
      if (!ativo) return
      setEstado(data?.ok ? data : { ok: true, completadas: 0, jogou_hoje: false, streak: 0, pontos_total: 0 })
    })
    return () => {
      ativo = false
    }
  }, [])

  // primeiro acesso: boas-vindas uma vez (por aparelho)
  useEffect(() => {
    try {
      if (!localStorage.getItem('rotasushi.intro.v1')) setIntro(true)
    } catch {
      /* ignore */
    }
  }, [])

  // (re)inicia o traço quando o puzzle muda
  useEffect(() => {
    if (!puzzle) return
    if (jogouHoje) {
      setCaminho(puzzle.solucao.slice())
      setResolvido(true)
      setGanhouAgora(false)
    } else if (cellUm >= 0) {
      setCaminho([cellUm])
      setResolvido(false)
      setGanhouAgora(false)
    }
    inicio.current = Date.now()
    setSegundos(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle])

  // cronômetro
  useEffect(() => {
    if (resolvido || intro || !puzzle) return
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [resolvido, intro, puzzle])

  // vitória
  useEffect(() => {
    if (!puzzle || resolvido || jogouHoje) return
    if (caminho.length === n && estaResolvida(caminho, puzzle)) ganhar(caminho)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho, puzzle, resolvido, jogouHoje])

  const numerosNoCaminho = (cam) => cam.reduce((a, c) => a + (puzzle.numeros[c] != null ? 1 : 0), 0)

  async function ganhar(cam) {
    if (enviando.current) return
    desenhando.current = false
    const tempo = Math.floor((Date.now() - inicio.current) / 1000)
    setSegundos(tempo)
    tapHaptic()
    setResolvido(true)
    setGanhouAgora(true)
    if (preview) return
    enviando.current = true
    const { data } = await supabase.rpc('jogo_concluir', { p_jogo: JOGO, p_fase: fase, p_tempo_seg: tempo })
    enviando.current = false
    if (data?.ok) setEstado((e) => ({ ...e, ...data }))
    void cam
  }

  function entrarCelula(cell) {
    if (resolvido || cell < 0 || !puzzle) return
    setCaminho((cam) => {
      if (!cam.length) return cam
      const last = cam[cam.length - 1]
      if (cell === last) return cam
      const j = cam.indexOf(cell)
      if (j >= 0) return cam.slice(0, j + 1) // volta para uma célula já traçada
      if (!vizinhos(last, rows, cols).includes(cell)) return cam
      const num = puzzle.numeros[cell]
      if (num != null && num !== numerosNoCaminho(cam) + 1) return cam // checkpoint fora de ordem
      return [...cam, cell]
    })
  }

  function celulaDoPonteiro(e) {
    const el = gridRef.current
    if (!el) return -1
    const rect = el.getBoundingClientRect()
    const c = Math.floor((e.clientX - rect.left) / (rect.width / cols))
    const r = Math.floor((e.clientY - rect.top) / (rect.height / rows))
    if (r < 0 || r >= rows || c < 0 || c >= cols) return -1
    return r * cols + c
  }
  function onDown(e) {
    if (resolvido) return
    const cell = celulaDoPonteiro(e)
    const j = caminho.indexOf(cell)
    if (j >= 0) {
      desenhando.current = true
      gridRef.current?.setPointerCapture?.(e.pointerId)
      setCaminho((cam) => cam.slice(0, j + 1))
    }
  }
  const onMove = (e) => desenhando.current && entrarCelula(celulaDoPonteiro(e))
  const onUp = () => (desenhando.current = false)

  function recomecar() {
    if (resolvido) return
    tapHaptic()
    setCaminho(cellUm >= 0 ? [cellUm] : [])
    inicio.current = Date.now()
    setSegundos(0)
  }

  function fecharIntro() {
    try {
      localStorage.setItem('rotasushi.intro.v1', '1')
    } catch {
      /* ignore */
    }
    inicio.current = Date.now()
    setSegundos(0)
    setIntro(false)
  }

  const carregando = !estado && !preview
  const feitos = caminho.length

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

      {carregando || !puzzle ? (
        <div className="hstack justify-center py-24 text-muted-2">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[420px] px-5 pb-28 pt-4">
          {/* título */}
          <div className="mb-5 text-center">
            <div className="font-display text-[19px] font-bold leading-tight">Rota do Sushi</div>
            {preview && (
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Prévia · Fase {fase} · {rows}×{cols} · não pontua
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

          {/* tabuleiro — respiro interno (padding) pra o traço não encostar na borda */}
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div
              ref={gridRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="relative aspect-square w-full touch-none select-none"
            >
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {Array.from({ length: n }, (_, cell) => (
                  <div key={cell} className="rounded-[3px] border-[0.5px] border-line/50" />
                ))}
              </div>
              <svg viewBox={`0 0 ${cols} ${rows}`} className="pointer-events-none absolute inset-0 h-full w-full">
                {caminho.length > 1 && (
                  <polyline
                    points={caminho.map((c) => `${(c % cols) + 0.5},${((c / cols) | 0) + 0.5}`).join(' ')}
                    fill="none"
                    stroke="currentColor"
                    className="text-accent"
                    strokeWidth="0.48"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div
                className="pointer-events-none absolute inset-0 grid"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
              >
                {Array.from({ length: n }, (_, cell) => {
                  const num = puzzle.numeros[cell]
                  return (
                    <div key={cell} className="grid place-items-center">
                      {num != null && (
                        <span className="grid aspect-square w-[54%] place-items-center rounded-full bg-[#1f2024] text-[clamp(9px,3vw,15px)] font-bold text-white shadow">
                          {num}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
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
                  {ganhouAgora ? 'Rota entregue!' : 'Rota de hoje concluída'}
                </div>
                <div className="text-sm text-muted">
                  {preview ? 'Prévia · não pontua' : 'Volte amanhã'}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-center text-xs text-muted-2">{feitos}/{n} casas preenchidas</p>
          )}
        </div>
      )}

      {ajudaAberta && <FolhaAjuda onClose={() => setAjudaAberta(false)} />}
      {intro && <FolhaIntro onClose={fecharIntro} />}
    </div>
  )
}

// Folha "Como jogar" — mesmo padrão do Tatá Tango.
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
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Trace <b className="text-text">um único caminho</b> arrastando o dedo.
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <li>• Comece no <b className="text-text">1</b> e passe pelos números <b className="text-text">em ordem</b> (1→2→3…).</li>
          <li>• <b className="text-text">Preencha todas as casas</b>, cada uma uma vez só.</li>
          <li>• Toque num ponto do traço pra <b className="text-text">voltar</b> até ali.</li>
          <li>• 1 fase por dia · tempo cronometrado.</li>
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
          <div className="font-display text-xl font-bold">Bem-vindo à Rota do Sushi!</div>
          <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-muted">
            Uma rota nova <b className="text-text">todo dia</b>. Entregue, mantenha a{' '}
            <b className="text-text">ofensiva 🔥</b> e suba de fase.
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm font-bold text-text">Como funciona</div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
            <li>• Arraste pra traçar <b className="text-text">um caminho só</b>.</li>
            <li>• Comece no <b className="text-text">1</b> e siga os números <b className="text-text">em ordem</b>.</li>
            <li>• <b className="text-text">Preencha todas as casas</b>.</li>
            <li>• 1 fase por dia · tempo cronometrado.</li>
          </ul>
        </div>
        <button onClick={onClose} className="btn-primary mt-5 w-full !py-3 text-sm font-bold">
          Bora entregar!
        </button>
      </div>
    </div>,
    document.body,
  )
}

// React.lazy exige export default (mesma convenção de Jogo/Escala/Quadros).
export default RotaSushi

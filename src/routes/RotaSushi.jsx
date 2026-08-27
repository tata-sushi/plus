import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Undo2, HelpCircle, Check, Trophy, Loader2, Clock } from 'lucide-react'
import {
  gerarRota,
  seedDaFase,
  tierDaFase,
  estaResolvida,
  vizinhos,
} from '../lib/rotasushi.js'
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
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const [pontosGanhos, setPontosGanhos] = useState(0)
  const [segundos, setSegundos] = useState(0)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const gridRef = useRef(null)
  const inicio = useRef(Date.now())
  const desenhando = useRef(false)
  const enviando = useRef(false)

  const fase = preview ? previewFase : estado?.fase || 1
  const tier = useMemo(() => tierDaFase(fase), [fase])
  const puzzle = useMemo(
    () => (estado?.ok || preview ? gerarRota(seedDaFase(JOGO, fase), tier) : null),
    [estado?.ok, preview, fase, tier],
  )
  const rows = puzzle?.rows || tier.rows
  const cols = puzzle?.cols || tier.cols
  const n = rows * cols

  // célula do número 1 (início obrigatório do traço)
  const cellUm = useMemo(() => {
    if (!puzzle) return -1
    for (const k in puzzle.numeros) if (puzzle.numeros[k] === 1) return +k
    return -1
  }, [puzzle])

  const jogouHoje = !preview && estado?.jogou_hoje
  const resolvido = ganhouAgora

  // carrega estado do jogo
  useEffect(() => {
    let ativo = true
    supabase.rpc('jogo_estado', { p_jogo: JOGO }).then(({ data }) => {
      if (!ativo) return
      setEstado(data?.ok ? data : { ok: true, fase: 1, jogou_hoje: false, streak: 0, pontos_total: 0 })
    })
    return () => {
      ativo = false
    }
  }, [])

  // (re)inicia o traço quando o puzzle muda
  useEffect(() => {
    if (cellUm >= 0) setCaminho([cellUm])
    inicio.current = Date.now()
    setSegundos(0)
  }, [cellUm])

  // cronômetro
  useEffect(() => {
    if (resolvido || jogouHoje || !puzzle) return
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [resolvido, jogouHoje, puzzle])

  const numerosNoCaminho = (cam) => cam.reduce((a, c) => a + (puzzle.numeros[c] != null ? 1 : 0), 0)

  async function ganhar(cam) {
    if (enviando.current) return
    desenhando.current = false
    const tempo = Math.floor((Date.now() - inicio.current) / 1000)
    tapHaptic()
    setGanhouAgora(true)
    if (preview) return
    enviando.current = true
    const { data } = await supabase.rpc('jogo_concluir', { p_jogo: JOGO, p_fase: fase, p_tempo_seg: tempo })
    enviando.current = false
    if (data?.pontuou) setPontosGanhos(data.pontos_ganhos || 0)
    if (data?.ok) setEstado(data)
  }

  // move o traço até a célula alvo (estende, encurta ou trava por regra)
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

  // vitória: caminho cobre tudo na ordem correta
  useEffect(() => {
    if (!puzzle || resolvido) return
    if (caminho.length === n && estaResolvida(caminho, puzzle)) ganhar(caminho)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho, puzzle, resolvido])

  function celulaDoPonteiro(e) {
    const el = gridRef.current
    if (!el) return -1
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const c = Math.floor(x / (rect.width / cols))
    const r = Math.floor(y / (rect.height / rows))
    if (r < 0 || r >= rows || c < 0 || c >= cols) return -1
    return r * cols + c
  }

  function onDown(e) {
    if (resolvido || jogouHoje) return
    const cell = celulaDoPonteiro(e)
    if (cell < 0) return
    const j = caminho.indexOf(cell)
    if (j >= 0) {
      desenhando.current = true
      gridRef.current?.setPointerCapture?.(e.pointerId)
      setCaminho((cam) => cam.slice(0, j + 1))
    }
  }
  function onMove(e) {
    if (!desenhando.current) return
    entrarCelula(celulaDoPonteiro(e))
  }
  function onUp() {
    desenhando.current = false
  }

  function redefinir() {
    tapHaptic()
    setCaminho(cellUm >= 0 ? [cellUm] : [])
    inicio.current = Date.now()
    setSegundos(0)
  }
  function desfazer() {
    setCaminho((cam) => (cam.length > 1 ? cam.slice(0, -1) : cam))
  }

  if (!estado && !preview) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Loader2 size={24} className="animate-spin text-muted-2" />
      </div>
    )
  }

  // já resolveu hoje: tela de "volte amanhã"
  if (jogouHoje && !resolvido) {
    return (
      <>
        <TopoVoltar navigate={navigate} />
        <div className="grid place-items-center px-8 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-accent-soft text-accent">
            <Check size={30} />
          </span>
          <div className="mt-4 font-display text-lg font-bold">Rota de hoje concluída! 🍣</div>
          <p className="mt-1 text-sm text-muted">Você já entregou tudo hoje. Volte amanhã pra próxima.</p>
          <div className="mt-4 hstack gap-4 text-sm">
            <span className="hstack gap-1 font-semibold text-accent">🔥 {estado.streak} dias</span>
            <span className="text-muted-2">·</span>
            <span className="text-muted">{estado.pontos_total} pts</span>
          </div>
        </div>
      </>
    )
  }

  const feitos = caminho.length
  const faltam = n - feitos
  const pts = tier ? (fase <= 20 ? 10 : fase <= 50 ? 15 : fase <= 100 ? 20 : 25) : 10

  return (
    <>
      <TopoVoltar navigate={navigate}>
        <div className="hstack items-center gap-3">
          <span className="hstack gap-1 text-sm font-semibold text-muted">
            <Clock size={15} /> {fmtTempo(segundos)}
          </span>
          <button
            onClick={redefinir}
            className="rounded-full bg-fill px-3 py-1.5 text-xs font-semibold text-muted tap"
          >
            Redefinir
          </button>
        </div>
      </TopoVoltar>

      <div className="px-5">
        <div className="hstack items-center justify-between">
          <div>
            <div className="font-display text-base font-bold">Rota do Sushi</div>
            <div className="text-[11px] text-muted">
              Fase {fase} · {preview ? 'prévia' : `🔥 ${estado.streak}`}
            </div>
          </div>
          <div className="text-right text-[11px] text-muted-2">
            {faltam > 0 ? `${feitos}/${n} casas` : 'completo!'}
          </div>
        </div>

        {/* Tabuleiro */}
        <div
          ref={gridRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="relative mx-auto mt-4 aspect-square w-full max-w-[min(88vw,26rem)] touch-none select-none overflow-hidden rounded-2xl border border-line bg-surface"
          style={{ WebkitUserSelect: 'none' }}
        >
          {/* grade de fundo */}
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: n }, (_, cell) => (
              <div key={cell} className="border-[0.5px] border-line/60" />
            ))}
          </div>

          {/* traço */}
          <svg viewBox={`0 0 ${cols} ${rows}`} className="pointer-events-none absolute inset-0 h-full w-full">
            {caminho.length > 1 && (
              <polyline
                points={caminho.map((c) => `${(c % cols) + 0.5},${((c / cols) | 0) + 0.5}`).join(' ')}
                fill="none"
                stroke="currentColor"
                className="text-accent"
                strokeWidth="0.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.9"
              />
            )}
          </svg>

          {/* checkpoints numerados (por cima do traço) */}
          <div
            className="pointer-events-none absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: n }, (_, cell) => {
              const num = puzzle?.numeros[cell]
              return (
                <div key={cell} className="grid place-items-center">
                  {num != null && (
                    <span className="grid aspect-square w-[62%] place-items-center rounded-full bg-[#1f2024] text-[clamp(10px,3.4vw,17px)] font-bold text-white shadow">
                      {num}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Ações */}
        <div className="mt-4 hstack gap-2">
          <button
            onClick={desfazer}
            disabled={caminho.length <= 1}
            className="hstack flex-1 items-center justify-center gap-2 rounded-card bg-surface py-3 text-sm font-semibold text-muted tap disabled:opacity-40"
          >
            <Undo2 size={16} /> Desfazer
          </button>
          <button
            onClick={redefinir}
            className="hstack flex-1 items-center justify-center gap-2 rounded-card bg-surface py-3 text-sm font-semibold text-muted tap"
          >
            <RotateCcw size={16} /> Recomeçar
          </button>
        </div>

        {/* Como jogar */}
        <button
          onClick={() => setAjudaAberta((v) => !v)}
          className="mt-4 hstack w-full items-center justify-between rounded-card border border-line bg-surface px-4 py-3 text-sm font-semibold tap"
        >
          <span className="hstack gap-2">
            <HelpCircle size={16} className="text-accent" /> Como jogar
          </span>
          <span className="text-muted-2">{ajudaAberta ? '−' : '+'}</span>
        </button>
        {ajudaAberta && (
          <div className="mt-2 rounded-card border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
            Trace <b className="text-text">um único caminho</b> começando no <b className="text-text">1</b>,
            passando pelos números <b className="text-text">em ordem</b> (1→2→3…) e{' '}
            <b className="text-text">preenchendo todas as casas</b>. Arraste o dedo pra desenhar; toque num
            ponto do traço pra voltar. Cada casa é usada uma vez só.
          </div>
        )}

        <div className="h-10" />
      </div>

      {/* Vitória */}
      {resolvido && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-5 pb-8 pt-5 backdrop-blur">
          <div className="mx-auto max-w-md">
            <div className="hstack items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-black">
                <Trophy size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-bold">Rota entregue! 🍣</div>
                <div className="text-xs text-muted">
                  Tempo {fmtTempo(segundos)}
                  {preview
                    ? ' · prévia (não conta)'
                    : pontosGanhos > 0
                      ? ` · +${pontosGanhos} pts`
                      : ' · sem pontos hoje'}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="btn-primary mt-4 w-full !py-3.5 text-sm"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function TopoVoltar({ navigate, children }) {
  return (
    <div className="hstack items-center justify-between px-5 pb-1 pt-3">
      <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
        <ArrowLeft size={16} /> Voltar
      </button>
      {children}
    </div>
  )
}

// React.lazy exige export default (mesma convenção de Jogo/Escala/Quadros).
export default RotaSushi

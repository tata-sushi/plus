import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Flame, RotateCcw, HelpCircle, Check, Trophy } from 'lucide-react'
import { N, montarPuzzle, seedDoDia, hojeSP, conflitos, estaResolvido } from '../lib/tatatango.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'

// Dois símbolos do puzzle (0/1). On-brand 🍣.
const SIM = ['🥑', '🍣']
const KEY = 'tatatango.v1'

function lerProgresso() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}
function salvarProgresso(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}
function ontemDe(iso) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
function dataBonita(iso) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}
function fmtTempo(s) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function Jogo() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const iso = useMemo(() => hojeSP(), [])
  const puzzle = useMemo(() => montarPuzzle(seedDoDia(iso)), [iso])

  const prog = lerProgresso()
  const jaHoje = prog.last === iso

  // grade: começa com os givens; se já resolveu hoje, mostra a solução
  const [grid, setGrid] = useState(() =>
    jaHoje ? puzzle.solution.map((r) => r.slice()) : puzzle.givens.map((r) => r.slice()),
  )
  const [resolvido, setResolvido] = useState(jaHoje)
  const [streak, setStreak] = useState(prog.streak || 0)
  const [segundos, setSegundos] = useState(0)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const inicio = useRef(Date.now())

  // cronômetro (só enquanto não resolveu)
  useEffect(() => {
    if (resolvido) return
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [resolvido])

  const bad = useMemo(() => conflitos(grid, puzzle), [grid, puzzle])

  // vitória: dispara quando a grade fica completa e correta
  useEffect(() => {
    if (resolvido || !puzzle) return
    if (estaResolvido(grid, puzzle)) venceu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, resolvido])

  function alterna(r, c) {
    if (resolvido) return
    if (puzzle.givens[r][c] >= 0) return // given travado
    tapHaptic()
    setGrid((g) => {
      const n = g.map((row) => row.slice())
      n[r][c] = n[r][c] === -1 ? 0 : n[r][c] === 0 ? 1 : -1
      return n
    })
  }

  function venceu() {
    setResolvido(true)
    setGanhouAgora(true)
    const p = lerProgresso()
    if (p.last !== iso) {
      const novo = p.last === ontemDe(iso) ? (p.streak || 0) + 1 : 1
      salvarProgresso({ last: iso, streak: novo, total: (p.total || 0) + 1 })
      setStreak(novo)
    } else {
      setStreak(p.streak || 1)
    }
  }

  function recomecar() {
    if (resolvido) return
    tapHaptic()
    setGrid(puzzle.givens.map((r) => r.slice()))
  }

  // Trava de teste: por enquanto só a matrícula 7 (mesma do atalho no Mais).
  if (usuario && String(usuario.matricula) !== '7') return <Navigate to="/" replace />

  return (
    <div className="min-h-[100dvh] bg-bg">
      {/* topo */}
      <div className="safe-top sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="hstack gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="shrink-0 text-muted tap">
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-bold leading-tight">Tatá Tango</div>
            <div className="truncate text-[11px] capitalize text-muted">Desafio de {dataBonita(iso)}</div>
          </div>
          {streak > 0 && (
            <span className="hstack shrink-0 gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-ink">
              <Flame size={13} /> {streak}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[420px] px-4 pb-28 pt-4">
        {/* regras curtas */}
        <button
          onClick={() => setAjudaAberta((v) => !v)}
          className="hstack mb-3 w-full gap-1.5 text-left text-xs font-semibold text-muted tap"
        >
          <HelpCircle size={14} className="text-accent" /> Como jogar
        </button>
        {ajudaAberta && (
          <div className="mb-4 rounded-card border border-line bg-surface p-3.5 text-[12.5px] leading-relaxed text-muted">
            <p className="mb-1.5">Preencha a grade com {SIM[0]} e {SIM[1]}. Toque numa célula pra alternar.</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>3 de cada por <b className="text-text">linha</b> e por <b className="text-text">coluna</b>.</li>
              <li>Nunca <b className="text-text">3 iguais seguidos</b>.</li>
              <li><b className="text-text">=</b> entre células: iguais · <b className="text-text">✕</b>: diferentes.</li>
            </ul>
          </div>
        )}

        {/* tabuleiro */}
        <div className="relative mx-auto aspect-square w-full max-w-[360px] select-none">
          <div className="grid h-full w-full grid-cols-6 overflow-hidden rounded-xl border border-line bg-surface">
            {grid.map((row, r) =>
              row.map((v, c) => {
                const fixo = puzzle.givens[r][c] >= 0
                const erro = bad.has(r + ',' + c)
                return (
                  <button
                    key={r + '-' + c}
                    onClick={() => alterna(r, c)}
                    disabled={resolvido || fixo}
                    className={[
                      'flex aspect-square items-center justify-center border-[0.5px] border-line text-[clamp(18px,7vw,30px)] leading-none transition-colors',
                      fixo ? 'bg-fill/70' : 'bg-surface active:bg-fill',
                      erro ? '!bg-danger/20' : '',
                    ].join(' ')}
                    aria-label={`linha ${r + 1} coluna ${c + 1}`}
                  >
                    <span className={erro ? 'opacity-90' : fixo ? 'opacity-100' : 'opacity-95'}>
                      {v === -1 ? '' : SIM[v]}
                    </span>
                  </button>
                )
              }),
            )}
          </div>

          {/* dicas horizontais (=/×) sobre as bordas verticais */}
          {puzzle.H.map((row, r) =>
            row.map((rel, c) =>
              rel ? (
                <Dica
                  key={'h' + r + '-' + c}
                  rel={rel}
                  left={((c + 1) / N) * 100}
                  top={((r + 0.5) / N) * 100}
                />
              ) : null,
            ),
          )}
          {/* dicas verticais sobre as bordas horizontais */}
          {puzzle.V.map((row, r) =>
            row.map((rel, c) =>
              rel ? (
                <Dica
                  key={'v' + r + '-' + c}
                  rel={rel}
                  left={((c + 0.5) / N) * 100}
                  top={((r + 1) / N) * 100}
                />
              ) : null,
            ),
          )}
        </div>

        {/* barra inferior de status/ações */}
        <div className="mt-5 hstack items-center justify-between">
          <span className="font-mono text-sm text-muted">⏱ {fmtTempo(segundos)}</span>
          <button
            onClick={recomecar}
            disabled={resolvido}
            className="hstack gap-1.5 rounded-pill border border-line px-3.5 py-2 text-xs font-semibold text-muted tap disabled:opacity-40"
          >
            <RotateCcw size={14} /> Recomeçar
          </button>
        </div>

        {/* resultado */}
        {resolvido && (
          <div className="mt-6 rounded-2xl border border-accent/40 bg-accent-soft/60 p-5 text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-accent text-black">
              {ganhouAgora ? <Check size={26} strokeWidth={3} /> : <Trophy size={24} />}
            </div>
            <div className="font-display text-lg font-bold text-accent-ink">
              {ganhouAgora ? 'Resolvido! 🎉' : 'Você já resolveu hoje'}
            </div>
            <div className="mt-1 text-sm text-muted">
              {ganhouAgora && `Em ${fmtTempo(segundos)} · `}
              Ofensiva de <b className="text-text">{streak}</b> dia{streak === 1 ? '' : 's'} <Flame size={13} className="mb-0.5 inline text-accent" />
            </div>
            <div className="mt-3 text-xs text-muted-2">Volte amanhã para o próximo desafio.</div>
          </div>
        )}
      </div>
    </div>
  )
}

function Dica({ rel, left, top }) {
  return (
    <span
      className="pointer-events-none absolute z-10 grid h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg text-[11px] font-extrabold text-muted"
      style={{ left: left + '%', top: top + '%' }}
    >
      {rel === 1 ? '=' : '✕'}
    </span>
  )
}

// React.lazy exige export default (mesma convenção de Escala/Quadros/Limpeza).
export default Jogo

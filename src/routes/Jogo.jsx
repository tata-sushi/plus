import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Flame, RotateCcw, HelpCircle, Check, Trophy, Loader2, Zap } from 'lucide-react'
import {
  N,
  montarPuzzle,
  seedDaFase,
  tierDaFase,
  conflitos,
  estaResolvido,
} from '../lib/tatatango.js'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { Avatar } from '../components/Avatar.jsx'

const JOGO = 'tatatango'
const SIM = ['🍥', '🍣'] // 0 = roll · 1 = nigiri

function fmtTempo(s) {
  if (s == null) return '—'
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function Jogo() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [estado, setEstado] = useState(null) // null = carregando
  const [grid, setGrid] = useState(null)
  const [resolvido, setResolvido] = useState(false)
  const [ganhouAgora, setGanhouAgora] = useState(false)
  const [pontosGanhos, setPontosGanhos] = useState(0)
  const [segundos, setSegundos] = useState(0)
  const [ranking, setRanking] = useState(null)
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const inicio = useRef(Date.now())
  const enviando = useRef(false)

  const fase = estado?.fase || 1
  const tier = useMemo(() => tierDaFase(fase), [fase])
  const puzzle = useMemo(
    () => (estado?.ok ? montarPuzzle(seedDaFase(JOGO, fase), tier.extras) : null),
    [estado?.ok, fase, tier.extras],
  )

  // carrega o estado do jogador
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

  // inicializa a grade quando o puzzle fica pronto
  useEffect(() => {
    if (!puzzle || !estado) return
    const jah = !!estado.jogou_hoje
    setResolvido(jah)
    setGanhouAgora(false)
    setGrid(jah ? puzzle.solution.map((r) => r.slice()) : puzzle.givens.map((r) => r.slice()))
    inicio.current = Date.now()
    setSegundos(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle])

  // ranking de velocidade da fase atual
  useEffect(() => {
    if (!estado?.ok) return
    supabase.rpc('jogo_ranking', { p_jogo: JOGO, p_fase: fase }).then(({ data }) => setRanking(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado?.ok, fase])

  // cronômetro
  useEffect(() => {
    if (resolvido || !grid) return
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [resolvido, grid])

  const bad = useMemo(() => (grid && puzzle ? conflitos(grid, puzzle) : new Set()), [grid, puzzle])

  // vitória: grade completa e correta → conclui no backend
  useEffect(() => {
    if (resolvido || !grid || !puzzle || enviando.current) return
    if (estaResolvido(grid, puzzle)) concluir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid])

  async function concluir() {
    enviando.current = true
    setResolvido(true)
    setGanhouAgora(true)
    const tempo = Math.floor((Date.now() - inicio.current) / 1000)
    setSegundos(tempo)
    tapHaptic()
    const { data } = await supabase.rpc('jogo_concluir', { p_jogo: JOGO, p_fase: fase, p_tempo_seg: tempo })
    if (data?.ok) {
      setPontosGanhos(data.pontos_ganhos || 0)
      // mantém a fase ATUAL na tela (não pula pra próxima); atualiza só ofensiva/pontos
      setEstado((e) => ({ ...e, jogou_hoje: true, streak: data.streak ?? e.streak, pontos_total: data.pontos_total ?? e.pontos_total }))
    }
    supabase.rpc('jogo_ranking', { p_jogo: JOGO, p_fase: fase }).then(({ data }) => setRanking(data || []))
  }

  function alterna(r, c) {
    if (resolvido || !grid) return
    if (puzzle.givens[r][c] >= 0) return
    tapHaptic()
    setGrid((g) => {
      const n = g.map((row) => row.slice())
      n[r][c] = n[r][c] === -1 ? 0 : n[r][c] === 0 ? 1 : -1
      return n
    })
  }

  function recomecar() {
    if (resolvido || !puzzle) return
    tapHaptic()
    setGrid(puzzle.givens.map((r) => r.slice()))
    inicio.current = Date.now()
    setSegundos(0)
  }

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
            <div className="truncate text-[11px] text-muted">
              Fase {fase} · {tier.rotulo}
            </div>
          </div>
          {estado?.streak > 0 && (
            <span className="hstack shrink-0 gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-ink">
              <Flame size={13} /> {estado.streak}
            </span>
          )}
        </div>
      </div>

      {!grid ? (
        <div className="hstack justify-center py-24 text-muted-2">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="mx-auto max-w-[420px] px-4 pb-28 pt-4">
          {/* regras */}
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
                      <span>{v === -1 ? '' : SIM[v]}</span>
                    </button>
                  )
                }),
              )}
            </div>
            {puzzle.H.map((row, r) =>
              row.map((rel, c) =>
                rel ? <Dica key={'h' + r + '-' + c} rel={rel} left={((c + 1) / N) * 100} top={((r + 0.5) / N) * 100} /> : null,
              ),
            )}
            {puzzle.V.map((row, r) =>
              row.map((rel, c) =>
                rel ? <Dica key={'v' + r + '-' + c} rel={rel} left={((c + 0.5) / N) * 100} top={((r + 1) / N) * 100} /> : null,
              ),
            )}
          </div>

          {/* status */}
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
                {ganhouAgora ? 'Resolvido! 🎉' : 'Fase concluída hoje'}
              </div>
              <div className="mt-1 text-sm text-muted">
                {ganhouAgora && pontosGanhos > 0 && (
                  <>
                    <b className="text-text">+{pontosGanhos}</b> pontos ·{' '}
                  </>
                )}
                Em {fmtTempo(segundos)}
              </div>
              <div className="mt-3 text-xs text-muted-2">Volte amanhã para a fase {fase + 1}.</div>
            </div>
          )}

          {/* ranking de velocidade da fase */}
          <div className="mt-7">
            <div className="hstack mb-2 gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-muted-2">
              <Zap size={13} className="text-accent" /> Mais rápidos · Fase {fase}
            </div>
            {ranking == null ? (
              <div className="hstack justify-center py-4 text-muted-2">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : ranking.length === 0 ? (
              <div className="rounded-card border border-line bg-surface px-4 py-5 text-center text-xs text-muted">
                Ninguém concluiu esta fase ainda. Seja o primeiro! ⚡
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {ranking.map((r) => {
                  const eu = String(r.matricula) === String(usuario?.matricula)
                  return (
                    <div
                      key={r.matricula}
                      className={[
                        'hstack gap-3 rounded-card border px-3 py-2',
                        eu ? 'border-accent bg-accent-soft/50' : 'border-line bg-surface',
                      ].join(' ')}
                    >
                      <span className="w-5 shrink-0 text-center font-mono text-xs font-bold text-muted-2">
                        {r.posicao}
                      </span>
                      <Avatar name={r.nome} src={r.avatar} size={30} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {r.nome || 'Colaborador'}
                        {eu && <span className="ml-1 text-[11px] font-bold text-accent">você</span>}
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold text-accent-ink">
                        {fmtTempo(r.tempo_seg)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
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

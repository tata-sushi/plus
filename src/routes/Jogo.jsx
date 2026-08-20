import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Flame, RotateCcw, HelpCircle, Check, Trophy, Loader2, X, Clock } from 'lucide-react'
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
import { Header } from '../components/Header.jsx'

const JOGO = 'tatatango'
const SIM = ['🍙', '🍣'] // 0 = bolinho de arroz · 1 = nigiri

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
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const [intro, setIntro] = useState(false)
  const inicio = useRef(Date.now())
  const enviando = useRef(false)

  const fase = estado?.fase || 1
  const tier = useMemo(() => tierDaFase(fase), [fase])
  const puzzle = useMemo(
    () => (estado?.ok ? montarPuzzle(seedDaFase(JOGO, fase), tier.extras) : null),
    [estado?.ok, fase, tier.extras],
  )

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

  // primeiro acesso: mostra o modal de boas-vindas uma única vez (por aparelho)
  useEffect(() => {
    try {
      if (!localStorage.getItem('tatatango.intro')) setIntro(true)
    } catch {
      /* ignore */
    }
  }, [])

  function fecharIntro() {
    try {
      localStorage.setItem('tatatango.intro', '1')
    } catch {
      /* ignore */
    }
    setIntro(false)
  }

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

  useEffect(() => {
    if (resolvido || !grid) return
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [resolvido, grid])

  const bad = useMemo(() => (grid && puzzle ? conflitos(grid, puzzle) : new Set()), [grid, puzzle])

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
      setEstado((e) => ({ ...e, jogou_hoje: true, streak: data.streak ?? e.streak, pontos_total: data.pontos_total ?? e.pontos_total }))
    }
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
      <Header />
      {/* linha Voltar — mesmo padrão da Agenda */}
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

      {!grid ? (
        <div className="hstack justify-center py-24 text-muted-2">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[420px] px-5 pb-28 pt-4">
          {/* título do jogo */}
          <div className="mb-5 text-center">
            <div className="font-display text-[19px] font-bold leading-tight">Tatá Tango</div>
          </div>
          {/* barra: 🔥 ofensiva · ⏱ tempo (centro) · ↺ recarregar + ? (direita) — todos no mesmo tamanho */}
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

          {/* tabuleiro */}
          <div className="relative aspect-square w-full select-none">
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

          {/* resultado */}
          {resolvido && (
            <div className="mt-5 hstack gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 px-4 py-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-black">
                {ganhouAgora ? <Check size={22} strokeWidth={3} /> : <Trophy size={20} />}
              </div>
              <div className="min-w-0">
                <div className="font-display text-base font-bold text-accent-ink">
                  {ganhouAgora ? 'Resolvido! 🎉' : 'Fase concluída hoje'}
                </div>
                <div className="text-sm text-muted">
                  {ganhouAgora && pontosGanhos > 0 ? (
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

// Folha "Como jogar" — mesmo padrão do ⓘ da Agenda.
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
          Preencha a grade com {SIM[0]} e {SIM[1]}. Toque numa célula pra alternar entre eles.
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <li>• 3 de cada por <b className="text-text">linha</b> e por <b className="text-text">coluna</b>.</li>
          <li>• Nunca <b className="text-text">3 iguais seguidos</b> (na horizontal ou vertical).</li>
          <li>• <b className="text-text">=</b> entre duas células: elas são <b className="text-text">iguais</b>.</li>
          <li>• <b className="text-text">✕</b> entre duas células: elas são <b className="text-text">diferentes</b>.</li>
        </ul>
      </div>
    </div>,
    document.body,
  )
}

// Boas-vindas — aparece só no primeiro acesso ao jogo.
function FolhaIntro({ onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-bg px-5 pb-7 pt-5 shadow-xl sm:max-w-[520px] sm:rounded-2xl">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line sm:hidden" />
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-3xl">🍣</div>
          <div className="font-display text-xl font-bold">Bem-vindo ao Tatá Tango!</div>
          <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-muted">
            Um desafio de lógica novo <b className="text-text">todo dia</b>. Resolva, mantenha a{' '}
            <b className="text-text">ofensiva 🔥</b> e suba de fase.
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="text-sm font-bold text-text">Como funciona</div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Preencha a grade com {SIM[0]} e {SIM[1]} (toque pra alternar), seguindo:
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
            <li>• 3 de cada por <b className="text-text">linha</b> e por <b className="text-text">coluna</b>.</li>
            <li>• Nunca <b className="text-text">3 iguais seguidos</b>.</li>
            <li>• <b className="text-text">=</b> vizinhos iguais · <b className="text-text">✕</b> vizinhos diferentes.</li>
          </ul>
        </div>
        <button onClick={onClose} className="btn-primary mt-5 w-full !py-3 text-sm font-bold">
          Bora jogar! 🍣
        </button>
      </div>
    </div>,
    document.body,
  )
}

// React.lazy exige export default (mesma convenção de Escala/Quadros/Limpeza).
export default Jogo

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import { Loader2, ChevronLeft, ChevronRight, CalendarClock, Check, X, Coffee, Repeat, Pencil, RotateCcw, Coins, CircleCheck } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

// ── Escala de trabalho (teste — liberado pelo painel de admin) ────────────────
// Modelo novo (schema dp_rh): cada colaborador tem um PADRÃO recorrente (com
// revezamento e "vale a partir de"), que o backend materializa semana a semana.
// O líder pode fazer um ajuste PONTUAL num dia (override manual) sem mexer no molde.
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const PRESETS = ['08:00-16:00', '09:00-18:00', '10:00-18:00', '11:00-15:00', '14:00-22:00', '16:00-00:00']
const CICLOS = [1, 2, 3, 4]
const letra = (i) => String.fromCharCode(65 + i) // 0→A, 1→B…

const pad = (n) => String(n).padStart(2, '0')
const isoLocal = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
function segunda(offset) {
  const h = new Date()
  const x = new Date(h.getFullYear(), h.getMonth(), h.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7) + offset * 7)
  return x
}
const hm = (t) => (t ? String(t).slice(0, 5) : '')
const hojeISO = () => isoLocal(new Date())
const ddmm = (iso) => {
  const p = String(iso).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso
}

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}
function avisar(e) {
  // eslint-disable-next-line no-alert
  window.alert(e?.message || 'Não foi possível concluir a ação.')
}

function Escala() {
  const { usuario } = useAuth()
  if (!usuario || usuario.perfilPendente || usuario.podeEscala == null) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }
  if (!usuario.podeEscala) return <Navigate to="/" replace />
  return <Painel />
}

function Painel() {
  const { usuario } = useAuth()
  const podeGerir = !!usuario?.podeEscala // líder (monta escala); colaborador só vê calendário
  const [aba, setAba] = useState(podeGerir ? 'montar' : 'calendario')
  const [offset, setOffset] = useState(0)
  const inicio = useMemo(() => isoLocal(segunda(offset)), [offset])
  const dias = useMemo(() => {
    const s = segunda(offset)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s)
      d.setDate(s.getDate() + i)
      return isoLocal(d)
    })
  }, [offset])

  return (
    <>
      <Header title="Escala" />
      <Voltar />

      {podeGerir && (
        <div className="px-5 pt-1">
          <div className="hstack rounded-pill border border-line bg-surface p-0.5 text-xs font-semibold">
            <button onClick={() => setAba('montar')} className={cn('flex-1 rounded-pill py-1.5 tap', aba === 'montar' ? 'bg-accent-soft text-accent' : 'text-muted')}>
              Montar
            </button>
            <button onClick={() => setAba('calendario')} className={cn('flex-1 rounded-pill py-1.5 tap', aba === 'calendario' ? 'bg-accent-soft text-accent' : 'text-muted')}>
              Calendário
            </button>
          </div>
        </div>
      )}

      <div className={cn('mt-3 hstack justify-between px-5', aba === 'calendario' && 'hidden')}>
        <button onClick={() => setOffset((o) => o - 1)} aria-label="Semana anterior" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <ChevronLeft size={16} />
        </button>
        <div className="hstack gap-2 text-sm font-bold">
          <CalendarClock size={15} className="text-accent" />
          {ddmm(dias[0])} – {ddmm(dias[6])}
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="rounded-pill border border-line px-2 py-0.5 text-[10px] font-semibold text-muted tap">
              hoje
            </button>
          )}
        </div>
        <button onClick={() => setOffset((o) => o + 1)} aria-label="Próxima semana" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <ChevronRight size={16} />
        </button>
      </div>

      {aba === 'montar' ? <Montar inicio={inicio} dias={dias} /> : <Calendario />}
    </>
  )
}

// ── Calendário (consulta do mês — visão do colaborador) ───────────────────────
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
// Pares [entrada, saida] de um dia (até 3 marcações); cai no par único se não houver lista.
function paresDe(info) {
  if (!info) return []
  if (Array.isArray(info.marcacoes) && info.marcacoes.length) return info.marcacoes.map((m) => [hm(m.entrada), hm(m.saida)])
  return hm(info.entrada) ? [[hm(info.entrada), hm(info.saida)]] : []
}
function Calendario() {
  const [mesOffset, setMesOffset] = useState(0)
  const [mapa, setMapa] = useState(null) // { 'YYYY-MM-DD': { entrada, saida, folga, marcacoes } }
  const [det, setDet] = useState(null) // { info, dia } — detalhe do dia (marcações)
  const base = useMemo(() => {
    const h = new Date()
    return new Date(h.getFullYear(), h.getMonth() + mesOffset, 1)
  }, [mesOffset])
  const ano = base.getFullYear()
  const mes = base.getMonth()
  const grid = useMemo(() => {
    const first = new Date(ano, mes, 1)
    const start = new Date(first)
    start.setDate(1 - ((first.getDay() + 6) % 7)) // segunda na/antes da 1ª
    const last = new Date(ano, mes + 1, 0)
    const end = new Date(last)
    end.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7))) // domingo na/depois da última
    const days = []
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d))
    return { days, startISO: isoLocal(start), endISO: isoLocal(end) }
  }, [ano, mes])

  useEffect(() => {
    let a = true
    setMapa(null)
    call('escala_meu_periodo', { p_inicio: grid.startISO, p_fim: grid.endISO })
      .then((d) => a && setMapa(d && typeof d === 'object' ? d : {}))
      .catch(() => a && setMapa({}))
    return () => {
      a = false
    }
  }, [grid.startISO, grid.endISO])

  const hoje = hojeISO()
  return (
    <div className="px-5 pt-4 pb-24">
      <div className="hstack justify-between">
        <button onClick={() => setMesOffset((o) => o - 1)} aria-label="Mês anterior" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <ChevronLeft size={16} />
        </button>
        <div className="hstack gap-2 text-sm font-bold">
          {MESES[mes]} {ano}
          {mesOffset !== 0 && (
            <button onClick={() => setMesOffset(0)} className="rounded-pill border border-line px-2 py-0.5 text-[10px] font-semibold text-muted tap">
              hoje
            </button>
          )}
        </div>
        <button onClick={() => setMesOffset((o) => o + 1)} aria-label="Próximo mês" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-2">
        {DIAS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="relative mt-1 grid grid-cols-7 gap-1">
        {grid.days.map((d) => {
          const iso = isoLocal(d)
          const noMes = d.getMonth() === mes
          const info = mapa?.[iso]
          const isHoje = iso === hoje
          const folga = !!info?.folga
          const trab = !!info && !info.folga
          const pares = paresDe(info)
          const clicavel = noMes && !!info
          return (
            <button
              key={iso}
              type="button"
              onClick={clicavel ? () => setDet({ info, dia: d }) : undefined}
              disabled={!clicavel}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px]',
                clicavel && 'tap',
                !noMes
                  ? 'border-transparent text-muted-2/40'
                  : isHoje
                    ? 'border-accent ring-1 ring-accent'
                    : trab
                      ? 'border-accent/30 bg-accent-soft'
                      : folga
                        ? 'border-line bg-fill'
                        : 'border-line',
              )}
            >
              {/* dia passado de trabalho: ✓ validou o check / ✗ não pontuou */}
              {noMes && trab && iso < hoje &&
                (info.validado ? (
                  <Check size={9} strokeWidth={3} className="absolute right-0.5 top-0.5 text-accent" />
                ) : (
                  <X size={9} strokeWidth={3} className="absolute right-0.5 top-0.5 text-muted-2/70" />
                ))}
              <span className={cn('font-bold', isHoje ? 'text-accent' : trab ? 'text-carbon dark:text-accent' : '')}>{d.getDate()}</span>
              {noMes && folga && <Coffee size={9} className="text-muted-2" />}
              {noMes && trab && pares.length > 0 && (
                <span className="text-[8px] font-semibold text-muted">
                  {pares[0][0]}
                  {pares.length > 1 && <span className="text-accent"> ·{pares.length}</span>}
                </span>
              )}
            </button>
          )
        })}
        {mapa == null && (
          <div className="absolute inset-0 grid place-items-center bg-bg/50">
            <Loader2 size={20} className="animate-spin text-muted" />
          </div>
        )}
      </div>

      <div className="mt-4 hstack flex-wrap gap-4 text-[11px] text-muted">
        <span className="hstack gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-accent/30 bg-accent-soft" /> Trabalho
        </span>
        <span className="hstack gap-1.5">
          <span className="grid h-3.5 w-3.5 place-items-center rounded border border-line bg-fill">
            <Coffee size={8} className="text-muted-2" />
          </span>
          Folga
        </span>
        <span className="hstack gap-1.5">
          <Check size={13} strokeWidth={3} className="text-accent" /> Validou
        </span>
        <span className="hstack gap-1.5">
          <X size={13} strokeWidth={3} className="text-muted-2/70" /> Não pontuou
        </span>
      </div>

      {det && (
        <Folha onClose={() => setDet(null)}>
          <div className="hstack gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
              <CalendarClock size={18} />
            </span>
            <div>
              <div className="font-display text-base font-bold">
                {det.dia.getDate()} de {MESES[det.dia.getMonth()]}
              </div>
              <div className="text-xs text-muted">{DIAS[(det.dia.getDay() + 6) % 7]}</div>
            </div>
          </div>
          <div className="mt-4">
            {det.info.folga ? (
              <div className="hstack gap-2 rounded-card border border-line bg-fill px-4 py-3 text-sm font-semibold text-muted">
                <Coffee size={16} /> {det.info.tipo_folga || 'Folga'}
              </div>
            ) : paresDe(det.info).length ? (
              <div className="flex flex-col gap-2">
                {paresDe(det.info).map((p, i) => (
                  <div key={i} className="hstack items-center justify-between rounded-card border border-line px-4 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                      {paresDe(det.info).length > 1 ? `Marcação ${i + 1}` : 'Horário'}
                    </span>
                    <span className="text-sm font-bold">
                      {p[0]} <span className="text-muted-2">–</span> {p[1]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-card border border-line px-4 py-3 text-sm font-bold">
                Trabalha <span className="font-normal text-muted-2">· sem horário definido</span>
              </div>
            )}
          </div>
        </Folha>
      )}
    </div>
  )
}

// ── Montar escala (líder) ─────────────────────────────────────────────────────
function Montar({ inicio, dias }) {
  const [unidades, setUnidades] = useState(null)
  const [unidade, setUnidade] = useState('')
  const [equipe, setEquipe] = useState(null)
  const [editarDia, setEditarDia] = useState(null) // ajuste pontual { matricula, nome, data, dia }
  const [editarPadrao, setEditarPadrao] = useState(null) // molde { matricula, nome, unidade }
  const [confirmandoSemana, setConfirmandoSemana] = useState(false)
  const [resSemana, setResSemana] = useState(null) // feedback do "confirmar semana"

  useEffect(() => {
    call('escala_unidades')
      .then((d) => {
        const u = Array.isArray(d) ? d : []
        setUnidades(u)
        setUnidade((x) => x || u[0] || '')
      })
      .catch(() => setUnidades([]))
  }, [])

  const carregar = useCallback(() => {
    if (!unidade) return
    setEquipe(null)
    call('escala_equipe_semana', { p_inicio: inicio, p_unidade: unidade })
      .then((d) => setEquipe(Array.isArray(d) ? d : []))
      .catch((e) => {
        avisar(e)
        setEquipe([])
      })
  }, [inicio, unidade])
  useEffect(() => {
    carregar()
  }, [carregar])
  useEffect(() => {
    setResSemana(null)
  }, [inicio, unidade])

  async function confirmarSemana() {
    setConfirmandoSemana(true)
    try {
      const r = await call('escala_semana_confirmar', { p_inicio: inicio, p_unidade: unidade })
      setResSemana(
        r?.creditados > 0
          ? `Semana confirmada! +${r.pontos} pts (${r.creditados} ${r.creditados === 1 ? 'pessoa' : 'pessoas'}).`
          : 'Semana já confirmada — sem novos pontos.',
      )
    } catch (e) {
      avisar(e)
    } finally {
      setConfirmandoSemana(false)
    }
  }

  return (
    <div className="pt-3 pb-24">
      <div className="px-5">
        {unidades == null ? (
          <div className="h-9 w-full animate-pulse rounded-card bg-fill" />
        ) : (
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm font-semibold outline-none">
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
        <p className="mt-2 text-[11px] leading-snug text-muted-2">
          Toque no <b className="font-semibold text-muted">nome</b> pra definir o padrão (repete sozinho toda semana). Toque num <b className="font-semibold text-muted">dia</b> pra um ajuste pontual.
        </p>
        <button
          onClick={confirmarSemana}
          disabled={confirmandoSemana || !unidade}
          className="mt-2 hstack w-full items-center justify-between rounded-card border border-line bg-surface px-4 py-2.5 tap disabled:opacity-40"
        >
          <span className="hstack gap-2 text-sm font-semibold">
            {confirmandoSemana ? <Loader2 size={16} className="animate-spin text-muted-2" /> : <CircleCheck size={16} className="text-muted-2" />}
            Confirmar semana
          </span>
          <span className="hstack shrink-0 gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
            <Coins size={12} /> +10/pessoa
          </span>
        </button>
        {resSemana && <div className="mt-2 rounded-card border border-accent/40 bg-accent-soft px-3 py-2 text-xs font-semibold text-carbon dark:text-accent">{resSemana}</div>}
      </div>

      {equipe == null ? (
        <div className="grid place-items-center py-16 text-muted">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : equipe.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted">Nenhuma pessoa ativa nesta unidade.</div>
      ) : (
        <div className="mt-3 overflow-x-auto no-scrollbar px-5">
          <table className="border-separate" style={{ borderSpacing: '4px' }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-bg" />
                {dias.map((d, i) => {
                  const hoje = d === hojeISO()
                  return (
                    <th key={d} className="min-w-[58px] px-1 pb-1 text-center">
                      <div className={cn('text-[10px] font-bold uppercase', hoje ? 'text-accent' : 'text-muted')}>{DIAS[i]}</div>
                      <div className="text-[9px] text-muted-2">{ddmm(d)}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {equipe.map((p) => (
                <tr key={p.matricula}>
                  <td className="sticky left-0 z-10 bg-bg pr-2 align-top">
                    <button
                      onClick={() => setEditarPadrao({ matricula: p.matricula, nome: p.nome, unidade })}
                      className="flex w-[116px] flex-col items-start gap-1 rounded-lg py-1 text-left tap"
                    >
                      <span className="hstack gap-2">
                        <Avatar name={p.nome} src={p.avatar} size={26} />
                        <span className="min-w-0 truncate text-xs font-semibold">{(p.nome || '').split(' ')[0]}</span>
                      </span>
                      <span className="hstack gap-1 rounded-pill border border-line px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-2">
                        <Pencil size={9} /> Padrão
                      </span>
                    </button>
                  </td>
                  {(p.dias || []).map((dia) => {
                    const hoje = dia.data === hojeISO()
                    const manual = dia.origem === 'manual'
                    return (
                      <td key={dia.data} className="p-0 align-top">
                        <button
                          onClick={() => setEditarDia({ matricula: p.matricula, nome: p.nome, data: dia.data, dia })}
                          className={cn(
                            'relative grid h-12 w-[58px] place-items-center rounded-lg border text-center tap',
                            dia.folga ? 'border-line bg-fill text-muted' : dia.definido ? 'border-accent/50 bg-accent-soft text-carbon dark:text-accent' : 'border-dashed border-line text-muted-2',
                            hoje && 'ring-1 ring-accent',
                          )}
                        >
                          {manual && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#35383F] dark:bg-accent" title="Ajuste manual" />}
                          {dia.folga ? (
                            <Coffee size={14} />
                          ) : dia.definido ? (
                            hm(dia.entrada) ? (
                              <span className="leading-tight">
                                <span className="block text-[11px] font-bold">{hm(dia.entrada)}</span>
                                <span className="block text-[10px] text-muted">{hm(dia.saida)}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold">Trab.</span>
                            )
                          ) : (
                            <span className="text-base">+</span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editarDia && (
        <EditarTurno
          alvo={editarDia}
          onClose={() => setEditarDia(null)}
          onFeito={() => {
            setEditarDia(null)
            carregar()
          }}
        />
      )}
      {editarPadrao && (
        <EditarPadrao
          alvo={editarPadrao}
          inicioView={inicio}
          onClose={() => setEditarPadrao(null)}
          onFeito={() => {
            setEditarPadrao(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}

// Bottom-sheet no mobile, card centralizado no desktop (mesmo formato dos modais).
function Folha({ children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-bg px-5 pb-8 pt-4 shadow-xl sm:max-w-[520px] sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line sm:hidden" />
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ── Ajuste pontual de um dia (override manual sobre o padrão) ──────────────────
function EditarTurno({ alvo, onClose, onFeito }) {
  const manual = alvo.dia?.origem === 'manual'
  const [entrada, setEntrada] = useState(alvo.dia.folga ? '' : hm(alvo.dia.entrada))
  const [saida, setSaida] = useState(alvo.dia.folga ? '' : hm(alvo.dia.saida))
  const [salvando, setSalvando] = useState(false)

  async function salvar(folga) {
    setSalvando(true)
    try {
      await call('escala_dia_set', {
        p_matricula: alvo.matricula,
        p_data: alvo.data,
        p_entrada: folga ? null : entrada || null,
        p_saida: folga ? null : saida || null,
        p_folga: folga,
      })
      await onFeito()
    } catch (e) {
      avisar(e)
      setSalvando(false)
    }
  }
  async function voltarPadrao() {
    setSalvando(true)
    try {
      await call('escala_dia_reset', { p_matricula: alvo.matricula, p_data: alvo.data })
      await onFeito()
    } catch (e) {
      avisar(e)
      setSalvando(false)
    }
  }

  return (
    <Folha onClose={onClose}>
      <div className="hstack gap-3">
        <Avatar name={alvo.nome} size={34} />
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold">{(alvo.nome || '').split(' ').slice(0, 2).join(' ')}</div>
          <div className="text-xs text-muted">Ajuste pontual · {ddmm(alvo.data)}</div>
        </div>
      </div>

      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Turnos rápidos</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const [e, s] = p.split('-')
          const on = e === entrada && s === saida
          return (
            <button
              key={p}
              onClick={() => {
                setEntrada(e)
                setSaida(s)
              }}
              className={cn('rounded-pill border px-3 py-1.5 text-xs font-semibold tap', on ? 'border-accent bg-accent-soft text-carbon dark:text-accent' : 'border-line text-muted')}
            >
              {e}–{s}
            </button>
          )
        })}
      </div>

      <div className="mt-4 hstack gap-3">
        <label className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Entrada</div>
          <input type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} className="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none" />
        </label>
        <label className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Saída</div>
          <input type="time" value={saida} onChange={(e) => setSaida(e.target.value)} className="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none" />
        </label>
      </div>

      <button onClick={() => salvar(false)} disabled={salvando || !entrada || !saida} className="btn-primary mt-5 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar ajuste
      </button>

      <div className="mt-2 hstack gap-2">
        <button onClick={() => salvar(true)} disabled={salvando} className="hstack flex-1 justify-center gap-2 rounded-card border border-line py-2.5 text-sm font-semibold text-muted tap disabled:opacity-40">
          <Coffee size={15} /> Marcar folga
        </button>
        {manual && (
          <button onClick={voltarPadrao} disabled={salvando} className="hstack flex-1 justify-center gap-2 rounded-card border border-line py-2.5 text-sm font-semibold text-muted tap disabled:opacity-40">
            <RotateCcw size={15} /> Voltar ao padrão
          </button>
        )}
      </div>
    </Folha>
  )
}

// ── Editor do PADRÃO (molde recorrente, com revezamento + vigência) ────────────
const diaVazio = (dow) => (dow <= 4 ? { entrada: '09:00', saida: '18:00', folga: false } : { entrada: '', saida: '', folga: true })
function novasSemanas(n) {
  return Array.from({ length: n }, () => Array.from({ length: 7 }, (_, dow) => diaVazio(dow)))
}
function montarSemanas(n, dias) {
  const w = Array.from({ length: n }, () => Array.from({ length: 7 }, () => ({ entrada: '', saida: '', folga: false })))
  ;(dias || []).forEach((d) => {
    const sc = d.semana_ciclo ?? 0
    const dow = d.dia_semana
    if (sc >= 0 && sc < n && dow >= 0 && dow < 7) w[sc][dow] = { entrada: hm(d.entrada), saida: hm(d.saida), folga: !!d.folga }
  })
  return w
}

function EditarPadrao({ alvo, inicioView, onClose, onFeito }) {
  const [efetivo, setEfetivo] = useState(inicioView)
  const [ciclo, setCiclo] = useState(1)
  const [semanas, setSemanas] = useState(null) // [sc][dow] = { entrada, saida, folga }
  const [controla, setControla] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let a = true
    Promise.all([
      call('escala_padrao_get', { p_matricula: alvo.matricula }).catch(() => null),
      call('escala_pessoa_get', { p_matricula: alvo.matricula }).catch(() => true),
    ]).then(([p, ctrl]) => {
      if (!a) return
      setControla(ctrl !== false)
      if (p && Array.isArray(p.dias) && p.dias.length) {
        const n = p.semanas_ciclo || 1
        setCiclo(n)
        setSemanas(montarSemanas(n, p.dias))
      } else {
        setSemanas(novasSemanas(1))
      }
    })
    return () => {
      a = false
    }
  }, [alvo.matricula])

  function mudarCiclo(n) {
    setCiclo(n)
    setSemanas((w) => {
      const cur = w || novasSemanas(1)
      return Array.from({ length: n }, (_, i) => (cur[i] ? cur[i].map((x) => ({ ...x })) : cur[0].map((x) => ({ ...x }))))
    })
  }
  function setDia(sc, dow, patch) {
    setSemanas((w) => w.map((wk, i) => (i === sc ? wk.map((d, j) => (j === dow ? { ...d, ...patch } : d)) : wk)))
  }
  function aplicarPreset(sc, e, s) {
    setSemanas((w) => w.map((wk, i) => (i === sc ? wk.map((d, dow) => (dow <= 4 ? { entrada: e, saida: s, folga: false } : { entrada: '', saida: '', folga: true })) : wk)))
  }

  async function salvar() {
    setSalvando(true)
    try {
      await call('escala_pessoa_set', { p_matricula: alvo.matricula, p_controla: controla })
      const dias = []
      semanas.forEach((wk, sc) =>
        wk.forEach((d, dow) => {
          dias.push({
            semana_ciclo: sc,
            dia_semana: dow,
            entrada: controla && !d.folga ? d.entrada || null : null,
            saida: controla && !d.folga ? d.saida || null : null,
            folga: !!d.folga,
          })
        }),
      )
      await call('escala_padrao_set', {
        p_matricula: alvo.matricula,
        p_efetivo_desde: efetivo,
        p_semanas_ciclo: ciclo,
        p_dias: dias,
        p_unidade: alvo.unidade || null,
      })
      await onFeito()
    } catch (e) {
      avisar(e)
      setSalvando(false)
    }
  }

  return (
    <Folha onClose={onClose}>
      <div className="hstack gap-3">
        <Avatar name={alvo.nome} size={34} />
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold">{(alvo.nome || '').split(' ').slice(0, 2).join(' ')}</div>
          <div className="text-xs text-muted">Padrão de escala</div>
        </div>
      </div>

      {semanas == null ? (
        <div className="grid place-items-center py-12 text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* controle de horário? */}
          <div className="mt-4 hstack items-center justify-between rounded-card border border-line px-3 py-2.5">
            <div className="text-sm font-semibold">Tem controle de horário?</div>
            <div className="hstack gap-0.5 rounded-pill border border-line p-0.5 text-xs font-semibold">
              <button onClick={() => setControla(true)} className={cn('rounded-pill px-3 py-1 tap', controla ? 'bg-accent-soft text-accent' : 'text-muted')}>
                Sim
              </button>
              <button onClick={() => setControla(false)} className={cn('rounded-pill px-3 py-1 tap', !controla ? 'bg-accent-soft text-accent' : 'text-muted')}>
                Não
              </button>
            </div>
          </div>

          {!controla && (
            <div className="mt-2 text-[11px] leading-snug text-muted-2">Só dias de trabalho e folga, sem horário fixo. A pessoa ainda vê a escala e valida presença.</div>
          )}

          {/* vigência + revezamento */}
          <div className="mt-4 grid grid-cols-2 items-start gap-3">
            <label>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Vale a partir de</div>
              <input type="date" value={efetivo} onChange={(e) => setEfetivo(e.target.value)} className="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none" />
            </label>
            <div>
              <div className="hstack gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <Repeat size={11} /> Revezamento
              </div>
              <div className="mt-1 hstack flex-wrap gap-1.5">
                {CICLOS.map((n) => (
                  <button
                    key={n}
                    onClick={() => mudarCiclo(n)}
                    className={cn('rounded-pill border px-2.5 py-1 text-xs font-semibold tap', ciclo === n ? 'border-accent bg-accent-soft text-carbon dark:text-accent' : 'border-line text-muted')}
                  >
                    {n === 1 ? 'Fixo' : `${n} sem`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* grade por semana do ciclo */}
          {semanas.map((wk, sc) => (
            <div key={sc} className="mt-4">
              {ciclo > 1 && <div className="text-xs font-bold text-accent">Semana {letra(sc)}</div>}
              {controla && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {PRESETS.slice(0, 4).map((p) => {
                    const [e, s] = p.split('-')
                    return (
                      <button key={p} onClick={() => aplicarPreset(sc, e, s)} className="rounded-pill border border-line px-2 py-0.5 text-[10px] font-semibold text-muted-2 tap">
                        Seg–Sex {e}–{s}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="mt-2 flex flex-col gap-1.5">
                {wk.map((d, dow) => (
                  <div key={dow} className="hstack gap-2">
                    <span className="w-9 shrink-0 text-xs font-bold uppercase text-muted">{DIAS[dow]}</span>
                    <button
                      onClick={() => setDia(sc, dow, { folga: !d.folga })}
                      className={cn('w-20 shrink-0 rounded-pill border px-2 py-1.5 text-[11px] font-semibold tap', d.folga ? 'border-line bg-fill text-muted' : 'border-accent/50 bg-accent-soft text-carbon dark:text-accent')}
                    >
                      {d.folga ? 'Folga' : 'Trabalha'}
                    </button>
                    {controla && !d.folga && (
                      <div className="hstack min-w-0 flex-1 gap-1.5">
                        <input type="time" value={d.entrada} onChange={(e) => setDia(sc, dow, { entrada: e.target.value })} className="min-w-0 flex-1 rounded-card border border-line bg-surface px-2 py-1.5 text-sm outline-none" />
                        <span className="text-muted-2">–</span>
                        <input type="time" value={d.saida} onChange={(e) => setDia(sc, dow, { saida: e.target.value })} className="min-w-0 flex-1 rounded-card border border-line bg-surface px-2 py-1.5 text-sm outline-none" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={salvar} disabled={salvando} className="btn-primary mt-5 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar padrão
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-2">
            Repete toda semana a partir de {ddmm(efetivo)}, até você mudar.
          </p>
        </>
      )}
    </Folha>
  )
}

export { Escala }
export default Escala

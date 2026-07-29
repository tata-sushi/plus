import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import { Loader2, ChevronLeft, ChevronRight, CalendarClock, Check, X, Trash2, Copy, Coffee } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

// ── Escala de trabalho (teste — liberado pelo painel de admin) ────────────────
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const PRESETS = ['08:00-16:00', '10:00-18:00', '11:00-15:00', '14:00-22:00', '16:00-00:00', '18:00-00:00']

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
  const [aba, setAba] = useState('minha') // 'minha' | 'montar'
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

      <div className="px-5 pt-1">
        <div className="hstack rounded-pill border border-line bg-surface p-0.5 text-xs font-semibold">
          <button onClick={() => setAba('minha')} className={cn('flex-1 rounded-pill py-1.5 tap', aba === 'minha' ? 'bg-accent-soft text-accent' : 'text-muted')}>
            Minha escala
          </button>
          <button onClick={() => setAba('montar')} className={cn('flex-1 rounded-pill py-1.5 tap', aba === 'montar' ? 'bg-accent-soft text-accent' : 'text-muted')}>
            Montar escala
          </button>
        </div>
      </div>

      <div className="mt-3 hstack justify-between px-5">
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

      {aba === 'minha' ? <MinhaEscala inicio={inicio} dias={dias} /> : <Montar inicio={inicio} dias={dias} />}
    </>
  )
}

// ── Minha escala (usuário) ────────────────────────────────────────────────────
function MinhaEscala({ inicio, dias }) {
  const [semana, setSemana] = useState(null)
  useEffect(() => {
    let a = true
    call('escala_minha_semana', { p_inicio: inicio })
      .then((d) => a && setSemana(Array.isArray(d) ? d : []))
      .catch(() => a && setSemana([]))
    return () => {
      a = false
    }
  }, [inicio])

  return (
    <div className="px-5 pt-4 pb-24">
      {semana == null ? (
        <div className="grid place-items-center py-16 text-muted">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {semana.map((dia, i) => {
            const hoje = dia.data === hojeISO()
            return (
              <div key={dia.data || i} className={cn('hstack gap-3 rounded-card border px-4 py-3', hoje ? 'border-accent bg-accent-soft/40' : 'border-line')}>
                <div className="w-12 shrink-0">
                  <div className={cn('text-xs font-bold uppercase', hoje ? 'text-accent' : 'text-muted')}>{DIAS[i]}</div>
                  <div className="text-[11px] text-muted-2">{ddmm(dia.data)}</div>
                </div>
                <div className="flex-1">
                  {dia.folga ? (
                    <span className="hstack gap-1.5 text-sm font-semibold text-muted">
                      <Coffee size={14} /> Folga
                    </span>
                  ) : dia.definido ? (
                    <span className="text-sm font-bold">
                      {hm(dia.entrada)} <span className="text-muted-2">–</span> {hm(dia.saida)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-2">—</span>
                  )}
                </div>
                {hoje && <span className="rounded-pill bg-accent px-2 py-0.5 text-[10px] font-bold text-black">Hoje</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Montar escala (líder) ─────────────────────────────────────────────────────
function Montar({ inicio, dias }) {
  const [unidades, setUnidades] = useState(null)
  const [unidade, setUnidade] = useState('')
  const [equipe, setEquipe] = useState(null)
  const [editar, setEditar] = useState(null) // { matricula, nome, data, dia }
  const [copiando, setCopiando] = useState(false)

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

  async function copiarAnterior() {
    if (!window.confirm('Copiar a escala da semana anterior para esta?')) return
    const dt = new Date(inicio + 'T00:00:00')
    dt.setDate(dt.getDate() - 7)
    setCopiando(true)
    try {
      await call('escala_copiar_semana', { p_unidade: unidade, p_origem: isoLocal(dt), p_destino: inicio })
      carregar()
    } catch (e) {
      avisar(e)
    } finally {
      setCopiando(false)
    }
  }

  return (
    <div className="pt-3 pb-24">
      {/* seletor de unidade + copiar */}
      <div className="hstack gap-2 px-5">
        {unidades == null ? (
          <div className="h-9 flex-1 animate-pulse rounded-card bg-fill" />
        ) : (
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2 text-sm font-semibold outline-none">
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
        <button onClick={copiarAnterior} disabled={copiando || !unidade} className="hstack shrink-0 gap-1.5 rounded-card border border-line px-3 py-2 text-xs font-semibold text-muted tap disabled:opacity-40">
          {copiando ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Copiar semana ant.
        </button>
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
                  <td className="sticky left-0 z-10 bg-bg pr-2">
                    <div className="hstack w-[104px] gap-2">
                      <Avatar name={p.nome} src={p.avatar} size={26} />
                      <span className="min-w-0 truncate text-xs font-semibold">{(p.nome || '').split(' ')[0]}</span>
                    </div>
                  </td>
                  {(p.dias || []).map((dia) => {
                    const hoje = dia.data === hojeISO()
                    return (
                      <td key={dia.data} className="p-0">
                        <button
                          onClick={() => setEditar({ matricula: p.matricula, nome: p.nome, data: dia.data, dia })}
                          className={cn(
                            'grid h-12 w-[58px] place-items-center rounded-lg border text-center tap',
                            dia.folga ? 'border-line bg-fill text-muted' : dia.definido ? 'border-accent/50 bg-accent-soft text-carbon dark:text-accent' : 'border-dashed border-line text-muted-2',
                            hoje && 'ring-1 ring-accent',
                          )}
                        >
                          {dia.folga ? (
                            <Coffee size={14} />
                          ) : dia.definido ? (
                            <span className="leading-tight">
                              <span className="block text-[11px] font-bold">{hm(dia.entrada)}</span>
                              <span className="block text-[10px] text-muted">{hm(dia.saida)}</span>
                            </span>
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

      {editar && (
        <EditarTurno
          alvo={editar}
          onClose={() => setEditar(null)}
          onFeito={() => {
            setEditar(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}

// ── Editor de um turno (líder) ────────────────────────────────────────────────
function EditarTurno({ alvo, onClose, onFeito }) {
  const [entrada, setEntrada] = useState(alvo.dia.folga ? '' : hm(alvo.dia.entrada))
  const [saida, setSaida] = useState(alvo.dia.folga ? '' : hm(alvo.dia.saida))
  const [salvando, setSalvando] = useState(false)

  async function salvar(folga) {
    setSalvando(true)
    try {
      await call('escala_set', {
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
  async function limpar() {
    setSalvando(true)
    try {
      await call('escala_limpar', { p_matricula: alvo.matricula, p_data: alvo.data })
      await onFeito()
    } catch (e) {
      avisar(e)
      setSalvando(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[88vh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-line bg-bg px-5 pb-8 pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-line" />
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>

        <div className="hstack gap-3">
          <Avatar name={alvo.nome} size={34} />
          <div className="min-w-0">
            <div className="truncate font-display text-base font-bold">{(alvo.nome || '').split(' ').slice(0, 2).join(' ')}</div>
            <div className="text-xs text-muted">{ddmm(alvo.data)}</div>
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
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar turno
        </button>

        <div className="mt-2 hstack gap-2">
          <button onClick={() => salvar(true)} disabled={salvando} className="hstack flex-1 justify-center gap-2 rounded-card border border-line py-2.5 text-sm font-semibold text-muted tap disabled:opacity-40">
            <Coffee size={15} /> Marcar folga
          </button>
          {alvo.dia.definido && (
            <button onClick={limpar} disabled={salvando} className="hstack flex-1 justify-center gap-2 rounded-card border border-line py-2.5 text-sm font-semibold text-danger tap disabled:opacity-40">
              <Trash2 size={15} /> Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export { Escala }
export default Escala

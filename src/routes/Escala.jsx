import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import { Loader2, ChevronLeft, ChevronRight, CalendarClock, Check, X, Sun, CircleCheck, Coins, MessageCircle, Palmtree, CircleDot } from 'lucide-react'
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

// Férias: o tema não tem token azul, então uso um azul suave inline que fica
// legível no claro e no escuro (distinto de Trabalho/accent e Folga/fill).
const FERIAS_CELL = { backgroundColor: 'rgb(59 130 246 / 0.16)', borderColor: 'rgb(59 130 246 / 0.45)' }
const FERIAS_TXT = '#3b82f6'

// Ausências (dp_rh.ausencias): 13 tipos → 7 grupos, cada um com sua cor.
function tintCell(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.16)`, borderColor: `rgba(${r}, ${g}, ${b}, 0.5)` }
}
const AUS = {
  falta: { label: 'Falta', cor: '#ef4444' },
  justif: { label: 'Atestado / licença', cor: '#f59e0b' },
  suspensao: { label: 'Suspensão', cor: '#64748b' },
  banco: { label: 'Banco de horas', cor: '#0ea5e9' },
  folga_esp: { label: 'Folga especial', cor: '#14b8a6' },
  ponto: { label: 'Esqueceu o ponto', cor: '#94a3b8' },
}
for (const a of Object.values(AUS)) a.cell = tintCell(a.cor)
// 'Folga' normal fica de fora (não é ausência). Os demais tipos entram.
const TIPO_GRUPO = {
  Falta: 'falta',
  Atestado: 'justif',
  'Atestado Médico': 'justif',
  'Afastamento INSS': 'justif',
  'Licença Maternidade': 'justif',
  'Licença Paternidade': 'justif',
  Suspensão: 'suspensao',
  'Suspensão de Contrato': 'suspensao',
  'Banco de Horas': 'banco',
  'Folga Aniversário': 'folga_esp',
  'Folga Feriado': 'folga_esp',
  'Trabalhou, mas esqueceu de registrar o ponto': 'ponto',
}
const grupoAus = (tipo) => AUS[TIPO_GRUPO[tipo]] || null

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
  // Montar escala saiu do app (é feito na governança). O app é só a consulta.
  return (
    <>
      <Header title="Agenda" />
      <Voltar />
      <Calendario />
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
  const [eventos, setEventos] = useState(null) // { 'YYYY-MM-DD': [ { tipo, hora, titulo, status } ] }
  const [ferias, setFerias] = useState(null) // { 'YYYY-MM-DD': { aprovado } }
  const [ausencias, setAusencias] = useState(null) // { 'YYYY-MM-DD': { tipo } }
  const [det, setDet] = useState(null) // { info, dia, evts } — detalhe do dia
  const [checando, setChecando] = useState(false)

  // Valida a presença de HOJE (+5) de dentro do modal — mesma ação do card da Home.
  async function validarDetalhe() {
    if (!det) return
    setChecando(true)
    try {
      await call('escala_check')
      const iso = isoLocal(det.dia)
      setDet((c) => (c ? { ...c, info: { ...c.info, validado: true } } : c))
      setMapa((m) => (m ? { ...m, [iso]: { ...(m[iso] || {}), validado: true } } : m))
    } catch (e) {
      avisar(e)
    } finally {
      setChecando(false)
    }
  }
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
    setEventos(null)
    setFerias(null)
    setAusencias(null)
    call('escala_meu_periodo', { p_inicio: grid.startISO, p_fim: grid.endISO })
      .then((d) => a && setMapa(d && typeof d === 'object' ? d : {}))
      .catch(() => a && setMapa({}))
    call('agenda_meus_eventos', { p_inicio: grid.startISO, p_fim: grid.endISO })
      .then((d) => a && setEventos(d && typeof d === 'object' ? d : {}))
      .catch(() => a && setEventos({}))
    call('escala_ferias_periodo', { p_inicio: grid.startISO, p_fim: grid.endISO })
      .then((d) => a && setFerias(d && typeof d === 'object' ? d : {}))
      .catch(() => a && setFerias({}))
    call('escala_ausencias_periodo', { p_inicio: grid.startISO, p_fim: grid.endISO })
      .then((d) => a && setAusencias(d && typeof d === 'object' ? d : {}))
      .catch(() => a && setAusencias({}))
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
          const evts = eventos?.[iso]
          const fer = noMes ? ferias?.[iso] : null
          const ehFerias = !!fer
          const ausRaw = !ehFerias && noMes ? ausencias?.[iso] : null
          const gAus = ausRaw ? grupoAus(ausRaw.tipo) : null
          const temEvt = noMes && Array.isArray(evts) && evts.length > 0
          const isHoje = iso === hoje
          const folga = !ehFerias && !gAus && !!info?.folga
          const trab = !ehFerias && !gAus && !!info && !info.folga
          const pares = paresDe(info)
          const clicavel = noMes && (!!info || temEvt || ehFerias || !!gAus)
          const tint = ehFerias ? FERIAS_CELL : gAus ? gAus.cell : null
          const tintTxt = ehFerias ? FERIAS_TXT : gAus ? gAus.cor : null
          return (
            <button
              key={iso}
              type="button"
              onClick={clicavel ? () => setDet({ info, dia: d, evts, fer, aus: gAus ? { ...gAus, tipo: ausRaw.tipo } : null }) : undefined}
              disabled={!clicavel}
              style={tint && !isHoje ? tint : undefined}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px]',
                clicavel && 'tap',
                !noMes
                  ? 'border-transparent text-muted-2/40'
                  : isHoje
                    ? 'border-accent ring-1 ring-accent'
                    : tint
                      ? ''
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
              {temEvt && <span className="absolute bottom-1 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full bg-accent" />}
              <span
                className={cn('font-bold', isHoje ? 'text-accent' : trab ? 'text-carbon dark:text-accent' : '')}
                style={tintTxt && !isHoje ? { color: tintTxt } : undefined}
              >
                {d.getDate()}
              </span>
              {noMes && ehFerias ? (
                <Palmtree size={9} style={{ color: FERIAS_TXT }} />
              ) : noMes && gAus ? (
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: gAus.cor }} />
              ) : (
                <>
                  {noMes && folga && <Sun size={9} className="text-muted-2" />}
                  {noMes && trab && pares.length > 0 && (
                    <span className="text-[8px] font-semibold text-muted">{pares[0][0]}</span>
                  )}
                </>
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

      <div className="mt-6 flex flex-col items-start gap-5 text-[11px] text-muted">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <span className="hstack gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-accent/30 bg-accent-soft" /> Trabalho
          </span>
          <span className="hstack gap-1.5">
            <span className="grid h-3.5 w-3.5 place-items-center rounded border border-line bg-fill">
              <Sun size={8} className="text-muted-2" />
            </span>
            Folga
          </span>
          <span className="hstack gap-1.5">
            <span className="grid h-3.5 w-3.5 place-items-center rounded border" style={FERIAS_CELL}>
              <Palmtree size={8} style={{ color: FERIAS_TXT }} />
            </span>
            Férias
          </span>
          <span className="hstack gap-1.5">
            <Check size={13} strokeWidth={3} className="text-accent" /> Validou
          </span>
          <span className="hstack gap-1.5">
            <X size={13} strokeWidth={3} className="text-muted-2/70" /> Não pontuou
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.values(AUS).map((a) => (
            <span key={a.label} className="hstack gap-1.5">
              <span className="h-3.5 w-3.5 rounded border" style={a.cell} />
              {a.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <span className="hstack gap-1.5">
            <MessageCircle size={13} className="text-accent" /> Conversa com o RH
          </span>
        </div>
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
          <div className="mt-4 flex flex-col gap-3">
            {det.fer && (
              <div className="hstack items-center gap-2 rounded-card border px-4 py-3 text-sm font-semibold" style={{ ...FERIAS_CELL, color: FERIAS_TXT }}>
                <Palmtree size={16} /> Férias
              </div>
            )}
            {det.aus && (
              <div className="hstack items-center gap-2 rounded-card border px-4 py-3 text-sm font-semibold" style={{ ...det.aus.cell, color: det.aus.cor }}>
                <CircleDot size={16} /> {det.aus.tipo}
              </div>
            )}
            {det.info && !det.fer && !det.aus &&
              (det.info.folga ? (
                <div className="hstack gap-2 rounded-card border border-line bg-fill px-4 py-3 text-sm font-semibold text-muted">
                  <Sun size={16} /> {det.info.tipo_folga || 'Folga'}
                </div>
              ) : paresDe(det.info).length ? (
                <div className="flex flex-col gap-2">
                  {paresDe(det.info).map((p, i) => (
                    <div key={i} className="hstack items-center justify-between rounded-card border border-line px-4 py-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                        {paresDe(det.info).length > 1 ? `Turno ${i + 1}` : 'Horário'}
                      </span>
                      <span className="text-sm font-bold">
                        {p[0]} <span className="text-muted-2">–</span> {p[1]}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-card border border-line px-4 py-3 text-sm font-bold">
                  Liderança <span className="font-normal text-muted-2">· Sem controle de ponto</span>
                </div>
              ))}
            {det.evts?.map((ev, i) => (
              <div key={`ev${i}`} className="rounded-card border border-accent/30 bg-accent-soft px-4 py-3">
                <div className="hstack items-center justify-between">
                  <span className="hstack gap-2 text-sm font-semibold text-carbon dark:text-accent">
                    <MessageCircle size={16} /> Conversa com o RH
                  </span>
                  <span className="text-sm font-bold">{hm(ev.hora) || 'a combinar'}</span>
                </div>
                {ev.titulo && <div className="mt-0.5 text-xs text-muted">{ev.titulo}</div>}
              </div>
            ))}
          </div>
          {isoLocal(det.dia) === hoje && det.info && !det.info.folga && !det.fer && !det.aus && (
            det.info.validado ? (
              <div className="mt-3 hstack justify-center gap-2 rounded-card border border-accent/40 bg-accent-soft px-4 py-3 text-sm font-semibold text-carbon dark:text-accent">
                <CircleCheck size={18} /> Presença confirmada
              </div>
            ) : (
              <button
                onClick={validarDetalhe}
                disabled={checando}
                className="btn-primary mt-3 hstack w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"
              >
                {checando ? <Loader2 size={16} className="animate-spin" /> : <CircleCheck size={16} />}
                Validar presença de hoje
                <span className="hstack shrink-0 gap-1 rounded-pill bg-black/15 px-2 py-0.5 text-xs font-bold">
                  <Coins size={12} /> +5
                </span>
              </button>
            )
          )}
        </Folha>
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

export { Escala }
export default Escala

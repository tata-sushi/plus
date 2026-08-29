import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, ChevronLeft, ChevronRight, CalendarClock, Check, X, Sun, CircleCheck, Coins, MessageCircle, Palmtree, CircleDot, Info, ArrowLeft, Clock, Gift, Flag, Sparkles } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { tapHaptic } from '../lib/haptics.js'
import { Avatar } from '../components/Avatar.jsx'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

// ── Agenda/Escala do colaborador (liberada a todo colaborador ativo) ──────────
// Modelo novo (schema dp_rh): cada colaborador tem um PADRÃO recorrente (com
// revezamento e "vale a partir de"), que o backend materializa semana a semana.
// O líder pode fazer um ajuste PONTUAL num dia (override manual) sem mexer no molde.
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// Férias: o tema não tem token azul, então uso um azul suave inline que fica
// legível no claro e no escuro (distinto de Trabalho/accent e Folga/fill).
const FERIAS_CELL = { backgroundColor: 'rgb(59 130 246 / 0.16)', borderColor: 'rgb(59 130 246 / 0.45)' }
const FERIAS_TXT = '#3b82f6'

// Feriado: índigo. Ponto cheio = feriado (nacional/estadual/municipal);
// ponto vazado = data comercial (marketing, não é folga).
const FER_COR = '#6366f1'

// Ausências (dp_rh.ausencias): 13 tipos → 7 grupos, cada um com sua cor.
function tintCell(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.16)`, borderColor: `rgba(${r}, ${g}, ${b}, 0.5)` }
}
const AUS = {
  vermelho: { label: 'Falta / suspensão', cor: '#ef4444', dentro: 'Falta, Suspensão' },
  ambar: { label: 'Atestado / licença', cor: '#f59e0b', dentro: 'Atestado, INSS, licença maternidade/paternidade' },
  // Folga/banco em "branco": cartão neutro do tema (branco no claro, surface no escuro).
  folga: { label: 'Folga / banco de horas', cor: '#64748b', branco: true, dentro: 'Folga da escala, folga feriado/aniversário, banco de horas' },
}
for (const a of Object.values(AUS)) a.cell = a.branco ? null : tintCell(a.cor)
// 'Esqueceu o ponto' fica de fora. Vermelho = falta/suspensão; âmbar =
// atestado/licença; violeta = folga (normal/aniversário/feriado) e banco de horas.
const TIPO_GRUPO = {
  Falta: 'vermelho',
  Suspensão: 'vermelho',
  'Suspensão de Contrato': 'vermelho',
  Atestado: 'ambar',
  'Atestado Médico': 'ambar',
  'Afastamento INSS': 'ambar',
  'Licença Maternidade': 'ambar',
  'Licença Paternidade': 'ambar',
  Folga: 'folga',
  'Folga Aniversário': 'folga',
  'Folga Feriado': 'folga',
  'Banco de Horas': 'folga',
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
// Saldo do banco de horas (decimal) → "12h30". 0 → "0h".
function fmtHoras(v) {
  const n = Number(v) || 0
  const abs = Math.abs(n)
  let h = Math.floor(abs)
  let m = Math.round((abs - h) * 60)
  if (m === 60) { h += 1; m = 0 }
  return `${n < 0 ? '−' : ''}${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
}
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
  const navigate = useNavigate()
  const [legendaAberta, setLegendaAberta] = useState(false)
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
      <Header title="Agenda" />
      {/* Voltar (igual às outras páginas) + legenda ⓘ na mesma linha. O ⓘ é
          pequeno (não aumenta a altura da linha); o padding/margem negativa dá
          área de toque sem empurrar o Voltar pra baixo. */}
      <div className="flex items-center justify-between px-5 pt-2">
        <button onClick={() => { tapHaptic(); navigate(-1) }} className="hstack gap-1 text-sm font-medium text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
        <button onClick={() => setLegendaAberta(true)} aria-label="Legenda" title="Legenda" className="-m-2 grid place-items-center p-2 text-muted tap">
          <Info size={18} />
        </button>
      </div>
      <Calendario />
      {/* Aviso no rodapé — empurrado pro fundo, logo acima da barra de navegação. */}
      <p className="mt-auto px-6 pb-2 pt-8 text-center text-[10px] leading-relaxed text-muted-2">
        Informações de fácil visualização e consulta rápida. Não substituem documentos oficiais, como o cartão de ponto.
      </p>
      {legendaAberta && <LegendaSheet onClose={() => setLegendaAberta(false)} />}
    </div>
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
  const [aniversarios, setAniversarios] = useState(null) // { 'YYYY-MM-DD': [ { nome, unidade, avatar_url, eu } ] }
  const [feriados, setFeriados] = useState(null) // { 'YYYY-MM-DD': [ { nome, grupo, tipo } ] }
  const [eventosGerais, setEventosGerais] = useState(null) // { 'YYYY-MM-DD': [ { titulo, descricao } ] } — eventos do RH marcados p/ o app
  const [det, setDet] = useState(null) // { info, dia, evts } — detalhe do dia
  const [folga, setFolga] = useState(null) // status da Folga Aniversário: null=off, undefined=carregando, obj=dados
  const [folgaAberta, setFolgaAberta] = useState(null) // ISO do aniversário quando a folha está aberta
  const [checando, setChecando] = useState(false)
  const [banco, setBanco] = useState(null) // { data, saldo }
  const [chk, setChk] = useState(null) // { data, controla, tem_hoje, confirmado }

  // Banco de horas e status de presença de HOJE — independem do mês exibido.
  useEffect(() => {
    let a = true
    call('escala_banco_horas').then((d) => a && setBanco(d && typeof d === 'object' ? d : null)).catch(() => {})
    call('escala_check_status').then((d) => a && setChk(d && typeof d === 'object' ? d : null)).catch(() => {})
    return () => { a = false }
  }, [])

  // Confirma a presença de HOJE (+5). Reflete no card e no dia de hoje do calendário.
  async function validarHoje() {
    if (!chk?.tem_hoje || chk?.confirmado || checando) return
    setChecando(true)
    try {
      const r = await call('escala_check')
      if (r && r.motivo === 'ausencia') {
        // Ausência entrou no dia: não pontua.
        setChk((c) => ({ ...(c || {}), ausencia: true }))
      } else {
        setChk((c) => ({ ...(c || {}), confirmado: true }))
        const iso = hojeISO()
        setMapa((m) => (m ? { ...m, [iso]: { ...(m[iso] || {}), validado: true } } : m))
      }
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
    setAniversarios(null)
    setFeriados(null)
    setEventosGerais(null)
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
    call('escala_aniversarios_periodo', { p_inicio: grid.startISO, p_fim: grid.endISO })
      .then((d) => a && setAniversarios(d && typeof d === 'object' ? d : {}))
      .catch(() => a && setAniversarios({}))
    call('escala_feriados_periodo', { p_inicio: grid.startISO, p_fim: grid.endISO })
      .then((d) => a && setFeriados(d && typeof d === 'object' ? d : {}))
      .catch(() => a && setFeriados({}))
    call('agenda_eventos_app_periodo', { p_inicio: grid.startISO, p_fim: grid.endISO })
      .then((d) => a && setEventosGerais(d && typeof d === 'object' ? d : {}))
      .catch(() => a && setEventosGerais({}))
    return () => {
      a = false
    }
  }, [grid.startISO, grid.endISO])

  // Meu aniversário no mês exibido (a RPC só traz o próprio). null se não for este mês.
  const meuAnivISO = useMemo(() => {
    if (!aniversarios) return null
    for (const iso of Object.keys(aniversarios)) {
      const [y, m] = iso.split('-').map(Number)
      if (m - 1 === mes && y === ano && Array.isArray(aniversarios[iso]) && aniversarios[iso].length) return iso
    }
    return null
  }, [aniversarios, mes, ano])
  const meuAnivPessoa = meuAnivISO ? aniversarios[meuAnivISO][0] : null

  // Folga Aniversário — abre pela folha (item abaixo do banco). Calcula a elegibilidade.
  useEffect(() => {
    if (!folgaAberta) {
      setFolga(null)
      return
    }
    let a = true
    setFolga(undefined) // carregando
    call('escala_folga_aniversario', { p_data: folgaAberta.iso })
      .then((d) => a && setFolga(d && typeof d === 'object' && d.eh_meu ? d : null))
      .catch(() => a && setFolga(null))
    return () => {
      a = false
    }
  }, [folgaAberta])

  const hoje = hojeISO()
  const horarioHoje = chk ? paresDe(chk).map((p) => `${p[0]}–${p[1]}`).join(' · ') : ''
  return (
    <div className="px-5 pt-4">
      <div className="hstack justify-between">
        <button onClick={() => setMesOffset((o) => o - 1)} aria-label="Mês anterior" className="grid h-8 w-8 place-items-center rounded-full text-muted tap">
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
        <button onClick={() => setMesOffset((o) => o + 1)} aria-label="Próximo mês" className="grid h-8 w-8 place-items-center rounded-full text-muted tap">
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
          const anivs = noMes ? aniversarios?.[iso] : null
          const temAniv = Array.isArray(anivs) && anivs.length > 0
          const feris = noMes ? feriados?.[iso] : null
          const temFeriado = Array.isArray(feris) && feris.length > 0
          const feriadoReal = temFeriado && feris.some((f) => f.grupo === 'feriado')
          const evGer = noMes ? eventosGerais?.[iso] : null
          const temEvtGeral = Array.isArray(evGer) && evGer.length > 0
          const isHoje = iso === hoje
          const folga = !ehFerias && !gAus && !!info?.folga
          const trab = !ehFerias && !gAus && !!info && !info.folga
          const pares = paresDe(info)
          const clicavel = noMes && (!!info || temEvt || ehFerias || !!gAus || temFeriado || temEvtGeral)
          const branco = !!gAus?.branco
          const tint = ehFerias ? FERIAS_CELL : gAus && !branco ? gAus.cell : null
          const tintTxt = ehFerias ? FERIAS_TXT : gAus && !branco ? gAus.cor : null
          return (
            <button
              key={iso}
              type="button"
              onClick={clicavel ? () => setDet({ info, dia: d, evts, fer, aus: gAus ? { ...gAus, tipo: ausRaw.tipo } : null, feriado: temFeriado ? feris : null, eventoGeral: temEvtGeral ? evGer : null }) : undefined}
              disabled={!clicavel}
              style={tint && !isHoje ? tint : undefined}
              className={cn(
                'relative flex aspect-square flex-col items-center gap-0.5 rounded-lg border px-0.5 pb-0.5 pt-1 text-[11px]',
                clicavel && 'tap',
                !noMes
                  ? 'border-transparent text-muted-2/40'
                  : isHoje
                    ? 'border-accent ring-1 ring-accent'
                    : tint
                      ? ''
                      : branco
                        ? 'border-line bg-surface'
                        : trab
                          ? 'border-accent/30 bg-accent-soft'
                          : folga
                            ? 'border-line bg-surface'
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
              <span
                className={cn('font-bold', isHoje ? 'text-accent' : trab ? 'text-carbon dark:text-accent' : '')}
                style={tintTxt && !isHoje ? { color: tintTxt } : undefined}
              >
                {d.getDate()}
              </span>
              {noMes && ehFerias ? (
                <Palmtree size={9} style={{ color: FERIAS_TXT }} />
              ) : noMes && gAus ? (
                gAus.branco ? <Sun size={9} className="text-muted-2" /> : null
              ) : (
                <>
                  {noMes && folga && <Sun size={9} className="text-muted-2" />}
                  {noMes && trab && pares.length > 0 && (
                    <span className="text-[8px] font-semibold text-muted">{pares[0][0]}</span>
                  )}
                </>
              )}
              {/* Observações do dia como pílulas no rodapé (estilo agenda):
                  feriado (índigo), data comercial (índigo claro), aniversário
                  (rosa), conversa com o RH (accent). Nome completo no detalhe. */}
              {noMes && ((gAus && !gAus.branco) || temFeriado || temAniv || temEvt || temEvtGeral) && (
                <div className="mt-auto flex w-full flex-col items-center gap-[2px] pt-0.5">
                  {gAus && !gAus.branco && (
                    <span className="h-[3px] w-full max-w-[22px] rounded-full" style={{ backgroundColor: gAus.cor }} />
                  )}
                  {temFeriado && feris.some((f) => f.grupo === 'feriado') && (
                    <span className="h-[3px] w-full max-w-[22px] rounded-full" style={{ backgroundColor: FER_COR }} />
                  )}
                  {temFeriado && feris.some((f) => f.grupo === 'comercial') && (
                    <span className="h-[3px] w-full max-w-[22px] rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.4)' }} />
                  )}
                  {temAniv && <span className="h-[3px] w-full max-w-[22px] rounded-full bg-accent" />}
                  {temEvt && <span className="h-[3px] w-full max-w-[22px] rounded-full bg-accent" />}
                  {temEvtGeral && <span className="h-[3px] w-full max-w-[22px] rounded-full bg-amber-500" />}
                </div>
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

      {/* Confirmação de presença de hoje (em cima) — validar por um toggle
          liga/desliga. Uma vez confirmado fica ligado e travado (não dá pra
          desfazer: a validação credita +5). */}
      <div className="mt-5 hstack items-center justify-between rounded-card border border-line bg-surface px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Confirmação de presença</div>
          <div className="text-[11px] text-muted">
            {chk == null
              ? '…'
              : !chk.tem_hoje
                ? 'Hoje não é dia de ponto'
                : chk.ausencia
                  ? 'Não pontua — há ausência no dia'
                  : chk.confirmado
                    ? horarioHoje
                      ? `Presença confirmada • ${horarioHoje}`
                      : 'Presença confirmada'
                    : horarioHoje
                      ? `Hoje • ${horarioHoje}`
                      : 'Hoje'}
          </div>
        </div>
        {chk?.tem_hoje &&
          (chk.ausencia ? (
            <span className="shrink-0 rounded-pill bg-fill px-3 py-1 text-[11px] font-semibold text-muted-2">
              Não pontuado
            </span>
          ) : (
            <button
              onClick={validarHoje}
              disabled={checando || chk.confirmado}
              role="switch"
              aria-checked={!!chk.confirmado}
              aria-label="Confirmar presença de hoje (+5)"
              title={chk.confirmado ? 'Presença confirmada' : 'Confirmar presença (+5)'}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors tap',
                chk.confirmado ? 'bg-accent' : 'bg-line',
                checando && 'opacity-70',
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 place-items-center rounded-full bg-white shadow transition-transform',
                  chk.confirmado ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
              >
                {checando ? (
                  <Loader2 size={12} className="animate-spin text-muted" />
                ) : chk.confirmado ? (
                  <Check size={12} strokeWidth={3} className="text-accent" />
                ) : null}
              </span>
            </button>
          ))}
      </div>

      {/* Saldo do banco de horas — texto direto na página (sem card) */}
      <div className="mt-4 hstack items-center justify-between px-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Saldo do banco de horas</div>
          {banco?.data && <div className="text-[11px] text-muted">até {banco.data}</div>}
        </div>
        <div className="shrink-0 text-lg font-bold">{banco == null ? '—' : fmtHoras(banco.saldo)}</div>
      </div>

      {/* Folga Aniversário — só no mês do aniversário; some ao trocar de mês. */}
      {meuAnivISO && (
        <button
          onClick={() => setFolgaAberta({ iso: meuAnivISO, pessoa: meuAnivPessoa })}
          className="mt-4 flex w-full items-center gap-3 px-4 tap"
        >
          <div className="min-w-0 flex-1 text-left">
            <div className="text-sm font-semibold">Folga Aniversário</div>
            <div className="text-[11px] text-muted">Seu aniversário • {ddmm(meuAnivISO)} · ver elegibilidade</div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted-2" />
        </button>
      )}

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
            {det.feriado?.map((f, i) => (
              <div
                key={`fe${i}`}
                className={cn(
                  'hstack items-center gap-2 rounded-card border px-4 py-3 text-sm font-semibold',
                  f.grupo !== 'feriado' && 'border-line text-muted',
                )}
                style={f.grupo === 'feriado' ? { borderColor: FER_COR, backgroundColor: 'rgba(99,102,241,0.10)', color: FER_COR } : undefined}
              >
                {f.grupo === 'feriado' ? <Flag size={16} className="shrink-0" /> : <Sparkles size={16} className="shrink-0" />}
                <div className="min-w-0">
                  <div className="leading-tight">{f.nome}</div>
                  {f.tipo && <div className={cn('text-[11px] font-normal', f.grupo === 'feriado' ? 'opacity-80' : 'text-muted-2')}>{f.tipo}</div>}
                </div>
              </div>
            ))}
            {det.eventoGeral?.map((ev, i) => {
              const hora = ev.hora_inicio
                ? ev.hora_fim
                  ? `${ev.hora_inicio}–${ev.hora_fim}`
                  : ev.hora_inicio
                : null
              return (
                <div
                  key={`ev${i}`}
                  className="hstack items-center gap-2 rounded-card border px-4 py-3 text-sm font-semibold"
                  style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                >
                  <Sparkles size={16} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="leading-tight">{ev.titulo}</div>
                    {ev.descricao && <div className="mt-0.5 text-[11px] font-normal opacity-80">{ev.descricao}</div>}
                    {(hora || ev.local) && (
                      <div className="mt-0.5 hstack gap-2 text-[11px] font-normal opacity-90">
                        {hora && (
                          <span className="hstack gap-1">
                            <Clock size={11} /> {hora}
                          </span>
                        )}
                        {ev.local && <span>· {ev.local}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {det.fer && (
              <div className="hstack items-center gap-2 rounded-card border px-4 py-3 text-sm font-semibold" style={{ ...FERIAS_CELL, color: FERIAS_TXT }}>
                <Palmtree size={16} /> Férias
              </div>
            )}
            {det.aus && (
              <div
                className={cn('hstack items-center gap-2 rounded-card border px-4 py-3 text-sm font-semibold', det.aus.branco && 'border-line bg-surface')}
                style={det.aus.branco ? { color: det.aus.cor } : { ...det.aus.cell, color: det.aus.cor }}
              >
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
        </Folha>
      )}

      {/* Folha da Folga Aniversário — aberta pelo item abaixo do banco. */}
      {folgaAberta && (
        <Folha onClose={() => setFolgaAberta(null)}>
          <div className="hstack gap-3">
            <Avatar name={folgaAberta.pessoa?.nome} src={folgaAberta.pessoa?.avatar_url} size={44} />
            <div className="min-w-0">
              <div className="font-display text-base font-bold">Seu aniversário 🎉</div>
              <div className="text-xs text-muted">
                {ddmm(folgaAberta.iso)}
                {folgaAberta.pessoa?.nome ? ` · ${folgaAberta.pessoa.nome}` : ''}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <FolgaAniversario status={folga} />
          </div>
        </Folha>
      )}
    </div>
  )
}

// Folga Aniversário (só aparece no aniversário do próprio usuário). Mostra os
// critérios da política calculados no banco; o "domingo do mês" fica com o líder.
function FolgaAniversario({ status }) {
  if (status === undefined) {
    return (
      <div className="hstack items-center gap-2 rounded-card border border-line px-4 py-3 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" /> Verificando a folga de aniversário…
      </div>
    )
  }
  if (!status) return null
  const Crit = ({ ok, children }) => (
    <div className="hstack items-start gap-2 text-[13px] leading-snug">
      {ok ? (
        <Check size={15} strokeWidth={3} className="mt-px shrink-0 text-accent" />
      ) : (
        <X size={15} strokeWidth={3} className="mt-px shrink-0" style={{ color: '#ef4444' }} />
      )}
      <span className={ok ? '' : 'text-muted'}>{children}</span>
    </div>
  )
  return (
    <div className="rounded-card border border-accent px-4 py-3">
      <div className="hstack items-center gap-2 text-accent">
        <Gift size={16} />
        <span className="text-sm font-bold">Folga Aniversário</span>
      </div>
      <p className="mt-1 text-[12px] text-muted">Caixa de bombons + cartão e um dia de folga pra comemorar.</p>
      <div className="mt-3 flex flex-col gap-1.5">
        <Crit ok={status.experiencia_ok}>
          Passou da experiência (60 dias) <span className="text-muted-2">· desde {status.admissao}</span>
        </Crit>
        <Crit ok={status.banco_ok}>
          Banco de horas não negativo <span className="text-muted-2">· saldo {fmtHoras(status.banco_saldo)}</span>
        </Crit>
        <Crit ok={status.faltas_ok}>
          Sem faltas injustificadas nos últimos 30 dias
          {status.faltas_qtd > 0 && <span className="text-muted-2"> · {status.faltas_qtd}</span>}
        </Crit>
        <Crit ok={status.sancoes_ok}>
          Sem advertências/suspensões nos 30 dias anteriores
          {status.sancoes_qtd > 0 && <span className="text-muted-2"> · {status.sancoes_qtd}</span>}
        </Crit>
      </div>
      <div
        className={cn('mt-3 rounded-lg px-3 py-2 text-[13px] font-semibold', status.elegivel && 'bg-accent-soft text-accent')}
        style={status.elegivel ? undefined : { backgroundColor: 'rgba(239,68,68,0.10)', color: '#ef4444' }}
      >
        {status.elegivel ? 'Elegível pela regra 🎉' : 'Ainda não elegível pela regra'}
        {status.previa && <span className="font-normal"> · prévia, ainda pode mudar até a data</span>}
      </div>
      {status.domingo && (
        <p className="mt-2 text-[11px] text-muted">
          Cai no domingo: a folga é compensada com o domingo do mês (a critério do líder).
        </p>
      )}
    </div>
  )
}

// Legenda completa (abre pelo ⓘ no topo). 3 seções: Ponto, Situações, Agenda.
function LegendaSheet({ onClose }) {
  const Titulo = ({ children }) => (
    <div className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted-2 first:mt-4">{children}</div>
  )
  const Item = ({ swatch, label, dentro }) => (
    <div className="hstack items-center gap-2.5">
      <span className="grid h-4 w-4 shrink-0 place-items-center">{swatch}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">{label}</div>
        {dentro && <div className="text-[11px] text-muted">{dentro}</div>}
      </div>
    </div>
  )
  return (
    <Folha onClose={onClose}>
      <div className="font-display text-lg font-bold">Legenda</div>

      <Titulo>Ponto</Titulo>
      <div className="mt-2 flex flex-col gap-2.5">
        <Item swatch={<Check size={16} strokeWidth={3} className="text-accent" />} label="Pontuou" dentro="Validou a presença do dia (+5)" />
        <Item swatch={<X size={16} strokeWidth={3} className="text-muted-2/70" />} label="Não pontuou" dentro="Dia de trabalho sem validação" />
      </div>

      <Titulo>Situações</Titulo>
      <div className="mt-2 flex flex-col gap-2.5">
        <Item swatch={<span className="h-4 w-4 rounded border border-accent/30 bg-accent-soft" />} label="Trabalho" dentro="Dias trabalhados" />
        <Item swatch={<span className="grid h-4 w-4 place-items-center rounded border" style={FERIAS_CELL}><Palmtree size={10} style={{ color: FERIAS_TXT }} /></span>} label="Férias" dentro="Férias aprovadas" />
        {Object.values(AUS).map((a) => (
          <Item
            key={a.label}
            swatch={
              a.branco ? (
                <span className="grid h-4 w-4 place-items-center rounded border border-line bg-surface">
                  <Sun size={10} className="text-muted-2" />
                </span>
              ) : (
                <span className="h-1 w-4 rounded-full" style={{ backgroundColor: a.cor }} />
              )
            }
            label={a.label}
            dentro={a.dentro}
          />
        ))}
      </div>

      <Titulo>Agenda</Titulo>
      <div className="mt-2 flex flex-col gap-2.5">
        <Item swatch={<span className="h-1 w-4 rounded-full bg-accent" />} label="Conversa com o RH" dentro="Reunião/alinhamento marcado" />
        <Item swatch={<span className="h-1 w-4 rounded-full bg-accent" />} label="Seu aniversário" dentro="Marca o seu dia" />
        <Item swatch={<span className="h-1 w-4 rounded-full" style={{ backgroundColor: FER_COR }} />} label="Feriado" dentro="Nacional, estadual ou municipal" />
        <Item swatch={<span className="h-1 w-4 rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.4)' }} />} label="Data comercial" dentro="Ação de marketing (não é folga)" />
        <Item swatch={<span className="h-1 w-4 rounded-full bg-amber-500" />} label="Evento" dentro="Evento do TATÁ (não é folga)" />
      </div>
    </Folha>
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

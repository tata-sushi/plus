import { useState } from 'react'
import { Loader2, CheckCircle2, Clock, XCircle, MessageCircle, CalendarClock, CalendarPlus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// Horários prontos pra visita ao RH (atende seg. a sex.).
const HORARIOS = ['10:00', '11:00', '14:00', '15:00', '16:00']
const DIAS_ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Hoje em YYYY-MM-DD (local).
function hojeStr() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Hora atual como "HH:MM".
function horaAtual() {
  const a = new Date()
  return `${String(a.getHours()).padStart(2, '0')}:${String(a.getMinutes()).padStart(2, '0')}`
}

// Horário já passou, quando a data escolhida é hoje?
function passouHoje(str, hora) {
  return str === hojeStr() && hora <= horaAtual()
}

// Próximos N dias úteis (seg–sex) prontos pra escolher. Pula hoje se todos
// os horários do dia já tiverem passado.
function proximosDiasUteis(n) {
  const hojeTemVaga = HORARIOS.some((h) => h > horaAtual())
  const dias = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  for (let offset = 0; dias.length < n && offset < 30; offset++, d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // pula fim de semana
    if (offset === 0 && !hojeTemVaga) continue // hoje já sem horário disponível
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : DIAS_ABREV[dow]
    const curta = `${String(d.getDate()).padStart(2, '0')}/${MESES_ABREV[d.getMonth()]}`
    dias.push({ value, label, curta })
  }
  return dias
}

// Desafio de "check-in presencial" com agendamento: o colaborador (1) agenda um bate-papo
// com o RH escolhendo dia e horário, o que cria um card no Kanban do RH pra Thamires; depois
// (2) dá o check de comparecimento, e o RH valida na aba Envios pra liberar os pontos.
// Estados: agendar (sem/reprovado), agendado, pendente, aprovado.
export function CheckinDesafio({ treinoId, envio, concluido, pontos, onEnviado }) {
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [reagendar, setReagendar] = useState(false)
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')

  const status = concluido ? 'aprovado' : envio?.status || null
  const dias = proximosDiasUteis(5)

  function fmtAgendado() {
    if (!envio?.agendado_data) return ''
    const [, m, d] = envio.agendado_data.split('-')
    return envio.agendado_hora ? `${d}/${m} às ${envio.agendado_hora}` : `${d}/${m}`
  }

  async function agendar() {
    if (!data) {
      setErro('Escolha o dia da visita.')
      return
    }
    if (!hora) {
      setErro('Escolha um horário.')
      return
    }
    setErro('')
    setBusy(true)
    const { data: res, error } = await supabase.rpc('agendar_desafio', {
      p_treino: treinoId,
      p_data: data,
      p_hora: hora || null,
    })
    setBusy(false)
    if (error || !res?.ok) {
      setErro('Não foi possível agendar agora. Tente de novo.')
      return
    }
    setReagendar(false)
    onEnviado?.()
  }

  async function confirmar() {
    setErro('')
    setBusy(true)
    const { data: res, error } = await supabase.rpc('checkin_desafio', { p_treino: treinoId })
    setBusy(false)
    if (error || !res?.ok) {
      setErro('Não foi possível confirmar agora. Tente de novo.')
      return
    }
    onEnviado?.()
  }

  if (status === 'aprovado') {
    return (
      <div className="rounded-card border border-accent/30 bg-accent-soft px-4 py-5 text-center">
        <CheckCircle2 className="mx-auto text-accent" size={28} />
        <p className="mt-2 text-sm font-bold text-accent">Conversa validada! +{pontos} pontos</p>
        <p className="mt-0.5 text-xs text-muted">Seus pontos já entraram na carteira. 🎉</p>
      </div>
    )
  }

  if (status === 'pendente') {
    return (
      <div className="rounded-card border border-warn/30 bg-warn/10 px-4 py-5 text-center">
        <Clock className="mx-auto text-warn" size={25} />
        <p className="mt-2 text-sm font-bold text-warn">Check enviado! Aguardando o RH</p>
        <p className="mt-0.5 text-xs text-muted">
          Assim que o RH validar a sua conversa, os {pontos} pontos entram.
        </p>
      </div>
    )
  }

  // Agendado → mostra o agendamento + botão de confirmar comparecimento
  if (status === 'agendado' && !reagendar) {
    return (
      <div>
        <div className="rounded-card border border-line bg-surface-2 px-4 py-4">
          <div className="hstack gap-2 text-sm font-semibold">
            <CalendarClock size={18} className="text-accent" /> Bate-papo agendado
          </div>
          <p className="mt-1 text-xs text-muted">
            {fmtAgendado()}. No horário combinado, o RH bate um papo com você para explicar o holerite. Depois, confirme aqui.
          </p>
        </div>
        <div className="mt-3 flex items-stretch gap-2">
          <button
            onClick={confirmar}
            disabled={busy}
            className="btn-primary flex-1 !py-3 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <MessageCircle size={16} /> Confirmar conversa
              </>
            )}
          </button>
          <button
            onClick={() => setReagendar(true)}
            className="btn-ghost shrink-0 !py-3 px-5"
          >
            Reagendar
          </button>
        </div>
        {erro && <p className="mt-2 text-center text-xs font-medium text-danger">{erro}</p>}
      </div>
    )
  }

  // Sem agendamento / reprovado / reagendando → formulário de agendamento
  return (
    <div>
      {status === 'reprovado' && !reagendar && (
        <div className="mb-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3">
          <div className="hstack gap-2 text-sm font-semibold text-danger">
            <XCircle size={17} /> Conversa não validada
          </div>
          {envio?.motivo && <p className="mt-1 text-xs text-muted">{envio.motivo}</p>}
          <p className="mt-1 text-[11px] text-muted-2">Agende um novo bate-papo com o RH.</p>
        </div>
      )}
      <p className="mb-2 text-sm font-semibold">Aproveite e agende um bate-papo com o RH</p>
      <p className="mb-1.5 text-[11px] font-semibold text-muted">Dia</p>
      <div className="flex flex-wrap gap-2">
        {dias.map((dia) => {
          const sel = data === dia.value
          return (
            <button
              key={dia.value}
              type="button"
              onClick={() => {
                setData(dia.value)
                if (passouHoje(dia.value, hora)) setHora('')
                setErro('')
              }}
              className={`tap min-w-[64px] rounded-lg border px-3 py-2 text-center leading-tight ${
                sel ? 'border-accent bg-accent text-black' : 'border-line bg-bg text-text'
              }`}
            >
              <span className="block text-sm font-semibold capitalize">{dia.label}</span>
              <span className="block text-[10px] font-medium opacity-70">{dia.curta}</span>
            </button>
          )
        })}
      </div>
      <p className="mb-1.5 mt-3 text-[11px] font-semibold text-muted">Horário</p>
      <div className="flex flex-wrap gap-2">
        {HORARIOS.map((h) => {
          const desab = passouHoje(data, h)
          const sel = hora === h
          return (
            <button
              key={h}
              type="button"
              disabled={desab}
              onClick={() => {
                setHora(h)
                setErro('')
              }}
              className={`tap rounded-lg border px-3.5 py-2 text-sm font-semibold ${
                sel ? 'border-accent bg-accent text-black' : 'border-line bg-bg text-text'
              } disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted-2 disabled:line-through`}
            >
              {h}
            </button>
          )
        })}
      </div>
      <button
        onClick={agendar}
        disabled={busy}
        className="btn-primary mt-5 w-full !py-3.5 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <CalendarPlus size={16} /> Agendar visita
          </>
        )}
      </button>
      {reagendar && (
        <button
          onClick={() => setReagendar(false)}
          className="btn-ghost mt-2 w-full !py-2 text-xs text-muted"
        >
          Cancelar
        </button>
      )}
      <p className="mt-2 text-center text-[11px] text-muted-2">
        Depois do bate-papo com o RH, seus pontos do desafio serão liberados automaticamente.
      </p>
      {erro && <p className="mt-2 text-center text-xs font-medium text-danger">{erro}</p>}
    </div>
  )
}

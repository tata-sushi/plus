import { useState } from 'react'
import { Loader2, CheckCircle2, Clock, XCircle, MapPin, CalendarClock, CalendarPlus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// Desafio de "check-in presencial" com agendamento: o colaborador (1) agenda a visita
// ao RH com data + horário — o que cria um card no Kanban do RH pra Thamires —, depois
// (2) dá o check de comparecimento, e o RH valida na aba Envios pra liberar os pontos.
// Estados: agendar (sem/reprovado) → agendado → pendente → aprovado.
export function CheckinDesafio({ treinoId, envio, concluido, pontos, onEnviado }) {
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [reagendar, setReagendar] = useState(false)
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')

  const status = concluido ? 'aprovado' : envio?.status || null

  function fmtAgendado() {
    if (!envio?.agendado_data) return ''
    const [, m, d] = envio.agendado_data.split('-')
    return envio.agendado_hora ? `${d}/${m} às ${envio.agendado_hora}` : `${d}/${m}`
  }

  async function agendar() {
    if (!data) {
      setErro('Escolha a data da visita.')
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
        <p className="mt-2 text-sm font-bold text-accent">Comparecimento validado! +{pontos} pontos</p>
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
          Assim que o RH validar o seu comparecimento, os {pontos} pontos entram.
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
            <CalendarClock size={18} className="text-accent" /> Visita agendada
          </div>
          <p className="mt-1 text-xs text-muted">
            {fmtAgendado()} — compareça ao RH no horário combinado. Depois, confirme aqui.
          </p>
        </div>
        <button
          onClick={confirmar}
          disabled={busy}
          className="btn-primary mt-3 w-full !py-3.5 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <MapPin size={16} /> Confirmar presença
            </>
          )}
        </button>
        <button
          onClick={() => setReagendar(true)}
          className="btn-ghost mt-2 w-full !py-2 text-xs text-muted"
        >
          Reagendar
        </button>
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
            <XCircle size={17} /> Comparecimento não validado
          </div>
          {envio?.motivo && <p className="mt-1 text-xs text-muted">{envio.motivo}</p>}
          <p className="mt-1 text-[11px] text-muted-2">Agende uma nova visita ao RH.</p>
        </div>
      )}
      <p className="mb-2 text-sm font-semibold">Agendar visita ao RH</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-semibold text-muted">
          Data
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text outline-none"
          />
        </label>
        <label className="block text-[11px] font-semibold text-muted">
          Horário
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-text outline-none"
          />
        </label>
      </div>
      <button
        onClick={agendar}
        disabled={busy}
        className="btn-primary mt-3 w-full !py-3.5 disabled:opacity-60"
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
        Depois que passar no RH, seus pontos do desafio serão liberados automaticamente.
      </p>
      {erro && <p className="mt-2 text-center text-xs font-medium text-danger">{erro}</p>}
    </div>
  )
}

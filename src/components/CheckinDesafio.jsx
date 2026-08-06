import { useState } from 'react'
import { Loader2, CheckCircle2, Clock, XCircle, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// Desafio de "check-in presencial": o colaborador confirma que compareceu (ex.: foi
// ao RH) com um toque — sem anexo. Fica pendente e o RH valida na aba Envios; só então
// os pontos entram. Estados: sem check / pendente / aprovado / reprovado.
export function CheckinDesafio({ treinoId, envio, concluido, pontos, onEnviado }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const status = concluido ? 'aprovado' : envio?.status || null

  async function checkin() {
    setErro('')
    setEnviando(true)
    const { data, error } = await supabase.rpc('checkin_desafio', { p_treino: treinoId })
    setEnviando(false)
    if (error || !data?.ok) {
      setErro('Não foi possível registrar agora. Tente de novo.')
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

  // sem check ou reprovado → botão de check-in
  return (
    <div>
      {status === 'reprovado' && (
        <div className="mb-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3">
          <div className="hstack gap-2 text-sm font-semibold text-danger">
            <XCircle size={17} /> Comparecimento não validado
          </div>
          {envio?.motivo && <p className="mt-1 text-xs text-muted">{envio.motivo}</p>}
          <p className="mt-1 text-[11px] text-muted-2">Compareça ao RH e dê o check novamente.</p>
        </div>
      )}
      <button
        onClick={checkin}
        disabled={enviando}
        className="btn-primary w-full !py-3.5 disabled:opacity-60"
      >
        {enviando ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <MapPin size={16} /> Já fui ao RH
          </>
        )}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-2">
        O RH valida o seu comparecimento e libera os {pontos} pontos.
      </p>
      {erro && <p className="mt-2 text-center text-xs font-medium text-danger">{erro}</p>}
    </div>
  )
}

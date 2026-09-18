import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { QrCode, Loader2, Check, X, Star, AlertTriangle, CalendarClock, MapPin } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { QrScanner } from '../components/QrScanner.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Hub de Check-in = leitor ÚNICO de QR. Um só botão abre a câmera e lê qualquer
// código; o destino é decidido pelo conteúdo do QR:
//   ?b=<token>  → banheiro  → fluxo de limpeza (o servidor trava quem não tem acesso)
//   ?e=<token>  → evento    → registra presença (aberto a todos)
// Como cada destino aplica a própria regra, o leitor não precisa de trava própria.

function classificarQR(txt) {
  if (!txt) return null
  const s = String(txt).trim()
  try {
    const u = new URL(s)
    const b = u.searchParams.get('b')
    if (b) return { tipo: 'limpeza', token: b }
    const e = u.searchParams.get('e')
    if (e) return { tipo: 'evento', token: e }
  } catch { /* não é URL */ }
  return null // token cru é ambíguo (banheiro x evento) — pede pra escanear o QR oficial
}

function fmtData(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return '' }
}

export function CheckIn() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [eventos, setEventos] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [checkin, setCheckin] = useState(null) // { fase:'loading'|'ok'|'erro', ... }

  function carregar() {
    supabase.rpc('eventos_listar').then(({ data }) => setEventos(Array.isArray(data) ? data : []))
  }
  useEffect(() => {
    if (usuario?.podeCheckin) carregar()
  }, [usuario?.podeCheckin])

  function fazerCheckinEvento(token) {
    setScanning(false)
    setCheckin({ fase: 'loading' })
    supabase.rpc('evento_checkin', { p_token: token }).then(({ data, error }) => {
      if (error || !data?.ok) {
        const m = data?.erro
        const msg = m === 'sem_matricula' ? 'Entre no app com a sua conta pra registrar presença.'
          : m === 'evento_encerrado' ? 'Este evento já foi encerrado.'
          : m === 'evento_invalido' ? 'QR não reconhecido.'
          : 'Não consegui registrar. Tente de novo.'
        setCheckin({ fase: 'erro', msg })
      } else {
        setCheckin({ fase: 'ok', ...data })
        tapHaptic()
      }
      carregar()
    })
  }

  function aoLerQR(txt) {
    const c = classificarQR(txt)
    if (!c) { setScanning(false); setCheckin({ fase: 'erro', msg: 'QR não reconhecido. Aponte pro QR oficial do evento ou do banheiro.' }); return }
    if (c.tipo === 'limpeza') {
      // Sem acesso à limpeza? avisa aqui (o servidor barra de qualquer jeito).
      if (!usuario?.podeLimpeza) { setScanning(false); setCheckin({ fase: 'erro', msg: 'Você não tem acesso ao check de limpeza.' }); return }
      setScanning(false)
      navigate(`/limpeza?b=${encodeURIComponent(c.token)}`)
      return
    }
    fazerCheckinEvento(c.token)
  }

  if (!usuario || usuario.perfilPendente || usuario.podeCheckin == null) {
    return <div className="grid place-items-center py-24 text-muted-2"><Loader2 size={22} className="animate-spin" /></div>
  }
  if (!usuario.podeCheckin) return <Navigate to="/" replace />

  const abertos = eventos || []

  return (
    <>
      <Header title="Check-in" />
      <Voltar />
      <div className="mx-auto w-full max-w-[460px] px-5 pb-24 pt-2">
        {scanning ? (
          <QrScanner
            dica="Aponte a câmera pro QR do evento ou do banheiro."
            onCancelar={() => setScanning(false)}
            onLido={aoLerQR}
          />
        ) : (
          <>
            <div className="mt-6 flex flex-col items-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-accent">
                <QrCode size={30} />
              </span>
              <div className="mt-3 font-display text-lg font-bold">Check-in</div>
              <div className="mt-1 max-w-xs text-sm text-muted">
                Um leitor pra tudo: escaneie o QR do evento ou do banheiro. Data, horário e seu nome entram automático.
              </div>
              <button onClick={() => { tapHaptic(); setScanning(true) }} className="btn-primary mt-6 hstack w-full justify-center gap-2 py-3.5 text-sm font-bold">
                <QrCode size={18} /> Escanear QR
              </button>
            </div>

            {/* Eventos abertos agora — só informativo (o check-in é sempre pelo QR) */}
            {abertos.length > 0 && (
              <div className="mt-8">
                <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted">Abertos agora</div>
                <div className="flex flex-col gap-2">
                  {abertos.map((e) => (
                    <div key={e.id} className="card hstack items-center gap-3 !py-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                        <CalendarClock size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold leading-tight">{e.titulo}</div>
                        <div className="mt-0.5 hstack flex-wrap gap-x-2 gap-y-0 text-[11px] text-muted">
                          <span>{fmtData(e.data_inicio)}</span>
                          {e.local && <span className="hstack gap-0.5"><MapPin size={11} /> {e.local}</span>}
                        </div>
                      </div>
                      {e.ja_presente ? (
                        <span className="hstack shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                          <Check size={12} /> Presente
                        </span>
                      ) : e.pontos > 0 ? (
                        <span className="hstack shrink-0 items-center gap-1 rounded-full bg-fill px-2 py-0.5 text-[10px] font-bold text-muted">
                          <Star size={11} /> {e.pontos}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="mt-2 px-1 text-[11px] text-muted-2">Toque em “Escanear QR” e aponte pro código do evento pra confirmar presença.</p>
              </div>
            )}
          </>
        )}
      </div>

      {checkin && <CheckinResultado estado={checkin} onClose={() => setCheckin(null)} />}
    </>
  )
}

function CheckinResultado({ estado, onClose }) {
  const ok = estado.fase === 'ok'
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-6" onClick={onClose}>
      <div className="w-full max-w-[300px] rounded-2xl bg-bg p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
        {estado.fase === 'loading' ? (
          <div className="py-4"><Loader2 size={28} className="mx-auto animate-spin text-muted-2" /></div>
        ) : ok ? (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent"><Check size={30} /></div>
            <div className="mt-3 font-display text-lg font-bold">Presença confirmada!</div>
            <div className="mt-1 text-sm text-muted">{estado.titulo}</div>
            {estado.ja_tinha ? (
              <div className="mt-2 text-xs text-muted-2">Você já tinha registrado presença.</div>
            ) : estado.pontos > 0 ? (
              <div className="mt-2 hstack justify-center gap-1 text-sm font-bold text-accent"><Star size={15} /> +{estado.pontos} pontos</div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger/10 text-danger"><AlertTriangle size={28} /></div>
            <div className="mt-3 font-display text-base font-bold">Ops</div>
            <div className="mt-1 text-sm text-muted">{estado.msg}</div>
          </>
        )}
        <button onClick={onClose} className="btn-primary mt-5 w-full !py-2.5 text-sm font-bold">Fechar</button>
      </div>
    </div>,
    document.body,
  )
}

export default CheckIn

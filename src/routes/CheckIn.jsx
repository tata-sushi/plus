import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { QrCode, Loader2, Check, Star, AlertTriangle } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'
import { QrScanner } from '../components/QrScanner.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Hub de Check-in = leitor ÚNICO de QR. Um só toque no ícone abre a câmera e lê
// qualquer código; o destino é decidido pelo conteúdo do QR:
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

export function CheckIn() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [checkin, setCheckin] = useState(null) // { fase:'loading'|'ok'|'erro', ... }

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

  return (
    <>
      <Header />
      <CabecalhoPagina
        titulo="Check-in"
        descricao="Escaneie o QR para fazer o check-in das suas atividades e confirmar presenças em eventos."
      />
      <div className="mx-auto flex min-h-[58dvh] w-full max-w-[420px] flex-col px-5 pb-24 pt-2">
        {scanning ? (
          <QrScanner
            dica="Aponte a câmera pro QR do evento ou do banheiro."
            onCancelar={() => setScanning(false)}
            onLido={aoLerQR}
          />
        ) : (
          /* O próprio ícone é o botão de escanear — centralizado na página */
          <div className="flex flex-1 items-center justify-center">
            <button
              onClick={() => { tapHaptic(); setScanning(true) }}
              aria-label="Escanear QR"
              className="flex flex-col items-center gap-3 tap"
            >
              <span className="grid h-28 w-28 place-items-center rounded-[28px] bg-accent text-black shadow-md">
                <QrCode size={52} strokeWidth={2} />
              </span>
              <span className="text-sm font-semibold">Escanear QR</span>
            </button>
          </div>
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

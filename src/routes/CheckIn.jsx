import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { QrCode, SprayCan, CalendarCheck, Loader2, Check, X, Star, AlertTriangle } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { QrScanner } from '../components/QrScanner.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Hub de Check-in: junta num só lugar todos os check-ins por QR (banheiros,
// eventos e o que vier). Cada botão verde abre a leitura do QR.

// QR do evento pode vir como token puro OU URL com ?e=<token>.
function tokenEvento(txt) {
  if (!txt) return null
  const s = String(txt).trim()
  try { const u = new URL(s); const e = u.searchParams.get('e'); if (e) return e } catch { /* não é URL */ }
  if (/^[A-Za-z0-9_-]{6,64}$/.test(s)) return s
  return null
}

export function CheckIn() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [eventos, setEventos] = useState(null)
  const [scan, setScan] = useState(null) // { titulo } quando o scanner está aberto (evento)
  const [checkin, setCheckin] = useState(null) // { fase:'loading'|'ok'|'erro', ... }

  function carregar() {
    supabase.rpc('eventos_listar').then(({ data }) => setEventos(Array.isArray(data) ? data : []))
  }
  useEffect(() => {
    if (usuario?.podeCheckin) carregar()
  }, [usuario?.podeCheckin])

  function fazerCheckin(token) {
    setScan(null)
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

  // Enquanto verifica o acesso, mostra um loader; sem acesso, volta pra Home.
  if (!usuario || usuario.perfilPendente || usuario.podeCheckin == null) {
    return <div className="grid place-items-center py-24 text-muted-2"><Loader2 size={22} className="animate-spin" /></div>
  }
  if (!usuario.podeCheckin) return <Navigate to="/" replace />

  const semNada = !usuario.podeLimpeza && (eventos?.length ?? 0) === 0

  return (
    <>
      <Header title="Check-in" />
      <Voltar />
      <div className="mx-auto w-full max-w-[460px] px-5 pb-24 pt-2">
        <div className="mt-4 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-accent">
            <QrCode size={30} />
          </span>
          <div className="mt-3 font-display text-lg font-bold">Check-in</div>
          <div className="mt-1 max-w-xs text-sm text-muted">
            Escaneie o QR pra registrar sua presença. Data, horário e seu nome entram automático.
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {/* Banheiros — abre a câmera direto no fluxo de limpeza */}
          {usuario.podeLimpeza && (
            <BotaoCheckin
              icon={SprayCan}
              titulo="Check de limpeza"
              legenda="Banheiros"
              onClick={() => { tapHaptic(); navigate('/limpeza?scan=1') }}
            />
          )}

          {/* Eventos ativos — um botão por evento; abre a leitura do QR */}
          {eventos === null ? (
            <div className="hstack justify-center py-6 text-muted-2"><Loader2 size={20} className="animate-spin" /></div>
          ) : (
            eventos.map((e) => (
              <BotaoCheckin
                key={e.id}
                icon={CalendarCheck}
                titulo={e.titulo}
                legenda={e.local || e.unidade || 'Evento'}
                presente={e.ja_presente}
                onClick={() => { tapHaptic(); setScan({ titulo: e.titulo }) }}
              />
            ))
          )}

          {semNada && (
            <p className="py-8 text-center text-sm text-muted">Nenhum check-in disponível agora.</p>
          )}
        </div>
      </div>

      {scan && (
        <ModalBase titulo={`Escanear QR — ${scan.titulo}`} onClose={() => setScan(null)}>
          <QrScanner
            dica={`Aponte a câmera pro QR de ${scan.titulo}.`}
            onCancelar={() => setScan(null)}
            onLido={(txt) => {
              const t = tokenEvento(txt)
              if (t) fazerCheckin(t)
              else setCheckin({ fase: 'erro', msg: 'QR não reconhecido. Tente de novo.' })
            }}
          />
        </ModalBase>
      )}

      {checkin && <CheckinResultado estado={checkin} onClose={() => setCheckin(null)} />}
    </>
  )
}

// Botão verde padrão do hub (modelo do banheiro), com nome + legenda.
function BotaoCheckin({ icon: Icon, titulo, legenda, presente, onClick }) {
  return (
    <button onClick={onClick} className="btn-primary hstack w-full items-center gap-3 !py-3 pl-4 pr-3 text-left tap">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/10">
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-tight">{titulo}</span>
        {legenda && <span className="block truncate text-[11px] font-medium opacity-80">{legenda}</span>}
      </span>
      {presente ? (
        <span className="hstack shrink-0 items-center gap-1 rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-bold uppercase">
          <Check size={12} /> Presente
        </span>
      ) : (
        <QrCode size={18} className="shrink-0 opacity-90" />
      )}
    </button>
  )
}

function ModalBase({ titulo, children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-bg p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl sm:pb-5" onClick={(ev) => ev.stopPropagation()}>
        <div className="hstack items-center justify-between pb-1">
          <div className="min-w-0 truncate pr-2 font-display text-base font-bold">{titulo}</div>
          <button onClick={onClose} aria-label="Fechar" className="shrink-0 text-muted tap"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
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

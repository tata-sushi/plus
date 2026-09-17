import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, QrCode, Plus, Loader2, X, Check, Users, MapPin, CalendarClock,
  Star, Power, Pencil, Download, AlertTriangle,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { QrScanner } from '../components/QrScanner.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Deep link do QR: abre o app já no check-in.
const DEEP = 'https://plus.tatasushi.tech/eventos?e='
const UNIDADES = ['Itaim', 'Pinheiros', 'Poke - Pinheiros', 'Tatá House', 'Administrativo']

// QR pode ser o token puro OU a URL com ?e=<token>.
function tokenDoQR(txt) {
  if (!txt) return null
  const s = String(txt).trim()
  try { const u = new URL(s); const e = u.searchParams.get('e'); if (e) return e } catch { /* não é URL */ }
  if (/^[A-Za-z0-9_-]{6,64}$/.test(s)) return s
  return null
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
// ISO → valor de <input type="datetime-local"> no fuso local do navegador.
function paraInputLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export function Eventos() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const deepToken = params.get('e')

  const [eventos, setEventos] = useState(null)
  const [podeGerir, setPodeGerir] = useState(false)
  const [scan, setScan] = useState(false)
  const [checkin, setCheckin] = useState(null) // { fase:'loading'|'ok'|'erro', ... }
  const [form, setForm] = useState(null) // evento em edição/criação
  const [presencasDe, setPresencasDe] = useState(null)
  const [qrDe, setQrDe] = useState(null)

  function carregar() {
    supabase.rpc('eventos_listar').then(({ data }) => setEventos(Array.isArray(data) ? data : []))
  }
  useEffect(() => {
    carregar()
    supabase.rpc('evento_pode_gerir').then(({ data }) => setPodeGerir(!!data))
  }, [])

  function fazerCheckin(token) {
    setScan(false)
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

  // Deep link (?e=token): check-in automático e limpa o parâmetro.
  useEffect(() => {
    if (!deepToken) return
    fazerCheckin(deepToken)
    const p = new URLSearchParams(params)
    p.delete('e')
    setParams(p, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepToken])

  return (
    <>
      <Header />

      <div className="hstack justify-between px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      <div className="mb-1 mt-3 px-6 text-center">
        <div className="font-display text-[19px] font-bold leading-tight">Eventos</div>
        <div className="mt-1 text-xs text-muted">Escaneie o QR do evento pra registrar presença</div>
      </div>

      <div className="mx-auto w-full max-w-[460px] px-5 pt-3">
        <button onClick={() => { tapHaptic(); setScan(true) }} className="btn-primary hstack w-full justify-center gap-2 !py-3 text-sm font-bold">
          <QrCode size={18} /> Fazer check-in (escanear QR)
        </button>

        {podeGerir && (
          <button onClick={() => setForm({ pontos: 10 })} className="mt-2 hstack w-full justify-center gap-2 rounded-card border border-line bg-surface py-2.5 text-sm font-semibold text-text tap">
            <Plus size={16} /> Novo evento
          </button>
        )}

        <div className="mt-5 flex flex-col gap-3 pb-16">
          {eventos === null ? (
            <div className="hstack justify-center py-10 text-muted-2"><Loader2 size={20} className="animate-spin" /></div>
          ) : eventos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nenhum evento por aqui ainda.</p>
          ) : (
            eventos.map((e) => (
              <EventoCard key={e.id} e={e} podeGerir={podeGerir}
                onQr={() => setQrDe(e)} onPresencas={() => setPresencasDe(e)}
                onEditar={() => setForm({ ...e, editar: true })}
                onArquivar={() => {
                  supabase.rpc('evento_arquivar', { p_id: e.id, p_ativo: false }).then(carregar)
                }} />
            ))
          )}
        </div>
      </div>

      {scan && (
        <ModalBase onClose={() => setScan(false)} titulo="Escanear QR do evento">
          <QrScanner
            dica="Aponte a câmera pro QR do evento."
            onCancelar={() => setScan(false)}
            onLido={(txt) => { const t = tokenDoQR(txt); if (t) fazerCheckin(t); else setCheckin({ fase: 'erro', msg: 'QR não reconhecido. Tente de novo.' }) }}
          />
        </ModalBase>
      )}

      {checkin && <CheckinResultado estado={checkin} onClose={() => setCheckin(null)} />}
      {form && <FormEvento evento={form} onClose={() => setForm(null)} onSalvo={() => { setForm(null); carregar() }} />}
      {qrDe && <QrEvento evento={qrDe} onClose={() => setQrDe(null)} />}
      {presencasDe && <PresencasEvento evento={presencasDe} onClose={() => setPresencasDe(null)} />}
    </>
  )
}

function EventoCard({ e, podeGerir, onQr, onPresencas, onEditar, onArquivar }) {
  return (
    <div className="card p-4">
      <div className="hstack items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-base font-bold leading-tight">{e.titulo}</div>
          <div className="mt-1 hstack flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            <span className="hstack gap-1"><CalendarClock size={13} /> {fmtData(e.data_inicio)}{e.data_fim ? ` – ${fmtData(e.data_fim)}` : ''}</span>
            {e.local && <span className="hstack gap-1"><MapPin size={13} /> {e.local}</span>}
          </div>
        </div>
        {e.pontos > 0 && (
          <span className="hstack shrink-0 gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
            <Star size={12} /> {e.pontos}
          </span>
        )}
      </div>
      {e.descricao && <p className="mt-2 text-sm leading-relaxed text-muted">{e.descricao}</p>}

      <div className="mt-3 hstack items-center justify-between">
        <div className="hstack gap-3 text-xs text-muted">
          {e.unidade && <span className="rounded-full bg-fill px-2 py-0.5 font-medium">{e.unidade}</span>}
          <span className="hstack gap-1"><Users size={13} /> {e.total} presente{e.total === 1 ? '' : 's'}</span>
        </div>
        {e.ja_presente && (
          <span className="hstack gap-1 text-xs font-bold text-accent"><Check size={14} /> Você está presente</span>
        )}
      </div>

      {podeGerir && (
        <div className="mt-3 hstack flex-wrap gap-2 border-t border-line pt-3">
          <button onClick={onQr} className="hstack gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent tap"><QrCode size={13} /> QR</button>
          <button onClick={onPresencas} className="hstack gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-text tap"><Users size={13} /> Presenças</button>
          <button onClick={onEditar} className="hstack gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted tap"><Pencil size={13} /> Editar</button>
          <button onClick={() => { if (window.confirm('Encerrar este evento? Ele para de aceitar check-ins.')) onArquivar() }} className="hstack gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-danger tap"><Power size={13} /> Encerrar</button>
        </div>
      )}
    </div>
  )
}

function ModalBase({ titulo, children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-bg p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl sm:pb-5" onClick={(ev) => ev.stopPropagation()}>
        <div className="hstack items-center justify-between pb-1">
          <div className="font-display text-base font-bold">{titulo}</div>
          <button onClick={onClose} aria-label="Fechar" className="text-muted tap"><X size={20} /></button>
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

function FormEvento({ evento, onClose, onSalvo }) {
  const [titulo, setTitulo] = useState(evento.titulo || '')
  const [descricao, setDescricao] = useState(evento.descricao || '')
  const [local, setLocal] = useState(evento.local || '')
  const [unidade, setUnidade] = useState(evento.unidade || '')
  const [inicio, setInicio] = useState(paraInputLocal(evento.data_inicio) || '')
  const [fim, setFim] = useState(paraInputLocal(evento.data_fim) || '')
  const [pontos, setPontos] = useState(evento.pontos ?? 10)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function salvar() {
    if (!titulo.trim()) { setErro('Dê um título ao evento.'); return }
    if (!inicio) { setErro('Informe a data e hora de início.'); return }
    setSalvando(true)
    setErro('')
    supabase.rpc('evento_salvar', {
      p_id: evento.editar ? evento.id : null,
      p_titulo: titulo.trim(),
      p_descricao: descricao.trim() || null,
      p_local: local.trim() || null,
      p_unidade: unidade || null,
      p_data_inicio: new Date(inicio).toISOString(),
      p_data_fim: fim ? new Date(fim).toISOString() : null,
      p_pontos: Number(pontos) || 0,
    }).then(({ data, error }) => {
      setSalvando(false)
      if (error || !data?.ok) { setErro('Não consegui salvar. Tente de novo.'); return }
      onSalvo()
    })
  }

  const inputCls = 'mt-1 w-full rounded-card border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-carbon'
  return (
    <ModalBase titulo={evento.editar ? 'Editar evento' : 'Novo evento'} onClose={onClose}>
      <div className="mt-2 flex flex-col gap-3">
        <label className="block text-xs font-semibold text-muted">Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} placeholder="Ex: Treinamento de atendimento" />
        </label>
        <label className="block text-xs font-semibold text-muted">Descrição
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Opcional" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-muted">Início
            <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-xs font-semibold text-muted">Fim (opcional)
            <input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-muted">Unidade
            <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className={inputCls}>
              <option value="">Todas</option>
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">Pontos por presença
            <input type="number" min="0" value={pontos} onChange={(e) => setPontos(e.target.value)} className={inputCls} />
          </label>
        </div>
        <label className="block text-xs font-semibold text-muted">Local
          <input value={local} onChange={(e) => setLocal(e.target.value)} className={inputCls} placeholder="Ex: Salão Itaim" />
        </label>
        {erro && <div className="text-xs font-medium text-danger">{erro}</div>}
        <button onClick={salvar} disabled={salvando} className="btn-primary mt-1 hstack w-full justify-center gap-2 !py-3 text-sm font-bold disabled:opacity-60">
          {salvando && <Loader2 size={16} className="animate-spin" />} {evento.editar ? 'Salvar' : 'Criar evento'}
        </button>
      </div>
    </ModalBase>
  )
}

function QrEvento({ evento, onClose }) {
  const [dataUrl, setDataUrl] = useState(null)
  const link = DEEP + evento.token
  useEffect(() => {
    let vivo = true
    import('qrcode').then((m) => m.toDataURL(link, { width: 360, margin: 2 }))
      .then((url) => { if (vivo) setDataUrl(url) }).catch(() => {})
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const arquivo = `QR-${(evento.titulo || 'evento').replace(/\s+/g, '_')}.png`
  return (
    <ModalBase titulo={`QR — ${evento.titulo}`} onClose={onClose}>
      <div className="mt-2 text-center">
        <p className="mx-auto max-w-[300px] text-sm text-muted">Projete ou imprima. O colaborador aponta a câmera e o check-in entra automático.</p>
        <div className="mx-auto mt-4 w-full max-w-[280px] rounded-2xl bg-white p-4">
          {dataUrl ? <img src={dataUrl} alt="QR do evento" className="w-full" /> : <div className="grid aspect-square place-items-center"><Loader2 size={24} className="animate-spin text-muted-2" /></div>}
        </div>
        {dataUrl && (
          <a href={dataUrl} download={arquivo} className="btn-primary mt-4 hstack w-full justify-center gap-2 !py-2.5 text-sm font-bold">
            <Download size={16} /> Baixar QR
          </a>
        )}
      </div>
    </ModalBase>
  )
}

function PresencasEvento({ evento, onClose }) {
  const [lista, setLista] = useState(null)
  useEffect(() => {
    supabase.rpc('evento_presencas_listar', { p_evento: evento.id }).then(({ data }) => setLista(Array.isArray(data) ? data : []))
  }, [evento.id])
  return (
    <ModalBase titulo={`Presenças · ${evento.titulo}`} onClose={onClose}>
      {lista === null ? (
        <div className="hstack justify-center py-8 text-muted-2"><Loader2 size={20} className="animate-spin" /></div>
      ) : lista.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Ninguém fez check-in ainda.</p>
      ) : (
        <>
          <div className="px-1 pb-2 pt-1 text-xs text-muted">{lista.length} presente{lista.length === 1 ? '' : 's'}</div>
          <div className="flex flex-col divide-y divide-line">
            {lista.map((p) => (
              <div key={p.matricula} className="hstack gap-3 py-2">
                <Avatar name={p.nome} src={p.avatar_url} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.nome}</div>
                  <div className="truncate text-[11px] text-muted">{p.cargo}{p.unidade ? ` · ${p.unidade}` : ''}</div>
                </div>
                <div className="shrink-0 text-[11px] text-muted-2">{fmtData(p.marcado_em)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </ModalBase>
  )
}

export default Eventos

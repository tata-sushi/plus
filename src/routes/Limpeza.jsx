import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import jsQR from 'jsqr'
import { QrCode, Camera, Check, Loader2, X, SprayCan, AlertTriangle, RotateCcw } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Card } from '../components/Card.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// O QR pode ser o token puro OU uma URL com ?b=<token> (deep link).
function tokenDoQR(txt) {
  if (!txt) return null
  const s = String(txt).trim()
  try {
    const u = new URL(s)
    const b = u.searchParams.get('b')
    if (b) return b
  } catch { /* não é URL, segue */ }
  if (/^[A-Za-z0-9_-]{6,64}$/.test(s)) return s
  return null
}

export default function Limpeza() {
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()
  const [fase, setFase] = useState('inicio') // inicio | scan | prep | erro | enviando | ok
  const [erro, setErro] = useState('')
  const [token, setToken] = useState(null)
  const [dados, setDados] = useState(null) // resposta do preparar
  const [obs, setObs] = useState('')
  const [fotoObrig, setFotoObrig] = useState(null) // { file, preview }
  const [fotoOpcional, setFotoOpcional] = useState(null)
  const [ultimo, setUltimo] = useState(null)
  const [itens, setItens] = useState({}) // respostas do checklist: chave -> bool

  // Deep link: QR abriu o app em /limpeza?b=<token>
  useEffect(() => {
    const b = params.get('b')
    if (b) iniciarComToken(b)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciarComToken(tk) {
    setToken(tk); setErro(''); setDados(null); setObs('')
    setFotoObrig(null); setFotoOpcional(null); setFase('prep')
    try {
      const { data, error } = await supabase.rpc('limpeza_preparar', { p_token: tk })
      if (error) throw error
      setDados(data)
      // checklist começa todo "SIM" (feito); a pessoa marca NÃO nas exceções
      setItens(Object.fromEntries((data.itens || []).map((i) => [i.chave, true])))
    } catch (e) {
      setErro(traduzir(e)); setFase('erro')
    }
  }

  async function subirFoto(file) {
    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${usuario.matricula}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('limpeza').upload(path, file, {
      contentType: file.type || 'image/jpeg', upsert: false,
    })
    if (error) throw error
    return path
  }

  async function confirmar() {
    if (dados?.foto_requerida && !fotoObrig) {
      setErro(`Tire ${dados.foto_tipo === 'selfie' ? 'a selfie' : 'a foto da limpeza'} pra confirmar.`)
      return
    }
    setFase('enviando'); setErro('')
    try {
      let fotoUrl = null, fotoObsUrl = null
      if (fotoObrig) fotoUrl = await subirFoto(fotoObrig.file)
      if (fotoOpcional) fotoObsUrl = await subirFoto(fotoOpcional.file)
      const { error } = await supabase.rpc('limpeza_registrar', {
        p_token: token, p_foto_url: fotoUrl,
        p_observacao: obs.trim() || null, p_foto_obs_url: fotoObsUrl,
        p_itens: dados?.itens?.length ? itens : null,
      })
      if (error) throw error
      tapHaptic()
      setUltimo({ banheiro: dados.banheiro, quando: new Date() })
      if (params.get('b')) setParams({}, { replace: true })
      setFase('ok')
    } catch (e) {
      setErro(traduzir(e)); setFase('prep')
    }
  }

  function recomecar() {
    setToken(null); setDados(null); setObs('')
    setFotoObrig(null); setFotoOpcional(null); setErro(''); setFase('inicio')
  }

  if (!usuario || usuario.perfilPendente || usuario.podeLimpeza == null) {
    return <div className="grid place-items-center py-24 text-muted-2"><Loader2 size={22} className="animate-spin" /></div>
  }
  if (!usuario.podeLimpeza) return <Navigate to="/" replace />

  return (
    <>
      <Header title="Limpeza de banheiros" />
      <Voltar />
      <div className="px-5 pb-24 pt-2">
        {fase === 'inicio' && <TelaInicio onScan={() => { setErro(''); setFase('scan') }} />}

        {fase === 'scan' && (
          <QrScanner
            onLido={(txt) => {
              const tk = tokenDoQR(txt)
              if (tk) iniciarComToken(tk)
              else { setErro('QR não reconhecido. Tente de novo.'); setFase('erro') }
            }}
            onCancelar={() => setFase('inicio')}
          />
        )}

        {fase === 'prep' && !dados && (
          <div className="grid place-items-center py-24 text-muted-2"><Loader2 size={22} className="animate-spin" /></div>
        )}

        {fase === 'prep' && dados && (
          <TelaConfirmar
            dados={dados} itens={itens} setItens={setItens} obs={obs} setObs={setObs}
            fotoObrig={fotoObrig} setFotoObrig={setFotoObrig}
            fotoOpcional={fotoOpcional} setFotoOpcional={setFotoOpcional}
            erro={erro} onConfirmar={confirmar} onCancelar={recomecar}
          />
        )}

        {fase === 'enviando' && (
          <div className="grid place-items-center gap-2 py-24 text-muted">
            <Loader2 size={22} className="animate-spin" /> Registrando…
          </div>
        )}

        {fase === 'erro' && <TelaErro erro={erro} onVoltar={recomecar} />}

        {fase === 'ok' && <TelaOk ultimo={ultimo} onNovo={recomecar} />}
      </div>
    </>
  )
}

function traduzir(e) {
  const m = e?.message || ''
  if (/QR inválido|inativo/i.test(m)) return 'QR inválido ou banheiro desativado.'
  if (/Sem acesso/i.test(m)) return 'Você não tem acesso à limpeza. Fale com o RH.'
  if (/row-level|permission|denied/i.test(m)) return 'Sem permissão pra enviar a foto.'
  return m || 'Algo deu errado. Tente de novo.'
}

// ── Tela inicial ─────────────────────────────────────────────────────────────
function TelaInicio({ onScan }) {
  return (
    <div className="mt-6 flex flex-col items-center text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-accent">
        <SprayCan size={30} />
      </span>
      <div className="mt-3 font-display text-lg font-bold">Check de limpeza</div>
      <div className="mt-1 max-w-xs text-sm text-muted">
        Escaneie o QR do banheiro pra registrar a limpeza. Data, horário e seu nome entram automático.
      </div>
      <button onClick={onScan} className="btn-primary mt-6 hstack w-full justify-center gap-2 py-3.5 text-sm">
        <QrCode size={18} /> Escanear QR do banheiro
      </button>
    </div>
  )
}

// ── Scanner (câmera + jsQR) ──────────────────────────────────────────────────
function QrScanner({ onLido, onCancelar }) {
  const videoRef = useRef(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let stream, raf, cancelado = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    function tick() {
      if (cancelado) return
      const v = videoRef.current
      if (v && v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth) {
        canvas.width = v.videoWidth
        canvas.height = v.videoHeight
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        if (code && code.data) { onLido(code.data); return }
      }
      raf = requestAnimationFrame(tick)
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return }
        const v = videoRef.current
        v.srcObject = stream
        await v.play()
        raf = requestAnimationFrame(tick)
      } catch {
        setErro('Não consegui abrir a câmera. Autorize o acesso — ou aponte a câmera do celular no QR (ele abre o app direto).')
      }
    }
    start()
    return () => {
      cancelado = true
      if (raf) cancelAnimationFrame(raf)
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-48 w-48 rounded-2xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      </div>
      {erro
        ? <div className="mt-3 hstack items-start gap-2 text-sm text-danger"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{erro}</div>
        : <div className="mt-3 text-center text-xs text-muted">Aponte a câmera pro QR do banheiro.</div>}
      <button onClick={onCancelar} className="mt-3 w-full rounded-lg border border-line py-2.5 text-sm font-semibold text-muted tap">
        Cancelar
      </button>
    </div>
  )
}

// ── Campo de foto (usa a câmera do celular via input capture) ────────────────
function FotoInput({ label, valor, onChange, capture }) {
  if (valor) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-line">
        <img src={valor.preview} alt="" className="max-h-60 w-full object-cover" />
        <button
          onClick={() => onChange(null)}
          aria-label="Remover foto"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white tap"
        >
          <X size={16} />
        </button>
      </div>
    )
  }
  return (
    <label className="hstack cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line py-3 text-sm font-semibold text-muted tap">
      <Camera size={18} /> {label || 'Tirar foto'}
      <input
        type="file" accept="image/*" capture={capture} className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onChange({ file: f, preview: URL.createObjectURL(f) })
          e.target.value = ''
        }}
      />
    </label>
  )
}

// ── Tela de confirmação ──────────────────────────────────────────────────────
function TelaConfirmar({ dados, itens, setItens, obs, setObs, fotoObrig, setFotoObrig, fotoOpcional, setFotoOpcional, erro, onConfirmar, onCancelar }) {
  const ehSelfie = dados.foto_tipo === 'selfie'
  return (
    <div className="mt-4 flex flex-col gap-4">
      <Card className="hstack gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <SprayCan size={20} />
        </span>
        <div className="min-w-0">
          <div className="font-display text-base font-bold">{dados.banheiro.nome}</div>
          {dados.banheiro.unidade && <div className="text-xs text-muted">{dados.banheiro.unidade}</div>}
        </div>
      </Card>

      {dados.itens?.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">Checklist da limpeza</div>
          <Card className="flex flex-col divide-y divide-line !p-0">
            {dados.itens.map((it) => {
              const sim = itens[it.chave] !== false
              return (
                <div key={it.chave} className="hstack items-center gap-2 px-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm">{it.label}</span>
                  <div className="hstack shrink-0 overflow-hidden rounded-lg border border-line">
                    <button type="button" onClick={() => setItens((m) => ({ ...m, [it.chave]: true }))}
                      className={cn('px-3 py-1 text-xs font-bold tap', sim ? 'bg-accent text-black' : 'text-muted')}>SIM</button>
                    <button type="button" onClick={() => setItens((m) => ({ ...m, [it.chave]: false }))}
                      className={cn('border-l border-line px-3 py-1 text-xs font-bold tap', !sim ? 'bg-danger text-white' : 'text-muted')}>NÃO</button>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {dados.foto_requerida && (
        <Card className="border-warn/40">
          <div className="hstack gap-2 text-sm font-semibold text-warn">
            <Camera size={16} /> Verificação: {ehSelfie ? 'tire uma selfie' : 'tire uma foto da limpeza'}
          </div>
          <div className="mt-1 text-xs text-muted">
            De vez em quando o app pede uma foto pra confirmar. Essa é obrigatória neste check.
          </div>
          <div className="mt-3">
            <FotoInput
              valor={fotoObrig} onChange={setFotoObrig}
              capture={ehSelfie ? 'user' : 'environment'}
              label={ehSelfie ? 'Tirar selfie' : 'Tirar foto da limpeza'}
            />
          </div>
        </Card>
      )}

      <div>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">Observação (opcional)</div>
        <textarea
          rows={3} value={obs} onChange={(e) => setObs(e.target.value)}
          placeholder="Algo a registrar? (falta de material, problema no banheiro…)"
          className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-2"
        />
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">Foto (opcional)</div>
        <FotoInput valor={fotoOpcional} onChange={setFotoOpcional} capture="environment" label="Anexar foto" />
      </div>

      {erro && <div className="hstack items-start gap-2 text-sm text-danger"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{erro}</div>}

      <button onClick={onConfirmar} className="btn-primary hstack w-full justify-center gap-2 py-3.5 text-sm">
        <Check size={18} /> Confirmar limpeza
      </button>
      <button onClick={onCancelar} className="w-full rounded-lg border border-line py-2.5 text-sm font-semibold text-muted tap">
        Cancelar
      </button>
    </div>
  )
}

// ── Erro ─────────────────────────────────────────────────────────────────────
function TelaErro({ erro, onVoltar }) {
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle size={26} />
      </span>
      <div className="mt-3 max-w-xs text-sm text-muted">{erro}</div>
      <button onClick={onVoltar} className="mt-6 hstack items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold tap">
        <RotateCcw size={16} /> Tentar de novo
      </button>
    </div>
  )
}

// ── Sucesso ──────────────────────────────────────────────────────────────────
function TelaOk({ ultimo, onNovo }) {
  const hora = ultimo?.quando
    ? ultimo.quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-black">
        <Check size={32} />
      </span>
      <div className="mt-3 font-display text-lg font-bold">Limpeza registrada!</div>
      {ultimo?.banheiro && (
        <div className="mt-1 text-sm text-muted">
          {ultimo.banheiro.nome}{ultimo.banheiro.unidade ? ` · ${ultimo.banheiro.unidade}` : ''} · {hora}
        </div>
      )}
      <button onClick={onNovo} className="btn-primary mt-6 hstack w-full justify-center gap-2 py-3.5 text-sm">
        <QrCode size={18} /> Escanear outro banheiro
      </button>
    </div>
  )
}

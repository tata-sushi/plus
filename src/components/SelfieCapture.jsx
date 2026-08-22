import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, Loader2, ShieldCheck } from 'lucide-react'

// Captura uma selfie no momento da assinatura (prova de autoria). Usa a câmera
// frontal; se o navegador negar/não suportar, cai pro seletor de foto do sistema
// (input capture). Entrega o Blob via onChange(blob|null).
export function SelfieCapture({ onChange }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [fase, setFase] = useState('idle') // idle | camera | previa
  const [previa, setPrevia] = useState(null) // objectURL
  const [carregando, setCarregando] = useState(false)
  const [semCamera, setSemCamera] = useState(false)

  const pararStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      pararStream()
      if (previa) URL.revokeObjectURL(previa)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function abrirCamera() {
    setCarregando(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      setFase('camera')
      // espera o elemento montar
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      setSemCamera(true) // navegador negou ou não tem — usa o fallback
    } finally {
      setCarregando(false)
    }
  }

  function capturar() {
    const v = videoRef.current
    if (!v) return
    const lado = Math.min(v.videoWidth, v.videoHeight) || 480
    const c = document.createElement('canvas')
    c.width = lado
    c.height = lado
    const ctx = c.getContext('2d')
    // recorte quadrado central
    const sx = (v.videoWidth - lado) / 2
    const sy = (v.videoHeight - lado) / 2
    ctx.drawImage(v, sx, sy, lado, lado, 0, 0, lado, lado)
    c.toBlob(
      (b) => {
        pararStream()
        if (previa) URL.revokeObjectURL(previa)
        setPrevia(URL.createObjectURL(b))
        setFase('previa')
        onChange?.(b)
      },
      'image/jpeg',
      0.85,
    )
  }

  function refazer() {
    if (previa) URL.revokeObjectURL(previa)
    setPrevia(null)
    onChange?.(null)
    setFase('idle')
    if (!semCamera) abrirCamera()
  }

  function viaArquivo(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (previa) URL.revokeObjectURL(previa)
    setPrevia(URL.createObjectURL(f))
    setFase('previa')
    onChange?.(f)
  }

  return (
    <div>
      <div className="relative mx-auto aspect-square w-44 overflow-hidden rounded-2xl border border-line bg-surface-2">
        {fase === 'previa' && previa ? (
          <img src={previa} alt="Sua selfie" className="h-full w-full object-cover" />
        ) : fase === 'camera' ? (
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : semCamera ? (
          // botão dentro do quadrado (fallback: seletor de foto do sistema)
          <label className="grid h-full w-full cursor-pointer place-items-center gap-1.5 text-muted-2 tap">
            <Camera size={30} />
            <span className="text-xs font-semibold text-accent">Tirar selfie</span>
            <input type="file" accept="image/*" capture="user" onChange={viaArquivo} className="hidden" />
          </label>
        ) : (
          // botão dentro do quadrado (abre a câmera)
          <button
            type="button"
            onClick={abrirCamera}
            disabled={carregando}
            className="grid h-full w-full place-items-center gap-1.5 text-muted-2 tap"
          >
            {carregando ? <Loader2 size={28} className="animate-spin" /> : <Camera size={30} />}
            <span className="text-xs font-semibold text-accent">Tirar selfie</span>
          </button>
        )}
      </div>

      {(fase === 'camera' || fase === 'previa') && (
        <div className="mt-3 flex justify-center">
          {fase === 'previa' ? (
            <button type="button" onClick={refazer} className="btn-ghost !py-2 text-xs">
              <RotateCcw size={14} /> Refazer
            </button>
          ) : (
            <button type="button" onClick={capturar} className="btn-primary !py-2.5 text-sm">
              <Camera size={16} /> Capturar
            </button>
          )}
        </div>
      )}

      <p className="mt-3 hstack items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-snug text-muted-2">
        <ShieldCheck size={13} className="mt-px shrink-0" />
        <span>Sua selfie é guardada junto da assinatura.</span>
      </p>
    </div>
  )
}

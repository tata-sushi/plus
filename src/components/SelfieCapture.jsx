import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { checarSelfie, preaquecerFaceCheck, MOTIVO_MSG } from '../lib/faceCheck.js'

// Captura uma selfie no momento da assinatura (prova de autoria). Usa a câmera
// frontal; se o navegador negar/não suportar, cai pro seletor de foto do sistema
// (input capture). Entrega o Blob via onChange(blob|null).
//
// Antes de aceitar, confere NO APARELHO se há mesmo um rosto enquadrado
// (anti "foto da mão / teto / tela preta"). Só chama onChange(blob) quando
// passa; enquanto confere ou se reprova, entrega null (trava o botão Assinar).
export function SelfieCapture({ onChange }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [fase, setFase] = useState('idle') // idle | camera | previa
  const [previa, setPrevia] = useState(null) // objectURL
  const [carregando, setCarregando] = useState(false)
  const [semCamera, setSemCamera] = useState(false)
  const [checando, setChecando] = useState(false) // rodando a checagem facial
  const [erroFace, setErroFace] = useState('') // motivo da reprovação (refazer)

  const pararStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    preaquecerFaceCheck() // já baixa o modelo enquanto a pessoa lê o termo
    return () => {
      pararStream()
      if (previa) URL.revokeObjectURL(previa)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Confere a selfie no aparelho. Enquanto confere, não vale (onChange(null));
  // passou → entrega o blob; reprovou → mostra o motivo e pede pra refazer.
  const processarSelfie = useCallback(
    async (blob) => {
      setErroFace('')
      setChecando(true)
      onChange?.(null)
      const r = await checarSelfie(blob)
      setChecando(false)
      if (r.ok) {
        onChange?.(blob)
      } else {
        setErroFace(r.msg || MOTIVO_MSG.sem_rosto)
        onChange?.(null)
      }
    },
    [onChange],
  )

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
        processarSelfie(b)
      },
      'image/jpeg',
      0.85,
    )
  }

  function refazer() {
    if (previa) URL.revokeObjectURL(previa)
    setPrevia(null)
    setErroFace('')
    setChecando(false)
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
    processarSelfie(f)
  }

  return (
    <div>
      <div
        className={`relative mx-auto aspect-square w-36 overflow-hidden rounded-2xl border bg-surface-2 ${
          erroFace ? 'border-danger' : 'border-line'
        }`}
      >
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
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-muted-2 tap">
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
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-2 tap"
          >
            {carregando ? <Loader2 size={28} className="animate-spin" /> : <Camera size={30} />}
            <span className="text-xs font-semibold text-accent">Tirar selfie</span>
          </button>
        )}
        {/* botões sobre o quadrado — não empurram o layout (mantém alinhado) */}
        {fase === 'camera' && (
          <button
            type="button"
            onClick={capturar}
            className="absolute bottom-2 left-1/2 hstack -translate-x-1/2 gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-black shadow-md"
          >
            <Camera size={14} /> Capturar
          </button>
        )}
        {fase === 'previa' && (
          <button
            type="button"
            onClick={refazer}
            className="absolute bottom-2 left-1/2 hstack -translate-x-1/2 gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur"
          >
            <RotateCcw size={13} /> Refazer
          </button>
        )}
        {/* overlay enquanto confere o rosto */}
        {checando && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-[1px]">
            <Loader2 size={22} className="animate-spin text-white" />
          </div>
        )}
      </div>

      {checando ? (
        <p className="mt-3 hstack items-center justify-center gap-1.5 px-2 text-center text-[11px] font-semibold text-accent">
          <Loader2 size={13} className="shrink-0 animate-spin" />
          <span>Conferindo o rosto…</span>
        </p>
      ) : erroFace ? (
        <p className="mt-3 hstack items-start justify-center gap-1.5 px-2 text-center text-[11px] font-semibold leading-snug text-danger">
          <AlertCircle size={13} className="mt-px shrink-0" />
          <span>{erroFace}</span>
        </p>
      ) : (
        <p className="mt-3 hstack items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-snug text-muted-2">
          <ShieldCheck size={13} className="mt-px shrink-0" />
          <span>Sua selfie é guardada junto da assinatura.</span>
        </p>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { AlertTriangle } from 'lucide-react'

// Scanner de QR (câmera + jsQR). Devolve o texto lido cru em onLido; quem chama
// decide como interpretar. Mesmo motor usado na Limpeza.
export function QrScanner({ onLido, onCancelar, dica = 'Aponte a câmera pro QR.' }) {
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
    <div className="mt-1">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-48 w-48 rounded-2xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      </div>
      {erro ? (
        <div className="mt-3 hstack items-start gap-2 text-sm text-danger">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      ) : (
        <div className="mt-3 text-center text-xs text-muted">{dica}</div>
      )}
      <button onClick={onCancelar} className="mt-3 w-full rounded-lg border border-line py-2.5 text-sm font-semibold text-muted tap">
        Cancelar
      </button>
    </div>
  )
}

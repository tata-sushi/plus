import { useEffect, useRef } from 'react'
import { Eraser } from 'lucide-react'

// Área de assinatura: a pessoa assina com o dedo (ou mouse). É só pra dar a
// sensação de assinar um documento — o traço não é salvo; onChange avisa se já
// tem alguma assinatura desenhada (pra liberar o botão).
export function AssinaturaPad({ onChange }) {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const desenhando = useRef(false)
  const temTraco = useRef(false)

  // dimensiona o canvas (nítido em telas retina) e configura o traço
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const configurar = () => {
      const larg = canvas.clientWidth
      const alt = canvas.clientHeight
      canvas.width = larg * dpr
      canvas.height = alt * dpr
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = getComputedStyle(canvas).color || '#111'
      ctxRef.current = ctx
    }
    configurar()
    window.addEventListener('resize', configurar)
    return () => window.removeEventListener('resize', configurar)
  }, [])

  function ponto(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function iniciar(e) {
    e.preventDefault()
    desenhando.current = true
    const p = ponto(e)
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(p.x, p.y)
    canvasRef.current.setPointerCapture?.(e.pointerId)
  }
  function mover(e) {
    if (!desenhando.current) return
    const p = ponto(e)
    ctxRef.current.lineTo(p.x, p.y)
    ctxRef.current.stroke()
    if (!temTraco.current) {
      temTraco.current = true
      onChange?.(true)
    }
  }
  function parar() {
    desenhando.current = false
  }
  function limpar() {
    const canvas = canvasRef.current
    ctxRef.current?.clearRect(0, 0, canvas.width, canvas.height)
    temTraco.current = false
    onChange?.(false)
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-card border border-line bg-surface">
        <canvas
          ref={canvasRef}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={parar}
          onPointerLeave={parar}
          className="block h-36 w-full text-text"
          style={{ touchAction: 'none' }}
        />
        {/* linha e legenda "assine aqui" */}
        <div className="pointer-events-none absolute inset-x-5 bottom-7 border-b border-dashed border-line" />
        <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-muted-2">
          assine aqui
        </span>
      </div>
      <button
        type="button"
        onClick={limpar}
        className="mt-2 hstack gap-1.5 text-xs font-semibold text-muted tap"
      >
        <Eraser size={13} /> Limpar
      </button>
    </div>
  )
}

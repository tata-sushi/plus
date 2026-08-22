import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Eraser } from 'lucide-react'

// Área de assinatura: a pessoa assina com o dedo (ou mouse). O "papel" é sempre
// branco com tinta escura (fica legível nos dois temas e no PNG salvo).
// Expõe por ref: exportPNG() → Blob com fundo branco · vazio() · limpar().
// onChange(bool) avisa se já tem traço (pra liberar o botão de assinar).
export const AssinaturaPad = forwardRef(function AssinaturaPad({ onChange }, ref) {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const desenhando = useRef(false)
  const temTraco = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const configurar = () => {
      const larg = canvas.clientWidth
      const alt = canvas.clientHeight
      // preserva o traço ao redimensionar não é crítico aqui (assinatura é rápida)
      canvas.width = larg * dpr
      canvas.height = alt * dpr
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0f172a' // tinta escura fixa (independe do tema)
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

  useImperativeHandle(ref, () => ({
    vazio: () => !temTraco.current,
    limpar,
    // PNG com fundo branco (o canvas é transparente; compõe sobre branco)
    exportPNG: () =>
      new Promise((res) => {
        const src = canvasRef.current
        const tmp = document.createElement('canvas')
        tmp.width = src.width
        tmp.height = src.height
        const t = tmp.getContext('2d')
        t.fillStyle = '#ffffff'
        t.fillRect(0, 0, tmp.width, tmp.height)
        t.drawImage(src, 0, 0)
        tmp.toBlob((b) => res(b), 'image/png')
      }),
  }))

  return (
    <div>
      <div className="relative overflow-hidden rounded-card border border-line" style={{ background: '#fff' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={parar}
          onPointerLeave={parar}
          className="block h-36 w-full"
          style={{ touchAction: 'none' }}
        />
        {/* linha e legenda "assine aqui" (cinza fixo, sobre o papel branco) */}
        <div className="pointer-events-none absolute inset-x-5 bottom-7 border-b border-dashed" style={{ borderColor: '#cbd5e1' }} />
        <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px]" style={{ color: '#94a3b8' }}>
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
})

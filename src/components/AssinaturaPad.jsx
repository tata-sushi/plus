import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser, Maximize2, Check } from 'lucide-react'

// Área de assinatura: a pessoa assina com o dedo (ou mouse). O "papel" é sempre
// branco com tinta escura (fica legível nos dois temas e no PNG salvo).
// Tem modo TELA CHEIA (item horizontal): abre um pad grande que preenche a tela;
// virando o celular vira paisagem (iOS/Android). Ao concluir, o traço é copiado
// pro pad embutido — que segue sendo a fonte única do exportPNG.
// Expõe por ref: exportPNG() → Blob com fundo branco · vazio() · limpar().
// onChange(bool) avisa se já tem traço (pra liberar o botão de assinar).
export const AssinaturaPad = forwardRef(function AssinaturaPad({ onChange }, ref) {
  const canvasRef = useRef(null) // pad embutido (fonte do exportPNG)
  const fullRef = useRef(null) // pad em tela cheia
  const ctxRef = useRef(null)
  const fullCtxRef = useRef(null)
  const desenhando = useRef(false)
  const temTraco = useRef(false)
  const [cheio, setCheio] = useState(false)

  // configura um canvas (resolução real por DPR + estilo do traço) e devolve o ctx
  function configurarCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a' // tinta escura fixa (independe do tema)
    return ctx
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const configurar = () => {
      ctxRef.current = configurarCanvas(canvas)
    }
    configurar()
    window.addEventListener('resize', configurar)
    return () => window.removeEventListener('resize', configurar)
  }, [])

  // configura o pad em tela cheia quando ele abre (e ao virar o celular)
  useEffect(() => {
    if (!cheio) return
    const configurar = () => {
      if (fullRef.current) fullCtxRef.current = configurarCanvas(fullRef.current)
    }
    const id = requestAnimationFrame(configurar)
    window.addEventListener('resize', configurar)
    window.addEventListener('orientationchange', configurar)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', configurar)
      window.removeEventListener('orientationchange', configurar)
    }
  }, [cheio])

  function ponto(canvas, e) {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function iniciar(canvas, ctx, e) {
    if (!ctx) return
    e.preventDefault()
    desenhando.current = true
    const p = ponto(canvas, e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    canvas.setPointerCapture?.(e.pointerId)
  }
  function mover(canvas, ctx, e) {
    if (!desenhando.current || !ctx) return
    const p = ponto(canvas, e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (!temTraco.current) {
      temTraco.current = true
      onChange?.(true)
    }
  }
  function parar() {
    desenhando.current = false
  }

  function limpar() {
    const c = canvasRef.current
    if (c && ctxRef.current) ctxRef.current.clearRect(0, 0, c.width, c.height)
    const f = fullRef.current
    if (f && fullCtxRef.current) fullCtxRef.current.clearRect(0, 0, f.width, f.height)
    temTraco.current = false
    onChange?.(false)
  }

  // ao concluir na tela cheia: copia o traço pro pad embutido (encaixa mantendo proporção)
  function concluirCheio() {
    const src = fullRef.current
    const dst = canvasRef.current
    if (src && dst) {
      const d = dst.getContext('2d')
      d.save()
      d.setTransform(1, 0, 0, 1, 0, 0)
      d.clearRect(0, 0, dst.width, dst.height)
      const s = Math.min(dst.width / src.width, dst.height / src.height)
      const w = src.width * s
      const h = src.height * s
      d.drawImage(src, 0, 0, src.width, src.height, (dst.width - w) / 2, (dst.height - h) / 2, w, h)
      d.restore()
    }
    setCheio(false)
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
          onPointerDown={(e) => iniciar(canvasRef.current, ctxRef.current, e)}
          onPointerMove={(e) => mover(canvasRef.current, ctxRef.current, e)}
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

      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={limpar} className="hstack gap-1.5 text-xs font-semibold text-muted tap">
          <Eraser size={13} /> Limpar
        </button>
        <button type="button" onClick={() => setCheio(true)} className="hstack gap-1.5 text-xs font-semibold text-accent tap">
          <Maximize2 size={13} /> Assinar em tela cheia
        </button>
      </div>

      {/* Pad em TELA CHEIA — vire o celular pra assinar na horizontal */}
      {cheio && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#fff' }}>
          <div className="hstack items-center justify-between border-b px-4 py-2.5" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={limpar}
              className="hstack gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold"
              style={{ color: '#475569', background: '#f1f5f9' }}
            >
              <Eraser size={13} /> Limpar
            </button>
            <span className="text-[11px] font-medium" style={{ color: '#94a3b8' }}>
              Vire o celular para mais espaço
            </span>
            <button
              type="button"
              onClick={concluirCheio}
              className="hstack gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-bold text-white"
              style={{ background: '#65a30d' }}
            >
              <Check size={14} /> Pronto
            </button>
          </div>
          <div className="relative flex-1">
            <canvas
              ref={fullRef}
              onPointerDown={(e) => iniciar(fullRef.current, fullCtxRef.current, e)}
              onPointerMove={(e) => mover(fullRef.current, fullCtxRef.current, e)}
              onPointerUp={parar}
              onPointerLeave={parar}
              className="block h-full w-full"
              style={{ touchAction: 'none' }}
            />
            <div className="pointer-events-none absolute inset-x-10 bottom-14 border-b border-dashed" style={{ borderColor: '#cbd5e1' }} />
            <span className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs" style={{ color: '#94a3b8' }}>
              assine aqui
            </span>
          </div>
        </div>
      )}
    </div>
  )
})

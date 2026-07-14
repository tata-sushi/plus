import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Enquadrador quadrado (1:1): arrastar (1 dedo) + zoom por pinça (2 dedos).
// Exporta o recorte visível via canvas (getBlob) — JPEG OUTxOUT.
const OUT = 1080
const ZOOM_MAX = 4

export const PhotoCropper = forwardRef(function PhotoCropper({ src }, ref) {
  const viewportRef = useRef(null)
  const imgRef = useRef(null)
  const pointers = useRef(new Map()) // pointerId -> {x,y}
  const gesture = useRef(null) // baseline do gesto atual
  const [S, setS] = useState(0) // lado do viewport (px)
  const [nat, setNat] = useState(null) // dimensões naturais {w,h}
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // pan (px do viewport)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const medir = () => setS(el.clientWidth)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setNat(null)
    setZoom(1)
    setPos({ x: 0, y: 0 })
  }, [src])

  const baseScale = nat && S ? S / Math.min(nat.w, nat.h) : 1
  const f = baseScale * zoom
  const dispW = nat ? nat.w * f : 0
  const dispH = nat ? nat.h * f : 0
  const clamp = (v, m) => Math.max(-m, Math.min(m, v))
  const clampZoom = (z) => Math.max(1, Math.min(ZOOM_MAX, z))
  // limites de pan para um zoom qualquer
  const bounds = (z) => {
    if (!nat) return { mx: 0, my: 0 }
    const fz = baseScale * z
    return { mx: Math.max(0, (nat.w * fz - S) / 2), my: Math.max(0, (nat.h * fz - S) / 2) }
  }
  const { mx: maxX, my: maxY } = bounds(zoom)

  // re-clampa o pan quando zoom/tamanho muda
  useEffect(() => {
    setPos((p) => ({ x: clamp(p.x, maxX), y: clamp(p.y, maxY) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, S, nat])

  const pts = () => [...pointers.current.values()]
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

  function baseline() {
    const p = pts()
    if (p.length === 1) {
      gesture.current = { mode: 'pan', ox: p[0].x, oy: p[0].y, pos: { ...pos } }
    } else if (p.length >= 2) {
      gesture.current = {
        mode: 'pinch',
        d0: dist(p[0], p[1]),
        m0: mid(p[0], p[1]),
        z0: zoom,
        pos: { ...pos },
      }
    } else {
      gesture.current = null
    }
  }

  function down(e) {
    if (!nat) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    baseline()
  }
  function move(e) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    const p = pts()
    if (g.mode === 'pan' && p.length === 1) {
      const { mx, my } = bounds(zoom)
      setPos({ x: clamp(g.pos.x + (p[0].x - g.ox), mx), y: clamp(g.pos.y + (p[0].y - g.oy), my) })
    } else if (g.mode === 'pinch' && p.length >= 2) {
      const nz = clampZoom(g.z0 * (dist(p[0], p[1]) / g.d0))
      const m = mid(p[0], p[1])
      const { mx, my } = bounds(nz)
      setZoom(nz)
      setPos({
        x: clamp(g.pos.x + (m.x - g.m0.x), mx),
        y: clamp(g.pos.y + (m.y - g.m0.y), my),
      })
    }
  }
  function up(e) {
    pointers.current.delete(e.pointerId)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    baseline() // re-baseia com os dedos restantes (ou limpa)
  }

  useImperativeHandle(ref, () => ({
    async getBlob() {
      const img = imgRef.current
      if (!img || !nat || !S) return null
      const cropSide = Math.min(nat.w, nat.h) / zoom
      let sx = nat.w / 2 - pos.x / f - cropSide / 2
      let sy = nat.h / 2 - pos.y / f - cropSide / 2
      sx = Math.max(0, Math.min(nat.w - cropSide, sx))
      sy = Math.max(0, Math.min(nat.h - cropSide, sy))
      const canvas = document.createElement('canvas')
      canvas.width = OUT
      canvas.height = OUT
      canvas.getContext('2d').drawImage(img, sx, sy, cropSide, cropSide, 0, 0, OUT, OUT)
      return await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.9))
    },
  }))

  return (
    <div>
      <div
        ref={viewportRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative aspect-square w-full cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-surface-2 active:cursor-grabbing"
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: dispW ? `${dispW}px` : '100%',
            height: dispH ? `${dispH}px` : 'auto',
            maxWidth: 'none',
            transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
          }}
        />
      </div>
      {nat && (
        <div className="mt-1.5 text-center text-[11px] text-muted-2">
          Arraste pra reposicionar · pinça pra dar zoom
        </div>
      )}
    </div>
  )
})

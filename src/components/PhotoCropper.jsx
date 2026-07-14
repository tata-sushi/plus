import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Enquadrador quadrado (1:1): arrasta pra reposicionar + zoom.
// Exporta o recorte visível via canvas (getBlob) — JPEG OUTxOUT.
const OUT = 1080

export const PhotoCropper = forwardRef(function PhotoCropper({ src }, ref) {
  const viewportRef = useRef(null)
  const imgRef = useRef(null)
  const drag = useRef(null)
  const [S, setS] = useState(0) // lado do viewport (px)
  const [nat, setNat] = useState(null) // dimensões naturais {w,h}
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // pan (px do viewport)

  // mede o viewport (é quadrado)
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const medir = () => setS(el.clientWidth)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // reset ao trocar de imagem
  useEffect(() => {
    setNat(null)
    setZoom(1)
    setPos({ x: 0, y: 0 })
  }, [src])

  const baseScale = nat && S ? S / Math.min(nat.w, nat.h) : 1
  const f = baseScale * zoom
  const dispW = nat ? nat.w * f : 0
  const dispH = nat ? nat.h * f : 0
  const maxX = Math.max(0, (dispW - S) / 2)
  const maxY = Math.max(0, (dispH - S) / 2)
  const clamp = (v, m) => Math.max(-m, Math.min(m, v))

  // re-clampa o pan quando zoom/tamanho muda
  useEffect(() => {
    setPos((p) => ({ x: clamp(p.x, maxX), y: clamp(p.y, maxY) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, S, nat])

  function onLoad(e) {
    setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight })
  }
  function down(e) {
    if (!nat) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, ...pos }
  }
  function move(e) {
    if (!drag.current) return
    setPos({
      x: clamp(drag.current.x + (e.clientX - drag.current.px), maxX),
      y: clamp(drag.current.y + (e.clientY - drag.current.py), maxY),
    })
  }
  function up(e) {
    if (drag.current) e.currentTarget.releasePointerCapture?.(e.pointerId)
    drag.current = null
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
          onLoad={onLoad}
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
        <div className="mt-2 hstack gap-2">
          <span className="text-[11px] text-muted-2">Arraste e use o zoom pra enquadrar</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="ml-auto w-32 accent-accent"
            aria-label="Zoom da foto"
          />
        </div>
      )}
    </div>
  )
})

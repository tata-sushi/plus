import { useEffect, useRef, useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

// Renderiza o PDF como páginas (canvas) direto na tela — abre automático,
// rola e lê dentro do app, sem clique/download. pdfjs carregado sob demanda.
export function PdfViewer({ src }) {
  const paginasRef = useRef(null)
  const [estado, setEstado] = useState('carregando') // 'carregando' | 'ok' | 'erro'

  useEffect(() => {
    let cancelado = false
    const alvo = paginasRef.current
    if (!alvo || !src) return
    alvo.innerHTML = ''
    setEstado('carregando')

    async function renderizar() {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = (
          await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        ).default
        const pdf = await pdfjs.getDocument({ url: src }).promise
        if (cancelado) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const largura = alvo.clientWidth || 360
        for (let n = 1; n <= pdf.numPages; n++) {
          if (cancelado) return
          const page = await pdf.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (largura / base.width) * dpr })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          canvas.className = 'mb-2 rounded-lg bg-white shadow-sm'
          alvo.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          if (n === 1 && !cancelado) setEstado('ok') // mostra assim que a 1ª página sai
        }
      } catch {
        if (!cancelado) setEstado('erro')
      }
    }
    renderizar()
    return () => {
      cancelado = true
    }
  }, [src])

  if (estado === 'erro') {
    return (
      <div className="grid flex-1 place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-muted">Não deu pra exibir o PDF aqui.</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-3 inline-flex !py-2 text-xs"
          >
            <ExternalLink size={14} /> Abrir o PDF
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div ref={paginasRef} className="flex-1 overflow-y-auto bg-surface-2 px-3 py-3" />
      {estado === 'carregando' && (
        <div className="absolute inset-0 grid place-items-center bg-surface-2/70 backdrop-blur-sm">
          <div className="hstack gap-2 text-xs text-muted-2">
            <Loader2 size={18} className="animate-spin" /> Carregando PDF…
          </div>
        </div>
      )}
    </div>
  )
}

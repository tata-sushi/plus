import { useEffect, useRef, useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

// Renderiza o PDF como páginas (canvas) direto na tela — abre automático,
// rola e lê dentro do app, sem clique/download. pdfjs carregado sob demanda.
// onLido() é chamado quando o usuário rola até o fim (ou se o PDF couber sem rolar).
// inline=true: renderiza as páginas no próprio fluxo (sem rolagem/altura própria),
// pra encaixar dentro de um desafio com texto e vídeo — quem rola é o container de fora.
export function PdfViewer({ src, onLido, inline = false }) {
  const paginasRef = useRef(null)
  const prontoRef = useRef(false) // só libera o "fim da rolagem" depois de renderizar tudo
  const [estado, setEstado] = useState('carregando') // 'carregando' | 'ok' | 'erro'

  useEffect(() => {
    let cancelado = false
    prontoRef.current = false
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
        if (cancelado) return
        prontoRef.current = true
        // se o PDF couber sem rolar, já conta como lido
        if (alvo.scrollHeight <= alvo.clientHeight + 4) onLido?.()
      } catch {
        if (!cancelado) {
          setEstado('erro')
          onLido?.() // falhou o embed: libera concluir (lê pelo "Abrir o PDF")
        }
      }
    }
    renderizar()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  function aoRolar(e) {
    if (!prontoRef.current) return
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) onLido?.()
  }

  if (estado === 'erro') {
    const link = (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-3 inline-flex !py-2 text-xs"
      >
        <ExternalLink size={14} /> Abrir o PDF
      </a>
    )
    if (inline) {
      return (
        <div className="rounded-card border border-line bg-surface px-4 py-5 text-center">
          <p className="text-sm text-muted">Não deu pra exibir o PDF aqui.</p>
          {link}
        </div>
      )
    }
    return (
      <div className="grid flex-1 place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-muted">Não deu pra exibir o PDF aqui.</p>
          {link}
        </div>
      </div>
    )
  }

  // Inline: as páginas entram no fluxo do desafio; a rolagem é do container de fora.
  if (inline) {
    return (
      <div className="relative">
        <div ref={paginasRef} className="rounded-card bg-surface-2 px-3 py-3" />
        {estado === 'carregando' && (
          <div className="hstack justify-center gap-2 py-8 text-xs text-muted-2">
            <Loader2 size={18} className="animate-spin" /> Carregando PDF…
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        ref={paginasRef}
        onScroll={aoRolar}
        className="flex-1 overflow-y-auto bg-surface-2 px-3 py-3"
      />
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

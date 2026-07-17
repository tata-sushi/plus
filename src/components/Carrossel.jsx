import { useEffect, useRef, useState } from 'react'
import { DestaqueBanner } from './DestaqueBanner.jsx'

// Carrossel automático da seção "Notícias": mostra vários destaques
// (aniversário, comunicados, avisos…) em slides de largura total, com
// auto-avanço a cada 5s, arrasto nativo (scroll-snap) e bolinhas embaixo.
// Pausa o auto-avanço enquanto o dedo está na tela.
export function Carrossel({ itens }) {
  const trilhaRef = useRef(null)
  const [idx, setIdx] = useState(0)
  const pausado = useRef(false)
  const n = itens.length

  useEffect(() => {
    if (n <= 1) return
    const t = setInterval(() => {
      const trilha = trilhaRef.current
      if (!trilha || pausado.current) return
      const atual = Math.round(trilha.scrollLeft / trilha.clientWidth)
      const prox = (atual + 1) % n
      trilha.scrollTo({ left: prox * trilha.clientWidth, behavior: 'smooth' })
    }, 5000)
    return () => clearInterval(t)
  }, [n])

  function aoRolar() {
    const trilha = trilhaRef.current
    if (!trilha) return
    setIdx(Math.round(trilha.scrollLeft / trilha.clientWidth))
  }

  if (!n) return null
  if (n === 1) return <DestaqueBanner d={itens[0]} />

  return (
    <div>
      <div
        ref={trilhaRef}
        onScroll={aoRolar}
        onPointerDown={() => (pausado.current = true)}
        onPointerUp={() => (pausado.current = false)}
        onPointerCancel={() => (pausado.current = false)}
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
      >
        {itens.map((d) => (
          <div key={d.chave} className="w-full shrink-0 snap-start">
            <DestaqueBanner d={d} />
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-center gap-1.5">
        {itens.map((d, i) => (
          <span
            key={d.chave}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-4 bg-accent' : 'w-1.5 bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

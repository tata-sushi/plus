import { useEffect, useState } from 'react'

// Decoração de Halloween (aranha no fio + morcegos + teia), sobreposta na Home.
// Só aparece quando o tema ativo é 'halloween'. Não bloqueia toque (CSS .hw-deco
// usa pointer-events:none) e respeita "reduzir movimento". Reage à troca de tema
// na hora, via o evento 'tp-theme' (emitido pelo applyTheme) e um observer do
// atributo data-theme (fallback).
const ehHalloween = () => {
  try {
    return document.documentElement.getAttribute('data-theme') === 'halloween'
  } catch {
    return false
  }
}

const BAT = (
  <svg viewBox="0 0 48 32" fill="currentColor">
    <path d="M24 7c2-4 5-6 5-2 3-3 7-4 6 0 2-1 4 0 3 2 5 1 5 6 9 5-3 3-7 2-9 6-2-3-4-4-5-7-1 3-2 5-5 6 0-3 1-6-4-6 4 1 4-4 6-5-1-2 1-3 3-2-1-4 3-3 6 0 0-4 3-2 5 2z" />
  </svg>
)

export function HalloweenDecor() {
  const [on, setOn] = useState(ehHalloween)

  useEffect(() => {
    const atualizar = () => setOn(ehHalloween())
    window.addEventListener('tp-theme', atualizar)
    const obs = new MutationObserver(atualizar)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('tp-theme', atualizar)
      obs.disconnect()
    }
  }, [])

  if (!on) return null

  return (
    <div className="hw-deco" aria-hidden="true">
      {/* teia no canto */}
      <svg className="hw-web" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.1">
        <path d="M0 0 L100 100 M0 0 L70 0 M0 0 L0 70 M0 0 L52 14 M0 0 L14 52 M0 0 L30 8 M0 0 L8 30" />
        <path d="M18 0 Q4 14 0 18 M40 0 Q10 30 0 40 M62 0 Q14 48 0 62" />
      </svg>

      {/* aranha descendo no fio (perto do Menu do dia) */}
      <div className="hw-spider-wrap">
        <div className="hw-thread" />
        <svg className="hw-spider" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M24 26 C14 22 10 26 7 22 M24 28 C13 28 9 33 6 31 M24 30 C14 34 11 39 8 39 M24 31 C18 38 18 42 16 44" />
          <path d="M24 26 C34 22 38 26 41 22 M24 28 C35 28 39 33 42 31 M24 30 C34 34 37 39 40 39 M24 31 C30 38 30 42 32 44" />
          <circle cx="24" cy="21" r="4.2" fill="currentColor" stroke="none" />
          <ellipse cx="24" cy="29" rx="6" ry="7.5" fill="currentColor" stroke="none" />
          <circle cx="22.4" cy="20.5" r="1" fill="#F2792B" stroke="none" />
          <circle cx="25.6" cy="20.5" r="1" fill="#F2792B" stroke="none" />
        </svg>
      </div>

      {/* morcegos voando perto do card de identificação */}
      <div className="hw-bat hw-b1">{BAT}</div>
      <div className="hw-bat hw-b2">{BAT}</div>
      <div className="hw-bat hw-b3">{BAT}</div>
    </div>
  )
}

export default HalloweenDecor

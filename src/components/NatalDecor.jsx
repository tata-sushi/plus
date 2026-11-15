import { useEffect, useMemo, useState } from 'react'

// Decoração de Natal — por enquanto só NEVE (sutil, não atrapalha o layout).
// A guirlanda de luzes foi retirada (conflitava com o card de identificação);
// o enfeite principal (Papai Noel / rena / árvore) será definido depois.
// Só aparece no tema 'natal'. Não bloqueia toque (.nt-deco usa pointer-events
// :none) e respeita "reduzir movimento". Reage à troca de tema na hora via o
// evento 'tp-theme' e um observer do data-theme (fallback).
const ehNatal = () => {
  try {
    return document.documentElement.getAttribute('data-theme') === 'natal'
  } catch {
    return false
  }
}

export function NatalDecor() {
  const [on, setOn] = useState(ehNatal)

  useEffect(() => {
    const atualizar = () => setOn(ehNatal())
    window.addEventListener('tp-theme', atualizar)
    const obs = new MutationObserver(atualizar)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('tp-theme', atualizar)
      obs.disconnect()
    }
  }, [])

  const neve = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        left: Math.random() * 100,
        size: 7 + Math.random() * 9,
        op: 0.4 + Math.random() * 0.55,
        drift: Math.round(Math.random() * 44 - 22),
        dur: 6 + Math.random() * 7,
        delay: -Math.random() * 12,
      })),
    [],
  )

  if (!on) return null

  return (
    <div className="nt-deco" aria-hidden="true">
      {neve.map((f, i) => (
        <div
          key={i}
          className="nt-flake"
          style={{
            left: f.left + '%',
            fontSize: f.size + 'px',
            opacity: f.op,
            '--drift': f.drift + 'px',
            animationDuration: f.dur.toFixed(1) + 's',
            animationDelay: f.delay.toFixed(1) + 's',
          }}
        />
      ))}
    </div>
  )
}

export default NatalDecor

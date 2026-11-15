import { useEffect, useMemo, useState } from 'react'

// Decoração de Natal (pisca-pisca + bolas no fio + neve + estrela), sobreposta
// na Home. Só aparece quando o tema ativo é 'natal' (em teste, liberado só pra
// matrícula 7 via o toggle nos Ajustes). Não bloqueia toque (.nt-deco usa
// pointer-events:none) e respeita "reduzir movimento". Reage à troca de tema na
// hora via o evento 'tp-theme' (emitido pelo applyTheme) e um observer do
// atributo data-theme (fallback).
const ehNatal = () => {
  try {
    return document.documentElement.getAttribute('data-theme') === 'natal'
  } catch {
    return false
  }
}

const CORES_LUZ = ['#e04e4a', '#e7ba68', '#49b36f', '#6db4e8', '#e7ba68']

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

  // Parâmetros calculados uma vez (estáveis entre renders).
  const luzes = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        left: 4 + i * 9.1,
        top: i % 2 === 0 ? 13 : 9,
        cor: CORES_LUZ[i % CORES_LUZ.length],
        delay: (i * 0.19).toFixed(2),
      })),
    [],
  )
  const bolas = useMemo(
    () => [
      { left: 22, h: 30, cor: '#e04e4a', dur: 3.4, delay: 0 },
      { left: 66, h: 46, cor: '#e7ba68', dur: 3.9, delay: 0.5 },
      { left: 86, h: 24, cor: '#49b36f', dur: 3.6, delay: 1 },
    ],
    [],
  )
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
      {/* estrela */}
      <svg className="nt-star" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 6.3L21 9l-5 4.2L17.6 20 12 16.3 6.4 20 8 13.2 3 9l6.6-.7z" />
      </svg>

      {/* pisca-pisca no topo */}
      <div className="nt-lights">
        <svg viewBox="0 0 380 18" preserveAspectRatio="none">
          <path className="nt-wire" d="M0 4 Q 47 18 95 5 T 190 5 T 285 5 T 380 5" />
        </svg>
        {luzes.map((l, i) => (
          <span
            key={i}
            className="nt-bulb"
            style={{ left: l.left + '%', top: l.top + 'px', background: l.cor, color: l.cor, animationDelay: l.delay + 's' }}
          />
        ))}
      </div>

      {/* bolas de natal penduradas no fio */}
      {bolas.map((b, i) => (
        <div
          key={i}
          className="nt-orn"
          style={{ left: b.left + '%', animationDuration: b.dur + 's', animationDelay: b.delay + 's' }}
        >
          <div className="nt-thread" style={{ height: b.h + 'px' }} />
          <div className="nt-ball" style={{ background: `radial-gradient(circle at 34% 30%, ${b.cor}, rgba(0,0,0,.28) 150%)` }}>
            <span className="nt-cap" />
          </div>
        </div>
      ))}

      {/* neve */}
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

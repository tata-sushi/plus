import { useEffect, useMemo, useState } from 'react'

// Decoração de Natal: enfeites (árvore, presente, meia) nas bordas + efeitos
// ambiente escolhidos (brilhos, estrela cadente, poeira dourada, vaga-lumes).
// Só aparece no tema 'natal'. Camada fixa, pointer-events:none, respeita
// "reduzir movimento". Reage à troca de tema via 'tp-theme' e observer.
const ehNatal = () => {
  try {
    return document.documentElement.getAttribute('data-theme') === 'natal'
  } catch {
    return false
  }
}

const SVGS = {
  arvore: (
    <>
      <rect x="44" y="79" width="12" height="12" rx="2" fill="#7a4a24" />
      <path d="M50 12 L69 39 L31 39Z" fill="#2f8f4e" />
      <path d="M50 29 L76 59 L24 59Z" fill="#38a65c" />
      <path d="M50 47 L83 81 L17 81Z" fill="#2f8f4e" />
      <path d="M50 5 l2.6 6.4 6.9 .5 -5.2 4.5 1.6 6.7 -5.9-3.6 -5.9 3.6 1.6-6.7 -5.2-4.5 6.9-.5Z" fill="#e7ba68" />
      <circle cx="45" cy="34" r="3" fill="#e23b3b" />
      <circle cx="58" cy="52" r="3" fill="#e7ba68" />
      <circle cx="39" cy="55" r="3" fill="#6db4e8" />
      <circle cx="62" cy="75" r="3" fill="#e23b3b" />
      <circle cx="41" cy="75" r="3" fill="#e7ba68" />
      <circle cx="54" cy="70" r="3" fill="#6db4e8" />
    </>
  ),
  presente: (
    <>
      <rect x="24" y="46" width="52" height="40" rx="3" fill="#2f8f4e" />
      <rect x="24" y="46" width="52" height="12" fill="#38a65c" />
      <rect x="45" y="46" width="10" height="40" fill="#e7ba68" />
      <path d="M50 46 Q37 31 29 40 Q27 49 50 46Z" fill="#e23b3b" />
      <path d="M50 46 Q63 31 71 40 Q73 49 50 46Z" fill="#e23b3b" />
      <circle cx="50" cy="45" r="4.5" fill="#c22f2f" />
    </>
  ),
  meia: (
    <>
      <path d="M40 24 L62 24 L62 54 Q62 60 70 64 L78 70 Q84 74 80 82 Q76 88 68 84 L50 74 Q40 68 40 54Z" fill="#e23b3b" />
      <rect x="36" y="18" width="30" height="12" rx="4" fill="#fff" />
      <path d="M40 60 Q52 66 62 60 L62 66 Q52 72 40 66Z" fill="#fff" opacity=".9" />
      <circle cx="70" cy="78" r="3" fill="#e7ba68" />
    </>
  ),
}

const ENFEITES = [
  { tipo: 'arvore', pos: { left: '2px', bottom: '60px' }, size: 58, op: 0.9, rot: 0, dur: 6.5, delay: 0 },
  { tipo: 'presente', pos: { right: '4px', bottom: '64px' }, size: 46, op: 0.9, rot: 0, dur: 7.5, delay: 0.6 },
  { tipo: 'meia', pos: { right: '-14px', top: '24%' }, size: 44, op: 0.8, rot: 10, dur: 6, delay: 0.3 },
  { tipo: 'arvore', pos: { left: '-16px', top: '46%' }, size: 44, op: 0.5, rot: 0, dur: 8, delay: 1.1 },
  { tipo: 'presente', pos: { right: '-12px', top: '54%' }, size: 36, op: 0.5, rot: -6, dur: 7, delay: 0.9 },
  { tipo: 'meia', pos: { left: '-12px', top: '34%' }, size: 34, op: 0.52, rot: -12, dur: 6.5, delay: 1.4 },
]

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

  // Brilhos (sparkles)
  const brilhos = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 10 + Math.random() * 12,
        dur: 2.4 + Math.random() * 2,
        delay: Math.random() * 3,
      })),
    [],
  )
  // Estrela cadente
  const estrelas = useMemo(
    () => [
      { top: '7%', left: Math.random() * 25, delay: 8, dur: 8 },
      { top: '22%', left: Math.random() * 25, delay: 0, dur: 9 },
      { top: '40%', left: Math.random() * 25, delay: 4, dur: 10 },
    ],
    [],
  )
  // Poeira dourada
  const poeira = useMemo(
    () =>
      Array.from({ length: 30 }, () => ({
        left: Math.random() * 100,
        op: 0.4 + Math.random() * 0.5,
        dx: Math.round(Math.random() * 40 - 20),
        dur: 7 + Math.random() * 7,
        delay: -Math.random() * 12,
        size: 2 + Math.random() * 3,
      })),
    [],
  )
  // Vaga-lumes
  const vagalumes = useMemo(
    () =>
      Array.from({ length: 20 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        fx: Math.round(Math.random() * 60 - 30),
        fy: Math.round(Math.random() * 60 - 30),
        dur: 5 + Math.random() * 5,
        delay: -Math.random() * 6,
      })),
    [],
  )

  if (!on) return null

  return (
    <div className="nt-deco" aria-hidden="true">
      {ENFEITES.map((e, i) => (
        <div
          key={'e' + i}
          className="nt-enfeite"
          style={{ ...e.pos, opacity: e.op, animationDuration: e.dur + 's', animationDelay: e.delay + 's' }}
        >
          <svg
            viewBox="0 0 100 100"
            width={e.size}
            height={e.size}
            style={{ display: 'block', transform: `rotate(${e.rot}deg)`, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.35))' }}
          >
            {SVGS[e.tipo]}
          </svg>
        </div>
      ))}

      {brilhos.map((b, i) => (
        <div
          key={'b' + i}
          className="nt-spark"
          style={{ left: b.left + '%', top: b.top + '%', fontSize: b.size + 'px', animationDuration: b.dur.toFixed(2) + 's', animationDelay: b.delay.toFixed(2) + 's' }}
        />
      ))}

      {estrelas.map((s, i) => (
        <div
          key={'s' + i}
          className="nt-shoot"
          style={{ top: s.top, left: s.left + '%', animationDuration: s.dur + 's', animationDelay: s.delay + 's' }}
        />
      ))}

      {poeira.map((d, i) => (
        <div
          key={'d' + i}
          className="nt-dust"
          style={{ left: d.left + '%', width: d.size.toFixed(1) + 'px', height: d.size.toFixed(1) + 'px', opacity: d.op, '--dx': d.dx + 'px', animationDuration: d.dur.toFixed(1) + 's', animationDelay: d.delay.toFixed(1) + 's' }}
        />
      ))}

      {vagalumes.map((f, i) => (
        <div
          key={'f' + i}
          className="nt-fire"
          style={{ left: f.left + '%', top: f.top + '%', '--fx': f.fx + 'px', '--fy': f.fy + 'px', animationDuration: f.dur.toFixed(1) + 's', animationDelay: f.delay.toFixed(1) + 's' }}
        />
      ))}
    </div>
  )
}

export default NatalDecor

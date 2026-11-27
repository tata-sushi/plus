import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trophy, RefreshCw, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Roleta do Sorteio TATÁ: overlay que gira os nomes dos elegíveis (de verdade)
// desacelerando até travar no ganhador, com confete no reveal. O sorteio é
// decidido no servidor (confra_sortear) assim que abre; a animação só revela.

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}

const CORES = ['#e7ba68', '#e23b3b', '#38a65c', '#6db4e8', '#f59e0b', '#ffffff']

function Avatar({ url, nome, size = 72 }) {
  const ini = (nome || '?').trim().charAt(0).toUpperCase()
  if (url) return <img src={url} alt="" className="mx-auto rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <span
      className="mx-auto grid place-items-center rounded-full bg-accent-soft text-2xl font-bold text-accent"
      style={{ width: size, height: size }}
    >
      {ini}
    </span>
  )
}

export function SorteioRoleta({ premio, onClose }) {
  const [fase, setFase] = useState('girando') // 'girando' | 'revelado'
  const [display, setDisplay] = useState('')
  const [ganhador, setGanhador] = useState(null)
  const [rodada, setRodada] = useState(0)
  const timer = useRef(null)

  const confetes = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        cor: CORES[i % CORES.length],
        delay: (Math.random() * 0.35).toFixed(2),
        dur: (1.3 + Math.random() * 0.7).toFixed(2),
      })),
    [rodada],
  )

  useEffect(() => {
    let alive = true
    setFase('girando')
    setGanhador(null)
    async function run() {
      try {
        const [pool, res] = await Promise.all([
          call('confra_sorteio_elegiveis', { p_categoria: premio.categoria }),
          call('confra_sortear', { p_premio: premio.id }),
        ])
        if (!alive) return
        const nomes = Array.isArray(pool) && pool.length ? pool.map((x) => x.nome) : [res.nome]
        setGanhador(res)
        let delay = 55
        let elapsed = 0
        const tick = () => {
          if (!alive) return
          setDisplay(nomes[Math.floor(Math.random() * nomes.length)])
          elapsed += delay
          if (elapsed > 1700) delay += 24 // desacelera
          if (delay >= 300) {
            setDisplay(res.nome)
            setFase('revelado')
            tapHaptic()
            return
          }
          timer.current = setTimeout(tick, delay)
        }
        tick()
      } catch (e) {
        if (alive) {
          // eslint-disable-next-line no-alert
          window.alert(e?.message || 'Não foi possível sortear.')
          onClose?.()
        }
      }
    }
    run()
    return () => {
      alive = false
      clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodada])

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-5"
      style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
      onClick={fase === 'revelado' ? onClose : undefined}
    >
      <div className="card relative w-full max-w-sm overflow-hidden p-5 text-center" onClick={(e) => e.stopPropagation()}>
        {/* confete */}
        {fase === 'revelado' &&
          confetes.map((c, i) => (
            <span
              key={i}
              className="sorteio-confete"
              style={{ left: c.left + '%', background: c.cor, animationDelay: c.delay + 's', animationDuration: c.dur + 's' }}
            />
          ))}

        {/* prêmio */}
        <div className="mx-auto mb-2 grid h-20 w-20 place-items-center overflow-hidden rounded-card bg-white">
          {premio.foto && <img src={premio.foto} alt="" className="h-full w-full object-contain" />}
        </div>
        <div className="font-display text-sm font-bold leading-tight">{premio.nome}</div>
        {premio.categoria_nome && <div className="text-[12px] text-muted">{premio.categoria_nome}</div>}

        {/* roleta / reveal */}
        <div className="mt-4 grid min-h-[132px] place-items-center rounded-card bg-surface-2 px-3 py-4">
          {fase === 'girando' ? (
            <div>
              <Loader2 className="mx-auto mb-2 animate-spin text-accent" size={20} />
              <div className="sorteio-girando truncate text-lg font-extrabold text-text">{display || 'Sorteando…'}</div>
            </div>
          ) : (
            <div className="reveal">
              <Avatar url={ganhador?.avatar_url} nome={ganhador?.nome} />
              <div className="mt-2 hstack justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                <Trophy size={13} /> Ganhador
              </div>
              <div className="text-xl font-extrabold leading-tight text-text">{ganhador?.nome}</div>
              <div className="mt-0.5 text-lg">🎉</div>
            </div>
          )}
        </div>

        {/* ações */}
        {fase === 'revelado' && (
          <div className="mt-4 hstack gap-2">
            <button
              onClick={() => setRodada((r) => r + 1)}
              className="hstack shrink-0 items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-2.5 text-sm font-semibold tap"
            >
              <RefreshCw size={15} /> De novo
            </button>
            <button onClick={onClose} className="btn-primary flex-1">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default SorteioRoleta

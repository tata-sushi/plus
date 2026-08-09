import { X } from 'lucide-react'
import { useRadioPlayer } from '../lib/RadioPlayer.jsx'
import { cn } from '../lib/cn'

// Mini-player persistente da Rádio Tatá. Montado no shell (fora das rotas), então
// a música continua tocando ao navegar. variant:
//  - 'float'   → barra flutuante (mobile), acima da barra de navegação
//  - 'sidebar' → encaixada na base da barra lateral (desktop)
export function RadioPlayerBar({ variant = 'float' }) {
  const { faixa, fechar } = useRadioPlayer()
  if (!faixa) return null
  return (
    <div
      className={cn(
        'z-40',
        variant === 'sidebar'
          ? 'fixed bottom-3 left-[68px] w-[300px] lg:w-[360px]'
          : 'fixed inset-x-2 bottom-[calc(68px+env(safe-area-inset-bottom))]',
      )}
    >
      <div className="relative rounded-2xl border border-line bg-surface p-1.5 shadow-glow">
        <iframe
          title="Rádio Tatá"
          src={`https://open.spotify.com/embed/track/${faixa.trackId}?utm_source=tata_plus`}
          width="100%"
          height="80"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="block rounded-xl"
          style={{ border: 0 }}
        />
        <button
          onClick={fechar}
          aria-label="Fechar player"
          className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-carbon text-white shadow tap"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

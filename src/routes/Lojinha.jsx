import { useEffect, useState } from 'react'
import { Header } from '../components/Header.jsx'
import { PainelRecompensas } from '../components/PainelRecompensas.jsx'
import { PainelLoja } from '../components/PainelLoja.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

const ABAS = [
  { id: 'recompensas', label: 'Recompensas' },
  { id: 'loja', label: 'Loja' },
]

// Hub "Lojinha": junta Recompensas (troca por pontos) e Loja (compra com
// desconto em folha) numa página só, separadas por abas. As rotas antigas
// continuam: /recompensas abre na aba Recompensas, /lojinha na aba Loja.
export function Lojinha({ abaInicial = 'recompensas' }) {
  const [aba, setAba] = useState(abaInicial)
  // Deep-link: entrar por /recompensas ou /lojinha leva à aba certa mesmo que
  // o componente seja reaproveitado ao navegar entre as duas rotas.
  useEffect(() => {
    setAba(abaInicial)
  }, [abaInicial])

  return (
    <>
      <Header title="Lojinha" />

      {/* Abas: Recompensas · Loja */}
      <div className="px-5 pt-3">
        <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-2 p-1">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                tapHaptic()
                setAba(a.id)
              }}
              className={cn(
                'rounded-full py-2 text-sm font-semibold transition-colors tap',
                aba === a.id ? 'bg-accent text-black shadow-sm' : 'text-muted',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {aba === 'loja' ? <PainelLoja /> : <PainelRecompensas />}
    </>
  )
}

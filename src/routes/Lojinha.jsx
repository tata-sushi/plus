import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'
import { PainelRecompensas } from '../components/PainelRecompensas.jsx'
import { PainelLoja } from '../components/PainelLoja.jsx'
import { PainelJornada } from '../components/PainelJornada.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

const ABAS = [
  { id: 'recompensas', label: 'Recompensas' },
  { id: 'loja', label: 'Compras' },
  { id: 'jornada', label: 'Jornada' },
]

// Hub "Lojinha": junta Recompensas (troca por pontos) e Loja (compra com
// desconto em folha) numa página só, separadas por abas. As rotas antigas
// continuam: /recompensas abre na aba Recompensas, /lojinha na aba Loja.
export function Lojinha({ abaInicial = 'recompensas' }) {
  const { usuario } = useAuth()
  const [aba, setAba] = useState(abaInicial)
  // Deep-link: entrar por /recompensas ou /lojinha leva à aba certa mesmo que
  // o componente seja reaproveitado ao navegar entre as duas rotas.
  useEffect(() => {
    setAba(abaInicial)
  }, [abaInicial])

  // Lojinha bloqueada durante os testes: só quem está liberado (podeLojinha)
  // entra; o resto é mandado pra Home. null = ainda verificando o acesso.
  if (!usuario || usuario.perfilPendente || usuario.podeLojinha == null) {
    return <div className="grid place-items-center py-24 text-muted-2"><Loader2 size={22} className="animate-spin" /></div>
  }
  if (!usuario.podeLojinha) return <Navigate to="/" replace />

  return (
    <>
      <Header />
      <CabecalhoPagina titulo="Lojinha" descricao="Recompensas e Comprinhas." />

      {/* Abas: Recompensas · Loja */}
      <div className="px-5 pt-3">
        <div className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface-2 p-1">
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

      {aba === 'loja' ? <PainelLoja /> : aba === 'jornada' ? <PainelJornada /> : <PainelRecompensas />}
    </>
  )
}

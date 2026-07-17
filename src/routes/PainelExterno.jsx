import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { governancaCatalogo } from '../lib/mockData.js'
import { tapHaptic } from '../lib/haptics.js'

// Visualizador in-app das páginas de líderes (KPIs) — mesmo padrão da Governança
// (iframe de tela cheia, sem barra de endereço). O id vem do catálogo de atalhos.
export function PainelExterno() {
  const { id } = useParams()
  const navigate = useNavigate()
  const item = governancaCatalogo.find((c) => c.id === id)
  if (!item?.url) return <Navigate to="/" replace />

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <div className="safe-top shrink-0 bg-bg" />
      <div className="hstack items-center gap-2 bg-bg px-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="hstack gap-1 text-sm text-muted tap"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold">
          {item.label}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={tapHaptic}
          className="hstack gap-1 text-xs text-muted tap"
          aria-label="Abrir em nova aba"
        >
          <ExternalLink size={16} />
        </a>
      </div>
      <iframe
        src={item.url}
        title={item.label}
        className="w-full flex-1 border-0 bg-white"
        allow="clipboard-write; camera; microphone; geolocation"
      />
    </div>
  )
}

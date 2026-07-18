import { useParams, Navigate } from 'react-router-dom'
import { governancaCatalogo } from '../lib/mockData.js'

// Visualizador in-app das páginas de líderes (KPIs). Sem cabeçalho: uma vez
// aberto, é só o conteúdo — a navegação de volta fica na barra inferior do app.
export function PainelExterno() {
  const { id } = useParams()
  const item = governancaCatalogo.find((c) => c.id === id)
  if (!item?.url) return <Navigate to="/" replace />

  return (
    <div className="-mb-24 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col">
      <div className="safe-top shrink-0 bg-bg" />
      <iframe
        src={item.url}
        title={item.label}
        className="w-full flex-1 border-0 bg-white"
        allow="clipboard-write; camera; microphone; geolocation"
      />
    </div>
  )
}

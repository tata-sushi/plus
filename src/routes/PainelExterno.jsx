import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { governancaCatalogo } from '../lib/mockData.js'
import { GovFrame } from '../components/GovFrame.jsx'

const LIDERES_ORIGIN = 'https://lideres.tatasushi.tech'
const ESCALAS_ORIGIN = 'https://escalas.tatasushi.tech'

// Prefixa a url relativa do catálogo com o domínio certo.
function urlAbsoluta(u) {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return (u.startsWith('/escalas') ? ESCALAS_ORIGIN : LIDERES_ORIGIN) + u
}

// Visualizador in-app das páginas de Governança. A página abre SÓ aqui dentro
// (modelo novo): o GovFrame passa o token da sessão via postMessage (origem
// verificada) e a página confere o acesso ao vivo (gov_meus_acessos). Fora do
// Plus, ela nega.
export function PainelExterno() {
  const { id } = useParams()
  const [pagina, setPagina] = useState(undefined) // undefined=carregando · null=sem acesso

  // Procura a página no catálogo novo (tabela, ao vivo). Se não achar, cai no
  // catálogo antigo (atalhos fixados legados) — sem quebrar o que já existe.
  useEffect(() => {
    let ativo = true
    supabase.rpc('gov_meus_acessos').then(({ data }) => {
      if (!ativo) return
      const novo = (data || []).find((p) => p.pagina_id === id)
      if (novo) return setPagina({ url: novo.url, label: novo.label })
      const legado = governancaCatalogo.find((c) => c.id === id)
      setPagina(legado ? { url: legado.url, label: legado.label } : null)
    })
    return () => {
      ativo = false
    }
  }, [id])

  if (pagina === undefined) {
    return (
      <div className="grid h-[60vh] place-items-center text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }
  if (!pagina) return <Navigate to="/" replace />

  return (
    <div className="-mb-24 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] flex-col">
      <div className="safe-top shrink-0 bg-bg" />
      <GovFrame
        src={urlAbsoluta(pagina.url)}
        title={pagina.label}
        allow="clipboard-write; camera; microphone; geolocation"
        className="flex-1"
      />
    </div>
  )
}

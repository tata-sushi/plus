import { useEffect } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'

// Portal de Governança (capa /compliance/) embutido em tela cheia. O Plus passa
// o token da sessão pro iframe (origem verificada); o portal e suas páginas
// checam o acesso ao vivo (gate.js). A navegação/menu fica por conta do portal.
const HOME = 'https://lideres.tatasushi.tech/compliance/'
const LIDERES_ORIGIN = 'https://lideres.tatasushi.tech'
const ESCALAS_ORIGIN = 'https://escalas.tatasushi.tech'

export function Governanca() {
  const { session, usuario } = useAuth()

  useEffect(() => {
    function onMsg(ev) {
      if (ev.origin !== LIDERES_ORIGIN && ev.origin !== ESCALAS_ORIGIN) return
      if (ev.data?.tp !== 'gov-ready' || !session) return
      ev.source?.postMessage(
        {
          tp: 'gov-session',
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          nome: usuario?.nome || '',
          perfil: usuario?.perfil || 'lider',
        },
        ev.origin,
      )
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [session, usuario])

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <div className="safe-top shrink-0 bg-bg" />
      <iframe
        src={HOME}
        title="Governança de Processos"
        className="w-full flex-1 border-0 bg-white"
        allow="clipboard-write; camera; microphone; geolocation"
      />
    </div>
  )
}

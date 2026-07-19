import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'

const LIDERES_ORIGIN = 'https://lideres.tatasushi.tech'
const ESCALAS_ORIGIN = 'https://escalas.tatasushi.tech'

// Iframe das páginas de Governança com carregamento "invisível":
//  - entrega o token da sessão do Plus pro iframe (origem verificada), tanto
//    respondendo ao ping (gov-ready) quanto proativamente no onLoad;
//  - mantém um loader limpo por cima até a página avisar que resolveu o acesso
//    (gov-ok / gov-denied), pra o usuário não ver o "verificando acesso" cru.
// O src pode ser do portal de líderes ou de escalas.
export function GovFrame({ src, title, allow, className }) {
  const { session, usuario } = useAuth()
  const iframeRef = useRef(null)
  const [carregando, setCarregando] = useState(true)

  function enviarToken(win, origin) {
    if (!session || !win) return
    win.postMessage(
      {
        tp: 'gov-session',
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        nome: usuario?.nome || '',
        perfil: usuario?.perfil || 'lider',
      },
      origin,
    )
  }

  useEffect(() => {
    function onMsg(ev) {
      if (ev.origin !== LIDERES_ORIGIN && ev.origin !== ESCALAS_ORIGIN) return
      const tp = ev.data?.tp
      if (tp === 'gov-ready') {
        enviarToken(ev.source, ev.origin)
      } else if (tp === 'gov-ok' || tp === 'gov-denied') {
        setCarregando(false)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, usuario])

  // Ao carregar cada documento no iframe, já manda o token (sem esperar o ping).
  function onLoad() {
    try {
      enviarToken(iframeRef.current?.contentWindow, new URL(src, window.location.href).origin)
    } catch (e) {}
  }

  // Rede de segurança: revela mesmo se a página não avisar (ex.: sem gate).
  useEffect(() => {
    if (!carregando) return
    const t = setTimeout(() => setCarregando(false), 6000)
    return () => clearTimeout(t)
  }, [carregando])

  return (
    <div className={cn('relative', className)}>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        onLoad={onLoad}
        className="h-full w-full border-0 bg-white"
        allow={allow}
      />
      {carregando && (
        <div className="absolute inset-0 grid place-items-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-accent" />
            <span className="text-sm text-muted-2">Carregando…</span>
          </div>
        </div>
      )}
    </div>
  )
}

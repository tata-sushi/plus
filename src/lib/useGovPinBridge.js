import { useEffect } from 'react'
import { togglePin, isPinned } from './govPins.js'

const LIDERES_ORIGIN = 'https://lideres.tatasushi.tech'

// Ponte app ⇆ páginas do portal (iframe) para o botão "alfinete" do header:
//   página → app:  { tp:'gov-pin-query',  id }                        → estado atual
//   página → app:  { tp:'gov-pin-toggle', page:{id,label,url,icon} }  → fixa/desafixa
//   app → página:  { tp:'gov-pin-state',  id, pinned, error? }
//
// Só aceita mensagens do portal de líderes (origem verificada). Quem fixa fica no
// store local (govPins); a UI (rail do desktop / Atalhos do mobile) reage sozinha
// via subscribePins. Montado uma vez, no AppShell (vale desktop e mobile).
export function useGovPinBridge() {
  useEffect(() => {
    function responder(source, origin, id, extra) {
      try {
        source?.postMessage({ tp: 'gov-pin-state', id, pinned: isPinned(id), ...extra }, origin)
      } catch {
        /* ignore */
      }
    }
    function onMsg(ev) {
      if (ev.origin !== LIDERES_ORIGIN) return
      const d = ev.data || {}
      if (d.tp === 'gov-pin-query' && d.id) {
        responder(ev.source, ev.origin, d.id)
      } else if (d.tp === 'gov-pin-toggle' && d.page && d.page.id) {
        const r = togglePin(d.page)
        if (r.ok === false && r.reason === 'limit') {
          responder(ev.source, ev.origin, d.page.id, { error: 'limit' })
        } else {
          responder(ev.source, ev.origin, d.page.id)
        }
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])
}

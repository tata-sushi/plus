import { GovFrame } from '../components/GovFrame.jsx'

// Portal de Governança (capa /compliance/) embutido em tela cheia. O GovFrame
// passa o token da sessão pro iframe (origem verificada) e segura um loader
// limpo até a página resolver o acesso; o portal e suas páginas conferem ao vivo
// (gate.js). A navegação/menu fica por conta do portal.
const HOME = 'https://lideres.tatasushi.tech/compliance/'

export function Governanca() {
  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <div className="safe-top shrink-0 bg-bg" />
      <GovFrame
        src={HOME}
        title="Governança de Processos"
        allow="clipboard-write; camera; microphone; geolocation"
        className="flex-1"
      />
    </div>
  )
}

import { GovFrame } from '../components/GovFrame.jsx'

// Controle de Escala — a página do portal de Líderes embutida em tela cheia, com
// o token da sessão do Plus (via GovFrame, mesma verificação de origem). Mesmo
// tratamento da Governança: no celular a barra de navegação fica embaixo e o
// iframe ocupa o resto (ver AppShell). Aberta pelo botão do treino "Escala Tatá
// para Líderes".
const CONTROLE_ESCALA_URL =
  'https://lideres.tatasushi.tech/compliance/kpis/rh/escalas.html'

export function ControleEscala() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="safe-top shrink-0 bg-bg" />
      <GovFrame
        src={CONTROLE_ESCALA_URL}
        title="Controle de Escala"
        allow="clipboard-write"
        className="flex-1"
      />
    </div>
  )
}

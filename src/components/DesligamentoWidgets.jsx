import { WhatsappSara } from './ClimaWidgets.jsx'

// Widget do desafio "Entrevista de Desligamento" (Avaliações e Feedback).
//   [[whatsapp-desligamento]] → a Sara (RH) envia o link da entrevista pelo WhatsApp
// Reaproveita a animação de envio da Sara (ClimaWidgets) com o texto adaptado.

function WhatsappDesligamento() {
  return (
    <WhatsappSara
      previewTitulo="Entrevista de Desligamento — TATÁ Sushi"
      previewDesc="Queremos entender como foi a sua experiência. Rápida e confidencial. 💚"
      url="https://pesquisa.tatasushi.tech/?t=4b1f7a90-2c6e-4d51-8a3e-91f0c7b2ad64"
    >
      <p>Olá! Aqui é a Sara do TATÁ Sushi. 🍣</p>
      <p className="mt-2">
        Antes da sua saída, gostaríamos de ouvir você na{' '}
        <strong className="font-semibold">Entrevista de Desligamento</strong>. É rapidinha e{' '}
        <strong className="font-semibold">confidencial</strong> — as suas respostas nos ajudam a
        melhorar o Tatá.
      </p>
    </WhatsappSara>
  )
}

export function DesligamentoWidget({ tipo }) {
  if (tipo === 'whatsapp-desligamento') return <WhatsappDesligamento />
  return null
}

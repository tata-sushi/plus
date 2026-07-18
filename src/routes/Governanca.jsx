// Portal de Governança (Líderes) rodando dentro do app, em tela cheia — sem a
// barra de navegação e sem botão de voltar. Uma vez aberto, é só o conteúdo;
// a volta fica por conta do gesto de voltar do aparelho.
const GOVERNANCA_URL = 'https://lideres.tatasushi.tech/compliance/index2.html'

export function Governanca() {
  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <div className="safe-top shrink-0 bg-bg" />
      <iframe
        src={GOVERNANCA_URL}
        title="Governança de Processos"
        className="w-full flex-1 border-0 bg-white"
        allow="clipboard-write; camera; microphone; geolocation"
      />
    </div>
  )
}

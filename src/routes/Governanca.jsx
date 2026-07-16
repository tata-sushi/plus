// Portal de Governança (Líderes) rodando dentro do app, num iframe de tela cheia
// — mesmo padrão da Ouvidoria, pra não parecer um endereço externo.
// Página de abertura por enquanto; depois trocamos o link/ligamos o auth do app.
const GOVERNANCA_URL = 'https://lideres.tatasushi.tech/compliance/index2.html'

export function Governanca() {
  return (
    // Preenche a tela inteira (100dvh): o iframe vai até o rodapé e a barra de
    // navegação (opaca, fixa) cobre a parte de baixo — assim não sobra vão escuro
    // entre a página e a nav, em nenhum aparelho. Fundo branco por garantia.
    <div className="-mb-24 flex h-[100dvh] flex-col bg-white">
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

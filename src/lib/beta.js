// Matrículas que enxergam os jogos ainda em BETA (testes antes de liberar geral).
// Victor (7) e Cesar (24194). Pra liberar pra todos, é só tirar o `beta: true`
// da entrada do jogo (em Passatempos) e o guard nas telas dos jogos.
export const BETA_JOGOS = ['7', '24194']

export const podeBetaJogos = (usuario) => BETA_JOGOS.includes(String(usuario?.matricula))

// Destaques/stories do feed — DESLIGADO (trocado por post de vídeo direto no
// feed). Lista vazia = ninguém vê a fileira de Destaques nem o compositor em
// modal; o feed usa o compositor inline (com o botão "Vídeo" para o RH).
// Pra reativar os Destaques em teste, é só voltar uma matrícula aqui.
export const BETA_DESTAQUES = []

export const podeVerDestaques = (usuario) => BETA_DESTAQUES.includes(String(usuario?.matricula))

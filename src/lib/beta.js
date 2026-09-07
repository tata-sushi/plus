// Matrículas que enxergam os jogos ainda em BETA (testes antes de liberar geral).
// Victor (7) e Cesar (24194). Pra liberar pra todos, é só tirar o `beta: true`
// da entrada do jogo (em Passatempos) e o guard nas telas dos jogos.
export const BETA_JOGOS = ['7', '24194']

export const podeBetaJogos = (usuario) => BETA_JOGOS.includes(String(usuario?.matricula))

// Destaques do feed ainda EM TESTE — só Victor (7) vê (Destaques + compositor
// em modal). Pra liberar geral, é só esvaziar esta lista (ou trocar por `true`).
export const BETA_DESTAQUES = ['7']

export const podeVerDestaques = (usuario) => BETA_DESTAQUES.includes(String(usuario?.matricula))

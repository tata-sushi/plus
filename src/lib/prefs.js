// Preferências de exibição do colaborador (salvas no aparelho).
const KEY_SIGNO = 'tp_signo'
const KEY_DISC = 'tp_disc'

// Guarda 'off' quando o usuário desliga; visível por padrão.
function getVisivel(chave) {
  try {
    return localStorage.getItem(chave) !== 'off'
  } catch {
    return true
  }
}
function setVisivel(chave, visivel) {
  try {
    localStorage.setItem(chave, visivel ? 'on' : 'off')
  } catch {
    /* storage indisponível: ignora */
  }
  return visivel
}

export const getSignoVisivel = () => getVisivel(KEY_SIGNO)
export const setSignoVisivel = (v) => setVisivel(KEY_SIGNO, v)
export const getDiscVisivel = () => getVisivel(KEY_DISC)
export const setDiscVisivel = (v) => setVisivel(KEY_DISC, v)

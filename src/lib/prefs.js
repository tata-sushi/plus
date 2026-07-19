// Preferências de exibição do colaborador (salvas no aparelho).
const KEY_SIGNO = 'tp_signo'

// Signo visível por padrão; guarda 'off' quando o usuário desliga.
export function getSignoVisivel() {
  try {
    return localStorage.getItem(KEY_SIGNO) !== 'off'
  } catch {
    return true
  }
}

export function setSignoVisivel(visivel) {
  try {
    localStorage.setItem(KEY_SIGNO, visivel ? 'on' : 'off')
  } catch {
    /* storage indisponível: ignora */
  }
  return visivel
}

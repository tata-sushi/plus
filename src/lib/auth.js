// Autenticação mock (localStorage). Será trocada pela autenticação real
// do Supabase mais adiante.
const KEY = 'tata_auth'

export function isLoggedIn() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function login() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}

export function logout() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

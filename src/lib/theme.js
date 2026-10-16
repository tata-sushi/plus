// Tema do app — persistido no aparelho e aplicado no <html data-theme>.
// Valores: 'light' | 'dark' | 'halloween' (dark especial, acento abóbora).
const KEY = 'tp_theme'
const TEMAS = ['light', 'dark', 'halloween']

const corDaBarra = (t) =>
  t === 'light' ? '#F5F4F1' : t === 'halloween' ? '#0d0b11' : '#0A0A0A'

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY)
    return TEMAS.includes(t) ? t : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(tema) {
  const t = TEMAS.includes(tema) ? tema : 'dark'
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', corDaBarra(t))
  try {
    localStorage.setItem(KEY, t)
  } catch {}
  // avisa a UI (ex.: decoração de Halloween) que o tema mudou, sem recarregar.
  try {
    window.dispatchEvent(new CustomEvent('tp-theme', { detail: t }))
  } catch {}
  return t
}

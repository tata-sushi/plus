// Tema do app — persistido no aparelho e aplicado no <html data-theme>.
// Valores: 'light' | 'dark' | 'natal' (dark especial, acento dourado — em teste,
// liberado só pra matrícula 7 via o toggle nos Ajustes).
const KEY = 'tp_theme'
const TEMAS = ['light', 'dark', 'natal']

const corDaBarra = (t) => (t === 'light' ? '#F5F4F1' : t === 'natal' ? '#0b1812' : '#0A0A0A')

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY)
    return TEMAS.includes(t) ? t : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(tema) {
  const t = TEMAS.includes(tema) ? tema : 'light'
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', corDaBarra(t))
  try {
    localStorage.setItem(KEY, t)
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('tp-theme', { detail: t }))
  } catch {}
  return t
}

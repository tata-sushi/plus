// Tema claro/escuro — persistido no aparelho e aplicado no <html data-theme>.
const KEY = 'tp_theme'

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(tema) {
  const t = tema === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', t === 'light' ? '#F5F4F1' : '#0A0A0A')
  try {
    localStorage.setItem(KEY, t)
  } catch {}
  return t
}

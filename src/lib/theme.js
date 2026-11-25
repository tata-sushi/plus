// Tema do app — persistido no aparelho e aplicado no <html data-theme>.
// Valores: 'light' | 'dark' | 'natal' (sazonal: verde-pinho + dourado). O Natal
// é forçado 1x pra todo mundo no boot (ver index.html, trava tp_natal_forced) e
// NÃO fica no seletor de Contraste — quem sai dele não volta pela interface.
const KEY = 'tp_theme'
const TEMAS = ['light', 'dark', 'natal']

const corDaBarra = (t) => (t === 'light' ? '#F5F4F1' : t === 'natal' ? '#0d2619' : '#0A0A0A')

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

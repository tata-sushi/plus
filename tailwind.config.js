/** @type {import('tailwindcss').Config} */
// Cores semânticas via CSS custom properties (canais RGB) → suportam tema claro/escuro
// e o modificador de opacidade do Tailwind (ex.: bg-accent/25).
const c = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // tema é aplicado via <html data-theme="dark|light"> — habilita o variante dark:
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Breakpoints por ALTURA da tela — compacta a home em telas mais curtas
      screens: {
        hsm: { raw: '(max-height: 800px)' },
        hxs: { raw: '(max-height: 700px)' },
      },
      colors: {
        bg: c('--bg'),
        surface: c('--surface'),
        'surface-2': c('--surface-2'),
        'surface-3': c('--surface-3'),
        border: c('--border'),
        // separadores e preenchimentos sutis (já com alpha embutido)
        line: 'var(--line)',
        fill: 'var(--fill)',
        // Paleta de marca
        carbon: {
          DEFAULT: c('--carbon'),
          soft: 'var(--carbon-soft)',
        },
        accent: {
          DEFAULT: c('--accent'),
          dim: c('--accent-dim'),
          soft: 'var(--accent-soft)',
        },
        danger: c('--danger'),
        warn: c('--warn'),
        text: c('--text'),
        muted: c('--muted'),
        'muted-2': c('--muted-2'),
      },
      borderRadius: {
        card: '20px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgb(var(--accent) / 0.35)',
      },
    },
  },
  plugins: [],
}

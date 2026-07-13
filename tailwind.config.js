/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--app-bg) / <alpha-value>)',
        surface: '#141414',
        'surface-2': '#1E1E1E',
        'surface-3': '#2A2A2A',
        border: '#2A2A2A',
        // Paleta de marca
        carbon: {
          DEFAULT: '#53585F',
          soft: 'rgba(83, 88, 95, 0.35)',
        },
        accent: {
          DEFAULT: '#70FF41', // Citric
          dim: '#4FD628',
          soft: 'rgba(112, 255, 65, 0.12)',
        },
        danger: '#EF4444',
        warn: '#F59E0B',
        text: '#FFFFFF',
        muted: '#9CA3AF',
        'muted-2': '#53585F',
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
        glow: '0 0 24px rgba(112, 255, 65, 0.35)',
      },
    },
  },
  plugins: [],
}

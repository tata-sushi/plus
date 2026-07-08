/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: '#141414',
        'surface-2': '#1E1E1E',
        'surface-3': '#2A2A2A',
        border: '#2A2A2A',
        accent: {
          DEFAULT: '#00E676',
          dim: '#00B85E',
          soft: 'rgba(0, 230, 118, 0.12)',
        },
        danger: '#EF4444',
        warn: '#F59E0B',
        text: '#FFFFFF',
        muted: '#9CA3AF',
        'muted-2': '#6B7280',
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
        glow: '0 0 24px rgba(0, 230, 118, 0.35)',
      },
    },
  },
  plugins: [],
}

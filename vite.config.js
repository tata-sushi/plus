import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/logo.svg', 'offline.html'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'Tatá Plus',
        short_name: 'Tatá Plus',
        description: 'Portal do colaborador Tatá Sushi — feed, treinamentos, procedimentos e jornada.',
        theme_color: '#00E676',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
})

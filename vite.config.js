import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        // handlers de push (notificação no celular) — ver public/push-sw.js
        importScripts: ['/push-sw.js'],
      },
      manifest: {
        name: 'Tatá Plus',
        short_name: 'Tatá Plus',
        description: 'Portal do colaborador Tatá Sushi — feed, treinamentos, procedimentos e jornada.',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        // Retrato é o padrão do app (garantido pelo manifesto, mesmo sem JS).
        // O organograma vai para paisagem via TELA CHEIA + orientation.lock
        // ('landscape') — ver routes/Organograma.jsx. Trocar aqui exige
        // REINSTALAR o PWA (a orientação é "assada" na instalação).
        orientation: 'portrait',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        // Ao abrir um link capturado, reaproveita a janela já aberta do app em
        // vez de criar outra (link capturing no Android — "abrir links neste app").
        launch_handler: { client_mode: 'navigate-existing' },
        // Declara o próprio PWA como app relacionado para que
        // navigator.getInstalledRelatedApps() consiga detectar se já está
        // instalado (Android/Chrome) e o portão troque para "abra pelo ícone".
        // prefer_related_applications fica false: o prompt de instalação do PWA
        // continua aparecendo normalmente.
        prefer_related_applications: false,
        related_applications: [
          { platform: 'webapp', url: 'https://plus.tatasushi.tech/manifest.webmanifest' },
        ],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})

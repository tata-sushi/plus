import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './lib/AuthContext.jsx'
import { ModoApp } from './components/ModoApp.jsx'
import { App } from './App.jsx'
import './index.css'

// Com autoUpdate, achar uma versão nova aplica e recarrega sozinho. Aqui a gente
// força a CHECAGEM periódica (a cada 30s) e ao voltar o foco pro app — senão o SW
// só verifica no load, e no Android reabrir o PWA nem sempre faz um load novo.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, r) {
    if (!r) return
    setInterval(() => {
      r.update().catch(() => {})
    }, 30 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') r.update().catch(() => {})
    })
  },
})

// Depois de um deploy, uma aba já aberta pode tentar baixar um chunk antigo
// (lazy routes) que não existe mais no servidor → "Failed to fetch dynamically
// imported module" (tela branca/erro ao navegar). O Vite dispara
// 'vite:preloadError' nesse caso; aqui a gente recarrega UMA vez pra pegar o
// build novo. Trava por tempo (10s) pra nunca entrar em loop de reload.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'tp_chunk_reload_at'
  let ultimo = 0
  try {
    ultimo = Number(sessionStorage.getItem(KEY)) || 0
  } catch {
    /* ignore */
  }
  if (Date.now() - ultimo < 10000) return // já tentou agora há pouco: não insiste
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ModoApp>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ModoApp>
  </React.StrictMode>,
)

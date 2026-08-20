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

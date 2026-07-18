import { useEffect, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'

// Acesso somente pelo aplicativo: o portal só libera quando está rodando como
// PWA instalado (standalone). Aberto num navegador comum, mostra a tela de
// instalação no lugar do app. Em desenvolvimento (npm run dev) o portão é
// desligado para não atrapalhar o trabalho local.
const DEV = import.meta.env.DEV

function ehStandalone() {
  if (typeof window === 'undefined') return true
  // iOS Safari (tela de início) expõe navigator.standalone
  if (window.navigator.standalone === true) return true
  // App empacotado (TWA / Android) chega via android-app://
  if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')) return true
  // Demais plataformas: display-mode do PWA instalado
  return ['standalone', 'fullscreen', 'minimal-ui'].some(
    (m) => window.matchMedia(`(display-mode: ${m})`).matches,
  )
}

function ehIOS() {
  const ua = window.navigator.userAgent || ''
  if (/iphone|ipad|ipod/i.test(ua)) return true
  // iPadOS 13+ se identifica como Mac com toque
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function ModoApp({ children }) {
  const [instalado, setInstalado] = useState(() => DEV || ehStandalone())
  const [prompt, setPrompt] = useState(null)
  // Já instalado, mas aberto no navegador: não dá para forçar a abertura do app
  // (nenhuma plataforma permite), então o portão troca "instale" por "abra pelo
  // aplicativo". Detectado por getInstalledRelatedApps (Android/Chrome) ou, no
  // desktop, pela heurística abaixo.
  const [jaInstalado, setJaInstalado] = useState(false)
  // No desktop o getInstalledRelatedApps é fraco. Heurística: se depois de um
  // tempo o navegador NÃO ofereceu "instalar" (beforeinstallprompt), é porque o
  // PWA já está instalado (o Chrome não oferece instalar app já instalado).
  const [esperou, setEsperou] = useState(false)

  useEffect(() => {
    if (instalado) return
    const mq = window.matchMedia('(display-mode: standalone)')
    const recheca = () => {
      if (ehStandalone()) setInstalado(true)
    }
    mq.addEventListener?.('change', recheca)
    // Prompt nativo de instalação (Android / Chromium desktop)
    const aoPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', aoPrompt)
    window.addEventListener('appinstalled', recheca)

    // Detecta se o PWA já está instalado neste aparelho (Android/Chrome).
    let vivo = true
    navigator.getInstalledRelatedApps?.().then((apps) => {
      if (vivo && apps?.some((a) => a.platform === 'webapp')) setJaInstalado(true)
    }).catch(() => {})

    // Janela para o beforeinstallprompt aparecer; passou disso sem prompt = instalado.
    const t = setTimeout(() => setEsperou(true), 2000)

    return () => {
      vivo = false
      clearTimeout(t)
      mq.removeEventListener?.('change', recheca)
      window.removeEventListener('beforeinstallprompt', aoPrompt)
      window.removeEventListener('appinstalled', recheca)
    }
  }, [instalado])

  if (instalado) return children

  const ios = ehIOS()
  const ehDesktop = window.matchMedia('(min-width: 640px)').matches
  // Mostra "Abrir aplicativo" quando: detectou instalado, ou é desktop e o
  // navegador não ofereceu instalar (logo, já está instalado).
  const mostrarAbrir = jaInstalado || (ehDesktop && esperou && !prompt && !ios)

  async function instalar() {
    if (!prompt) return
    prompt.prompt()
    try {
      await prompt.userChoice
    } catch (e) {
      /* usuário fechou o prompt */
    }
    setPrompt(null)
  }

  return (
    <div className="safe-top safe-bottom flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <div className="flex flex-col items-center">
        <img
          src="/icons/icon-192.png"
          alt="Tatá Plus"
          className="h-20 w-20 rounded-2xl"
          width={80}
          height={80}
        />
        <div className="mt-4 font-display text-2xl font-bold tracking-tight">
          TATÁ<span className="text-accent"> PLUS</span>
        </div>
      </div>

      <div className="max-w-xs">
        <h1 className="font-display text-lg font-bold">Disponível pelo aplicativo</h1>
        <p className="mt-2 text-sm text-muted">Acesse e navegue</p>
      </div>

      {mostrarAbrir ? (
        <a href="web+tataplus://abrir" className="btn-primary w-full max-w-xs !py-3.5">
          <ExternalLink size={18} /> Abrir aplicativo
        </a>
      ) : (
        <button onClick={instalar} className="btn-primary w-full max-w-xs !py-3.5">
          <Download size={18} /> Instalar aplicativo
        </button>
      )}
    </div>
  )
}

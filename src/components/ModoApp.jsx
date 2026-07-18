import { useEffect, useState } from 'react'
import { Share, SquarePlus, MoreVertical, Download, Smartphone } from 'lucide-react'

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
  // ícone". Só detectável no Android/Chrome via getInstalledRelatedApps.
  const [jaInstalado, setJaInstalado] = useState(false)

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

    return () => {
      vivo = false
      mq.removeEventListener?.('change', recheca)
      window.removeEventListener('beforeinstallprompt', aoPrompt)
      window.removeEventListener('appinstalled', recheca)
    }
  }, [instalado])

  if (instalado) return children

  const ios = ehIOS()

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

      {jaInstalado ? (
        <>
          <div className="max-w-sm">
            <h1 className="font-display text-lg font-bold">Abra pelo aplicativo</h1>
            <p className="mt-2 text-sm text-muted">
              O Tatá Plus já está instalado neste aparelho. Abra pelo ícone do app na tela
              inicial para continuar.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-4 text-left">
            <div className="hstack gap-3 text-sm">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Smartphone size={16} />
              </span>
              <span>
                Toque no ícone do <b>Tatá Plus</b> na sua tela inicial.
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="max-w-sm">
            <h1 className="font-display text-lg font-bold">Disponível pelo aplicativo</h1>
            <p className="mt-2 text-sm text-muted">
              Para usar o Tatá Plus, instale o app na tela inicial do seu celular. Leva alguns
              segundos e ele passa a abrir como um aplicativo de verdade.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-4 text-left">
            {ios ? (
              <ol className="flex flex-col gap-3 text-sm">
                <li className="hstack gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Share size={16} />
                  </span>
                  <span>
                    Toque em <b>Compartilhar</b> na barra do Safari.
                  </span>
                </li>
                <li className="hstack gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <SquarePlus size={16} />
                  </span>
                  <span>
                    Escolha <b>Adicionar à Tela de Início</b>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="flex flex-col gap-3 text-sm">
                <li className="hstack gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <MoreVertical size={16} />
                  </span>
                  <span>
                    Abra o menu do navegador (<b>⋮</b>).
                  </span>
                </li>
                <li className="hstack gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Download size={16} />
                  </span>
                  <span>
                    Escolha <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.
                  </span>
                </li>
              </ol>
            )}
          </div>

          {prompt && !ios && (
            <button onClick={instalar} className="btn-primary w-full max-w-sm !py-3.5">
              <Download size={18} /> Instalar aplicativo
            </button>
          )}

          <p className="text-[11px] text-muted-2">
            Depois de instalar, abra o Tatá Plus pelo ícone na tela inicial.
          </p>
        </>
      )}
    </div>
  )
}

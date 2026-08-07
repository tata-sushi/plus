import { useEffect, useState } from 'react'
import { Volume2, Pause, Play, Square } from 'lucide-react'
import { cn } from '../lib/cn'

// Leitura em voz do conteúdo usando a Web Speech API nativa do navegador:
// sem peso extra, sem custo, funciona offline com as vozes do próprio aparelho.
// Acessibilidade pra quem tem dificuldade de leitura. Se o aparelho não tiver
// suporte, o botão simplesmente não aparece.
const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window

function htmlParaTexto(html) {
  const el = document.createElement('div')
  el.innerHTML = html || ''
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

export function LeitorVoz({ html, className }) {
  const [estado, setEstado] = useState('parado') // parado | lendo | pausado

  // Ao trocar de conteúdo ou sair da tela, para a leitura.
  useEffect(() => {
    return () => {
      if (suportado) window.speechSynthesis.cancel()
    }
  }, [html])

  if (!suportado) return null

  function ouvir() {
    const texto = htmlParaTexto(html)
    if (!texto) return
    window.speechSynthesis.cancel()
    const voz = (window.speechSynthesis.getVoices() || []).find((v) => /pt[-_]?br/i.test(v.lang))
    // Quebra em frases: cada trecho curto evita o corte de fala em textos
    // longos (bug conhecido do Chrome) e a fala fica mais estável.
    const partes = texto.match(/[^.!?]+[.!?]+(\s|$)|\S[^.!?]*$/g) || [texto]
    partes.forEach((parte, i) => {
      const u = new SpeechSynthesisUtterance(parte.trim())
      u.lang = 'pt-BR'
      if (voz) u.voice = voz
      if (i === partes.length - 1) u.onend = () => setEstado('parado')
      u.onerror = () => setEstado('parado')
      window.speechSynthesis.speak(u)
    })
    setEstado('lendo')
  }

  function pausar() {
    window.speechSynthesis.pause()
    setEstado('pausado')
  }
  function continuar() {
    window.speechSynthesis.resume()
    setEstado('lendo')
  }
  function parar() {
    window.speechSynthesis.cancel()
    setEstado('parado')
  }

  return (
    <div className={cn('hstack gap-2', className)}>
      {estado === 'parado' && (
        <button onClick={ouvir} className="btn-ghost !px-3.5 !py-2 text-xs font-semibold">
          <Volume2 size={15} /> Ouvir
        </button>
      )}
      {estado === 'lendo' && (
        <button onClick={pausar} className="btn-ghost !px-3.5 !py-2 text-xs font-semibold">
          <Pause size={15} /> Pausar
        </button>
      )}
      {estado === 'pausado' && (
        <button onClick={continuar} className="btn-ghost !px-3.5 !py-2 text-xs font-semibold">
          <Play size={15} /> Continuar
        </button>
      )}
      {estado !== 'parado' && (
        <button
          onClick={parar}
          className="btn-ghost !px-3 !py-2 text-xs text-muted"
          aria-label="Parar leitura"
        >
          <Square size={14} />
        </button>
      )}
    </div>
  )
}

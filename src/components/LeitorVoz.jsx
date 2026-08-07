import { useEffect, useRef, useState } from 'react'
import { Volume2, Pause, Play, Square } from 'lucide-react'
import { cn } from '../lib/cn'

// Leitura em voz do conteúdo usando a Web Speech API nativa do navegador:
// sem peso extra, sem custo, funciona offline com as vozes do próprio aparelho.
// Acessibilidade pra quem tem dificuldade de leitura. Se o aparelho não tiver
// suporte, o botão simplesmente não aparece.
const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window
const VELOCIDADES = [0.75, 1, 1.25, 1.5]

function htmlParaTexto(html) {
  const el = document.createElement('div')
  el.innerHTML = html || ''
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

function fmtVel(r) {
  return String(r).replace('.', ',') + '×'
}

export function LeitorVoz({ html, className }) {
  const [estado, setEstado] = useState('parado') // parado | lendo | pausado
  const [vel, setVel] = useState(1)
  // Token de sessão: ao reiniciar (ex.: trocar velocidade), o cancel() dispara
  // o onend da fala antiga — este token faz ignorar esses callbacks vencidos.
  const sessao = useRef(0)

  // Ao trocar de conteúdo ou sair da tela, para a leitura.
  useEffect(() => {
    return () => {
      if (suportado) window.speechSynthesis.cancel()
    }
  }, [html])

  if (!suportado) return null

  function ouvir(r = vel) {
    const texto = htmlParaTexto(html)
    if (!texto) return
    const atual = ++sessao.current
    window.speechSynthesis.cancel()
    const voz = (window.speechSynthesis.getVoices() || []).find((v) => /pt[-_]?br/i.test(v.lang))
    // Quebra em frases: cada trecho curto evita o corte de fala em textos
    // longos (bug conhecido do Chrome) e a fala fica mais estável.
    const partes = texto.match(/[^.!?]+[.!?]+(\s|$)|\S[^.!?]*$/g) || [texto]
    partes.forEach((parte, i) => {
      const u = new SpeechSynthesisUtterance(parte.trim())
      u.lang = 'pt-BR'
      if (voz) u.voice = voz
      u.rate = r
      const fim = () => {
        if (sessao.current === atual) setEstado('parado')
      }
      if (i === partes.length - 1) u.onend = fim
      u.onerror = fim
      window.speechSynthesis.speak(u)
    })
    setEstado('lendo')
  }

  function ciclarVel() {
    const prox = VELOCIDADES[(VELOCIDADES.indexOf(vel) + 1) % VELOCIDADES.length]
    setVel(prox)
    if (estado !== 'parado') ouvir(prox) // reinicia já na nova velocidade
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
    sessao.current++ // invalida callbacks pendentes
    window.speechSynthesis.cancel()
    setEstado('parado')
  }

  return (
    <div className={cn('flex items-stretch gap-2', className)}>
      {estado === 'parado' ? (
        <button onClick={() => ouvir()} className="btn-ghost w-full !py-2.5 text-sm font-semibold">
          <Volume2 size={16} /> Ouvir
        </button>
      ) : (
        <>
          {estado === 'lendo' ? (
            <button onClick={pausar} className="btn-ghost flex-1 !py-2.5 text-sm font-semibold">
              <Pause size={16} /> Pausar
            </button>
          ) : (
            <button onClick={continuar} className="btn-ghost flex-1 !py-2.5 text-sm font-semibold">
              <Play size={16} /> Continuar
            </button>
          )}
          <button
            onClick={ciclarVel}
            className="btn-ghost shrink-0 !px-3.5 !py-2.5 text-xs font-bold tabular-nums text-muted"
            aria-label={`Velocidade da leitura: ${fmtVel(vel)}`}
          >
            {fmtVel(vel)}
          </button>
          <button
            onClick={parar}
            className="btn-ghost shrink-0 !px-4 !py-2.5 text-muted"
            aria-label="Parar leitura"
          >
            <Square size={16} />
          </button>
        </>
      )}
    </div>
  )
}

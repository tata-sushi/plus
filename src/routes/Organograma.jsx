import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Network, ExternalLink } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'

// Organograma (HTML no portal Líderes). Abre no NAVEGADOR do celular, por cima
// do app (nova aba / custom tab), em vez de embutir num iframe em tela cheia.
//
// Por quê: o app é travado em RETRATO pelo manifesto e a única forma de girar
// um iframe embutido era entrar em tela cheia — o que dispara aquele alerta do
// Android ("arraste para sair da tela cheia") impossível de esconder. No
// navegador não há tela cheia: a página gira sozinha com o aparelho (auto-girar)
// e o zoom é nativo, sem alerta nenhum.
const ORGANOGRAMA_URL = 'https://lideres.tatasushi.tech/compliance/areas/organograma2.html'

function abrirNoNavegador() {
  // sem 'noopener' aqui de propósito: com noopener o window.open retorna null e
  // não dá para saber se abriu. É uma URL da própria empresa (confiável).
  const w = window.open(ORGANOGRAMA_URL, '_blank')
  return !!w
}

export function Organograma() {
  const navigate = useNavigate()
  const tentou = useRef(false)

  useEffect(() => {
    // a navegação até aqui foi um toque recente: tenta abrir direto no navegador
    // e volta para a tela anterior (o organograma fica por cima, no navegador).
    if (tentou.current) return
    tentou.current = true
    if (abrirNoNavegador()) navigate(-1)
    // se o pop-up foi bloqueado, fica nesta tela com o botão manual abaixo.
  }, [navigate])

  function abrir() {
    tapHaptic()
    abrirNoNavegador()
    navigate(-1)
  }

  function voltar() {
    tapHaptic()
    navigate(-1)
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-bg px-10 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Network size={30} />
      </div>
      <div>
        <div className="font-display text-lg font-bold">Organograma</div>
        <p className="mt-1.5 text-sm text-muted">
          Abre no navegador do celular. Gire o aparelho para ver na horizontal.
        </p>
      </div>
      <button
        onClick={abrir}
        className="flex items-center gap-2 rounded-pill bg-accent px-6 py-3.5 text-sm font-semibold text-black shadow-lg tap"
      >
        <ExternalLink size={16} /> Abrir organograma
      </button>
      <button
        onClick={voltar}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted tap"
      >
        <ArrowLeft size={16} /> Voltar
      </button>
    </div>
  )
}

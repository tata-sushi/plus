import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { tapHaptic } from '../lib/haptics.js'
import { cn } from '../lib/cn'

// Cabeçalho padrão das subpáginas: botão "Voltar" + título e descrição
// centralizados (mesmo padrão da Passatempos/Check-in). Vai logo abaixo do
// <Header />. Fonte única pra todas as páginas não desalinharem.
//
//   <Header />
//   <CabecalhoPagina titulo="Agenda" descricao="Sua escala e os eventos." />
//
// acaoDireita: elemento opcional no canto direito da linha do Voltar
// (ex.: botão de ajuda/legenda). voltarPara: rota fixa em vez de navigate(-1).
export function CabecalhoPagina({ titulo, descricao, voltarPara, voltarLabel = 'Voltar', acaoDireita, className }) {
  const navigate = useNavigate()
  return (
    <>
      <div className="hstack items-center justify-between px-5 pt-2">
        <button
          onClick={() => { tapHaptic(); voltarPara ? navigate(voltarPara) : navigate(-1) }}
          className="hstack gap-1 text-sm font-medium text-muted tap"
        >
          <ArrowLeft size={16} /> {voltarLabel}
        </button>
        {acaoDireita}
      </div>
      <div className={cn('mx-auto w-full max-w-[420px] px-5 pt-4 text-center', className)}>
        <div className="font-display text-[19px] font-bold leading-tight">{titulo}</div>
        {descricao && <div className="mx-auto mt-1 max-w-[20rem] text-xs text-muted">{descricao}</div>}
      </div>
    </>
  )
}

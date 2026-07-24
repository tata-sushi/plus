import { useEffect, useState } from 'react'
import { Star, AlertTriangle } from 'lucide-react'
import { cn } from '../lib/cn'
import { supabase } from '../lib/supabase.js'

function Estrelas({ nota, onNota, readOnly }) {
  return (
    <div className="hstack gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onNota(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          className={cn('tap', readOnly && 'cursor-default')}
        >
          <Star size={28} className={cn(n <= nota ? 'fill-accent text-accent' : 'text-muted-2')} />
        </button>
      ))}
    </div>
  )
}

// Bloco de avaliação de um dia do cardápio (nota + sugestão), reutilizado
// na página de Avaliação (/avaliar) e no card de hoje do Cardápio da semana.
export function AvaliacaoDia({ dia }) {
  const [nota, setNota] = useState(dia?.minha_nota ?? 0)
  const [coment, setComent] = useState(dia?.meu_comentario || '')
  const [enviado, setEnviado] = useState(dia?.minha_nota != null)
  const [salvando, setSalvando] = useState(false)
  const [alerta, setAlerta] = useState([]) // restrições do usuário que batem com o cardápio

  useEffect(() => {
    let ativo = true
    const nomes = (dia?.itens || []).map((it) => it.item).filter(Boolean)
    if (nomes.length) {
      supabase.rpc('minhas_restricoes_cardapio', { p_itens: nomes }).then(({ data }) => {
        if (ativo) setAlerta(data || [])
      })
    }
    return () => {
      ativo = false
    }
  }, [dia])

  async function salvar() {
    if (!dia || nota < 1 || salvando) return
    setSalvando(true)
    const { error } = await supabase.rpc('avaliar_cardapio', {
      p_data: dia.data,
      p_nota: nota,
      p_comentario: coment || null,
    })
    setSalvando(false)
    if (!error) setEnviado(true)
  }

  return (
    <>
      {alerta.length > 0 && (
        <div className="mt-3 hstack gap-2 rounded-card border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
          <AlertTriangle size={15} className="shrink-0" />
          <span>Atenção: contém {alerta.join(', ')} — restrição sua.</span>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <div className="text-center">
          <div className="font-display text-base font-bold">O que achou da refeição de hoje?</div>
          <div className="mt-1 text-xs text-muted">Avalie e deixe a sua sugestão</div>
          <div className="mt-3 flex justify-center">
            <Estrelas nota={nota} onNota={setNota} readOnly={enviado} />
          </div>
        </div>
        {enviado ? (
          coment ? <div className="mt-3 text-center text-sm text-muted">“{coment}”</div> : null
        ) : (
          <>
            <input
              value={coment}
              onChange={(e) => setComent(e.target.value)}
              placeholder="Sua sugestão (opcional)"
              className="mt-3 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-2"
            />
            <button
              type="button"
              onClick={salvar}
              disabled={nota < 1 || salvando}
              className="btn-primary mt-3 w-full disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Salvar avaliação'}
            </button>
          </>
        )}
      </div>
    </>
  )
}

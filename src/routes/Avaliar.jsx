import { useEffect, useState } from 'react'
import { Star, AlertTriangle } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { cn } from '../lib/cn'
import { supabase } from '../lib/supabase.js'
import { DiaMenu, mondayISO, isoLocal } from '../components/CardapioDia.jsx'

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

export function Avaliar() {
  const [hoje, setHoje] = useState(undefined) // undefined = carregando · null = sem dia
  const [nota, setNota] = useState(0)
  const [coment, setComent] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [alerta, setAlerta] = useState([]) // restrições do usuário que batem com o cardápio de hoje

  useEffect(() => {
    let ativo = true
    supabase.rpc('cardapio_app', { p_inicio: mondayISO() }).then(({ data }) => {
      if (!ativo) return
      const hj = isoLocal(new Date())
      const h = (data || []).find((d) => d.data === hj) || null
      setHoje(h)
      if (h && h.minha_nota != null) {
        setNota(h.minha_nota)
        setComent(h.meu_comentario || '')
        setEnviado(true)
      }
      const nomes = (h?.itens || []).map((it) => it.item).filter(Boolean)
      if (nomes.length) {
        supabase.rpc('minhas_restricoes_cardapio', { p_itens: nomes }).then(({ data: r }) => {
          if (ativo) setAlerta(r || [])
        })
      }
    })
    return () => {
      ativo = false
    }
  }, [])

  async function salvar() {
    if (!hoje || nota < 1 || salvando) return
    setSalvando(true)
    const { error } = await supabase.rpc('avaliar_cardapio', {
      p_data: hoje.data,
      p_nota: nota,
      p_comentario: coment || null,
    })
    setSalvando(false)
    if (!error) setEnviado(true)
  }

  if (hoje === undefined)
    return (
      <>
        <Header />
        <Voltar />
      </>
    )

  const temMenu = !!(hoje && (hoje.resumo || (hoje.itens && hoje.itens.length)))

  return (
    <>
      <Header />
      <Voltar />

      <Section className="mt-4" title="Avaliar o cardápio de hoje">
        {!temMenu ? (
          <Card className="reveal">
            <div className="text-sm text-muted">Sem cardápio definido para hoje.</div>
          </Card>
        ) : (
          <div className="hero-card reveal p-4">
            <DiaMenu dia={hoje} hoje />

            {alerta.length > 0 && (
              <div className="mt-3 hstack gap-2 rounded-card border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Atenção: contém {alerta.join(', ')} — restrição sua.</span>
              </div>
            )}

            <div className="mt-4 border-t border-line pt-3">
              <div className="text-[11px] uppercase tracking-wide text-muted">Sua avaliação</div>
              <div className="mt-2">
                <Estrelas nota={nota} onNota={setNota} readOnly={enviado} />
              </div>
              {enviado ? (
                coment ? <div className="mt-2 text-sm text-muted">“{coment}”</div> : null
              ) : (
                <>
                  <input
                    value={coment}
                    onChange={(e) => setComent(e.target.value)}
                    placeholder="Comentário (opcional)"
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
          </div>
        )}
      </Section>
    </>
  )
}

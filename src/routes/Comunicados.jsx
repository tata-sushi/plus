import { useCallback, useEffect, useState } from 'react'
import { Eye, Loader2, Calendar } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { cn } from '../lib/cn'
import { dataCurta, dataBR, ehHoje, eventoVigente } from '../lib/tempo.js'
import { supabase } from '../lib/supabase.js'

// Página só de leitura. A criação/gestão de comunicados, notícias e avisos
// fica no Painel de administração (aba "Avisos").
export function Comunicados() {
  const [comunicados, setComunicados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    // ler_comunicados registra a leitura e devolve o feed (respeita o público-alvo)
    const { data, error } = await supabase.rpc('ler_comunicados')
    if (error) {
      setErro('Não foi possível carregar os comunicados.')
    } else {
      setComunicados(data || [])
      setErro('')
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <>
      <Header />

      <div className="mt-3 flex flex-col gap-3 px-5">
        {carregando && (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!carregando && erro && (
          <div className="rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-center text-xs font-medium text-danger">
            {erro}
          </div>
        )}

        {!carregando && !erro && comunicados.length === 0 && (
          <div className="py-10 text-center text-sm text-muted">Nenhum comunicado por enquanto.</div>
        )}

        {comunicados.map((c) => {
          const vigente = ehHoje(c.created_at) || eventoVigente(c.data_evento)
          return (
            <Card key={c.id} className={cn('reveal', vigente && 'ring-2 ring-accent/70 shadow-glow')}>
              <h3 className="font-display text-base font-bold leading-snug">{c.titulo}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{c.corpo}</p>

              {c.imagem_url && (
                <img
                  src={c.imagem_url}
                  alt=""
                  className="mt-3 w-full rounded-2xl object-cover"
                  loading="lazy"
                />
              )}

              {c.data_evento && (
                <div className="mt-2 hstack w-fit gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
                  <Calendar size={12} /> Evento · {dataBR(c.data_evento)}
                </div>
              )}

              <div className="mt-3 hstack justify-between text-[11px] text-muted">
                <span>Data de publicação · {dataCurta(c.created_at)}</span>
                <span className="hstack gap-1">
                  <Eye size={12} /> {c.visualizacoes}
                </span>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

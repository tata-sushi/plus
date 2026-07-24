import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { IntroDesafio } from '../components/IntroDesafio.jsx'
import { supabase } from '../lib/supabase.js'
import { DiaMenu, mondayISO, isoLocal } from '../components/CardapioDia.jsx'
import { AvaliacaoDia } from '../components/AvaliacaoDia.jsx'

function Capa() {
  return (
    <div className="px-5 pt-2">
      <IntroDesafio
        titulo="Sua opinião importa"
        frase="Agradeça à nossa equipe deixando sua avaliação"
        variante={0}
        Icone={Star}
        fraseEscuraNoClaro
      />
    </div>
  )
}

export function Avaliar() {
  const [hoje, setHoje] = useState(undefined) // undefined = carregando · null = sem dia

  useEffect(() => {
    let ativo = true
    supabase.rpc('cardapio_app', { p_inicio: mondayISO() }).then(({ data }) => {
      if (!ativo) return
      const hj = isoLocal(new Date())
      setHoje((data || []).find((d) => d.data === hj) || null)
    })
    return () => {
      ativo = false
    }
  }, [])

  if (hoje === undefined)
    return (
      <>
        <Header />
        <Voltar />
        <Capa />
      </>
    )

  const temMenu = !!(hoje && (hoje.resumo || (hoje.itens && hoje.itens.length)))

  return (
    <>
      <Header />
      <Voltar />
      <Capa />

      <Section className="mt-4">
        {!temMenu ? (
          <Card className="reveal">
            <div className="text-sm text-muted">Sem cardápio definido para hoje.</div>
          </Card>
        ) : (
          <div className="hero-card reveal p-4">
            <DiaMenu dia={hoje} hoje />
            <AvaliacaoDia dia={hoje} />
          </div>
        )}
      </Section>
    </>
  )
}

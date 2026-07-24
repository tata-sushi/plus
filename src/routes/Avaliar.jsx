import { useEffect, useState } from 'react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { supabase } from '../lib/supabase.js'
import { DiaMenu, mondayISO, isoLocal } from '../components/CardapioDia.jsx'
import { AvaliacaoDia } from '../components/AvaliacaoDia.jsx'

// Capa compacta (≈ metade da altura), sem ícone. Texto e formas abstratas no
// fundo adaptam ao tema: carbon/cinza no claro (verde some no fundo claro),
// cítrico/verde no escuro.
function Capa() {
  return (
    <div className="px-5 pt-2">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-6 text-center">
        {/* fundo decorativo — não fica seco */}
        <span aria-hidden className="pointer-events-none absolute inset-0">
          <span
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 150% at 50% -10%, rgb(var(--accent) / 0.16) 0%, rgb(var(--accent) / 0.04) 45%, transparent 75%)',
            }}
          />
          <span className="absolute -left-10 -top-12 h-28 w-28 rounded-full bg-carbon/5 blur-2xl dark:bg-accent/15" />
          <span className="absolute -bottom-12 -right-8 h-32 w-32 rounded-full bg-carbon/5 blur-2xl dark:bg-accent/10" />
          <span className="absolute -right-5 top-3 h-20 w-20 rounded-full border border-carbon/10 dark:border-accent/25" />
          <span className="absolute left-4 -bottom-4 h-12 w-12 rounded-full border border-carbon/10 dark:border-accent/20" />
        </span>
        <p className="relative mx-auto max-w-[20rem] text-base font-semibold leading-snug text-carbon dark:text-accent">
          Agradeça à nossa equipe deixando sua avaliação
        </p>
      </div>
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

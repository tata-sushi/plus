import { useEffect, useState } from 'react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { supabase } from '../lib/supabase.js'
import { DiaMenu, mondayISO, isoLocal } from '../components/CardapioDia.jsx'
import { AvaliacaoDia } from '../components/AvaliacaoDia.jsx'

// Capa compacta (≈ metade da altura), sem ícone, texto branco num padrão só,
// mantendo o brilho verde da marca no fundo.
function Capa() {
  return (
    <div className="px-5 pt-2">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-6 text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 150% at 50% -10%, rgb(var(--accent) / 0.18) 0%, rgb(var(--accent) / 0.05) 45%, transparent 75%)',
          }}
        />
        <p className="relative mx-auto max-w-[20rem] text-base font-semibold leading-snug text-text">
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

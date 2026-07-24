import { useEffect, useState } from 'react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { supabase } from '../lib/supabase.js'
import { DiaMenu, mondayISO, isoLocal } from '../components/CardapioDia.jsx'

export function Cardapio() {
  const [semana, setSemana] = useState(undefined) // undefined = carregando

  useEffect(() => {
    let ativo = true
    supabase.rpc('cardapio_app', { p_inicio: mondayISO() }).then(({ data }) => {
      if (ativo) setSemana(data || [])
    })
    return () => {
      ativo = false
    }
  }, [])

  if (semana === undefined)
    return (
      <>
        <Header />
        <Voltar />
      </>
    )

  const hj = isoLocal(new Date())
  // Cardápio da semana = de hoje em diante (próximos dias)
  const proximos = (semana || []).filter((d) => d.data >= hj)

  return (
    <>
      <Header />
      <Voltar />

      <Section className="mt-4" title="Cardápio da semana">
        {proximos.length === 0 ? (
          <Card className="reveal">
            <div className="text-sm text-muted">Sem cardápio para os próximos dias.</div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {proximos.map((d, i) => (
              <Card key={d.data} className={`reveal reveal-${Math.min(i + 1, 4)} p-4`}>
                <DiaMenu dia={d} hoje={d.data === hj} />
              </Card>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}

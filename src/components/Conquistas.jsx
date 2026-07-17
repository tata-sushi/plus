import { useEffect, useState } from 'react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { supabase } from '../lib/supabase.js'
import { CATALOGO_EMBLEMAS } from '../lib/emblemas.js'
import { GradeEmblemas, contarEmblemas } from './GradeEmblemas.jsx'

// Conquistas (emblemas) da Minha jornada — busca o resumo próprio e desenha a grade.
export function Conquistas() {
  const [extra, setExtra] = useState(undefined) // undefined = carregando

  useEffect(() => {
    let ativo = true
    supabase.rpc('minha_jornada_extra').then(({ data }) => {
      if (ativo) setExtra(data || null)
    })
    return () => {
      ativo = false
    }
  }, [])

  if (extra === undefined) return null

  const dados = extra || {}

  return (
    <Section
      className="reveal reveal-1 mt-5"
      title="Conquistas"
      action={
        <span className="text-xs font-semibold text-muted">
          {contarEmblemas(dados)}/{CATALOGO_EMBLEMAS.length}
        </span>
      }
    >
      <Card>
        <GradeEmblemas dados={dados} />
      </Card>
    </Section>
  )
}

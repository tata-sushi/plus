import { useEffect, useState } from 'react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { supabase } from '../lib/supabase.js'
import { avaliarCatalogo } from '../lib/emblemas.js'
import { GradeEmblemas } from './GradeEmblemas.jsx'

// Conquistas (emblemas) da Minha jornada — busca o resumo próprio + o catálogo
// de emblemas (editável no admin) e desenha a grade.
export function Conquistas() {
  const [extra, setExtra] = useState(undefined) // undefined = carregando
  const [catalogo, setCatalogo] = useState([])

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.rpc('minha_jornada_extra'),
      supabase.rpc('catalogo_emblemas'),
    ]).then(([ex, cat]) => {
      if (!ativo) return
      setExtra(ex.data || null)
      setCatalogo(cat.data || [])
    })
    return () => {
      ativo = false
    }
  }, [])

  if (extra === undefined) return null

  const dados = extra || {}
  const { total, existentes } = avaliarCatalogo(catalogo, dados)

  return (
    <Section
      className="reveal reveal-1 mt-5"
      title="Conquistas"
      action={
        <span className="text-xs font-semibold text-muted">
          {total}/{existentes}
        </span>
      }
    >
      <Card>
        <GradeEmblemas catalogo={catalogo} dados={dados} />
      </Card>
    </Section>
  )
}

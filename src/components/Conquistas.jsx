import { useEffect, useState } from 'react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { supabase } from '../lib/supabase.js'
import { resolveIcon } from '../lib/icons.js'
import { CATALOGO_EMBLEMAS } from '../lib/emblemas.js'
import { cn } from '../lib/cn'

// Conquistas (emblemas) da Minha jornada — medalhões no padrão cítrico.
// Conquistados aparecem em cítrico; os demais ficam em cinza (coleção).
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
  const conquistados = CATALOGO_EMBLEMAS.filter((e) => e.ganho(dados)).length

  return (
    <Section
      className="reveal reveal-1 mt-5"
      title="Conquistas"
      action={
        <span className="text-xs font-semibold text-muted">
          {conquistados}/{CATALOGO_EMBLEMAS.length}
        </span>
      }
    >
      <Card>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {CATALOGO_EMBLEMAS.map((e) => {
            const on = e.ganho(dados)
            const Icon = resolveIcon(e.icone)
            return (
              <div key={e.chave} className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={cn(
                    'grid h-14 w-14 place-items-center rounded-2xl',
                    on ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted-2',
                  )}
                >
                  <Icon size={24} />
                </span>
                <span
                  className={cn('text-[10px] leading-tight', on ? 'font-semibold' : 'text-muted-2')}
                >
                  {e.titulo}
                </span>
              </div>
            )
          })}
        </div>
      </Card>
    </Section>
  )
}

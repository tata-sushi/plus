import { useEffect, useState } from 'react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { supabase } from '../lib/supabase.js'
import { resolveIcon } from '../lib/icons.js'
import { CATALOGO_EMBLEMAS } from '../lib/emblemas.js'
import { signoDe } from '../lib/signo.js'
import { cn } from '../lib/cn'

// Seções extras da Minha jornada: Emblemas (conquistas) e Signo (com leitura
// profissional). Uma única chamada ao RPC minha_jornada_extra alimenta as duas.
export function JornadaExtra() {
  const [extra, setExtra] = useState(undefined) // undefined = carregando · null = sem dados

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
  const signo = signoDe(extra?.data_nascimento)

  return (
    <>
      {/* Emblemas */}
      <Section
        className="reveal reveal-3 mt-5"
        title="Emblemas"
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
                    className={cn(
                      'text-[10px] leading-tight',
                      on ? 'font-semibold' : 'text-muted-2',
                    )}
                  >
                    {e.titulo}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </Section>

      {/* Signo */}
      {signo && (
        <Section className="reveal reveal-3 mt-5" title="Seu signo">
          <Card>
            <div className="hstack gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl">
                {signo.emoji}
              </span>
              <div className="min-w-0">
                <div className="font-display text-base font-bold">{signo.nome}</div>
                <div className="text-xs text-muted">Elemento {signo.elemento}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{signo.review}</p>
          </Card>
        </Section>
      )}
    </>
  )
}

import { resolveIcon } from '../lib/icons.js'
import { CATALOGO_EMBLEMAS } from '../lib/emblemas.js'
import { cn } from '../lib/cn'

// Nº de emblemas conquistados dado o resumo { meses_casa, disc_feito, desafios_concluidos }.
export function contarEmblemas(dados) {
  return CATALOGO_EMBLEMAS.filter((e) => e.ganho(dados || {})).length
}

// Grade de medalhões (padrão cítrico). Presentacional — recebe o resumo por prop,
// serve para a Minha jornada (própria) e para o perfil visitado.
export function GradeEmblemas({ dados }) {
  const d = dados || {}
  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-4">
      {CATALOGO_EMBLEMAS.map((e) => {
        const on = e.ganho(d)
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
            <span className={cn('text-[10px] leading-tight', on ? 'font-semibold' : 'text-muted-2')}>
              {e.titulo}
            </span>
          </div>
        )
      })}
    </div>
  )
}

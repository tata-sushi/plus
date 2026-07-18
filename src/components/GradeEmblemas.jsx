import { resolveIcon } from '../lib/icons.js'
import { montarCategorias, avaliarEmblemas } from '../lib/emblemas.js'
import { cn } from '../lib/cn'

// Nº de emblemas conquistados dado o resumo do RPC minha_jornada_extra.
export function contarEmblemas(dados) {
  return avaliarEmblemas(dados).total
}

// Grade de medalhões (todos os emblemas numa grade só, sem separar por
// categoria). Presentacional — recebe o resumo por prop.
export function GradeEmblemas({ dados }) {
  const { ganhos } = avaliarEmblemas(dados)
  const emblemas = montarCategorias(dados).flatMap((c) => c.emblemas)
  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-4">
      {emblemas.map((e) => {
        const on = ganhos.has(e.chave)
        const Icon = resolveIcon(e.icone)
        return (
          <div key={e.chave} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-xl',
                on ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted-2',
              )}
            >
              <Icon size={17} />
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

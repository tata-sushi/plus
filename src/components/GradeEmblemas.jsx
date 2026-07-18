import { resolveIcon } from '../lib/icons.js'
import { montarCategorias, avaliarEmblemas } from '../lib/emblemas.js'
import { cn } from '../lib/cn'

// Nº de emblemas conquistados dado o resumo do RPC minha_jornada_extra.
export function contarEmblemas(dados) {
  return avaliarEmblemas(dados).total
}

// Grade de medalhões agrupada por categoria (TATÁ points, birthdays, school,
// leadership, influencers). Presentacional — recebe o resumo por prop.
export function GradeEmblemas({ dados }) {
  const { ganhos } = avaliarEmblemas(dados)
  const categorias = montarCategorias(dados).filter((c) => c.emblemas.length > 0)
  return (
    <div className="flex flex-col gap-5">
      {categorias.map((cat) => (
        <div key={cat.chave}>
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
            {cat.titulo}
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {cat.emblemas.map((e) => {
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
        </div>
      ))}
    </div>
  )
}

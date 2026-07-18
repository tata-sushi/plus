import { useState } from 'react'
import { resolveIcon } from '../lib/icons.js'
import { montarCategorias, avaliarEmblemas } from '../lib/emblemas.js'
import { cn } from '../lib/cn'

// Nº de emblemas conquistados dado o resumo do RPC minha_jornada_extra.
export function contarEmblemas(dados) {
  return avaliarEmblemas(dados).total
}

// Grade de medalhões — mostra SÓ os emblemas conquistados. Ao tocar num emblema,
// aparece uma sinalização discreta do que ele representa (some ao tocar de novo).
export function GradeEmblemas({ dados }) {
  const { ganhos } = avaliarEmblemas(dados)
  const emblemas = montarCategorias(dados)
    .flatMap((c) => c.emblemas)
    .filter((e) => ganhos.has(e.chave))
  const [ativo, setAtivo] = useState(null)
  const selecionado = emblemas.find((e) => e.chave === ativo)

  if (emblemas.length === 0) {
    return (
      <div className="py-2 text-center text-xs text-muted">
        Nenhuma conquista ainda. Complete desafios e participe pra desbloquear! 🎉
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {emblemas.map((e) => {
          const Icon = resolveIcon(e.icone)
          const on = e.chave === ativo
          return (
            <button
              key={e.chave}
              type="button"
              title={e.desc}
              onClick={() => setAtivo(on ? null : e.chave)}
              className="flex flex-col items-center gap-1.5 text-center tap"
            >
              <span
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent',
                  on && 'ring-2 ring-accent',
                )}
              >
                <Icon size={17} />
              </span>
              <span className="text-[10px] font-semibold leading-tight">{e.titulo}</span>
            </button>
          )
        })}
      </div>

      {selecionado && (
        <div className="mt-3 rounded-card bg-surface-2 px-3 py-2 text-center text-[11px] text-muted">
          <span className="font-semibold text-text">{selecionado.titulo}</span> · {selecionado.desc}
        </div>
      )}
    </div>
  )
}

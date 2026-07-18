import { useState } from 'react'
import { resolveIcon } from '../lib/icons.js'
import { avaliarCatalogo } from '../lib/emblemas.js'
import { cn } from '../lib/cn'

// Grade de medalhões — mostra SÓ os emblemas conquistados. Ao tocar num emblema,
// aparece uma sinalização discreta do que ele representa (some ao tocar de novo).
//  - catalogo: catálogo do RPC catalogo_emblemas()
//  - dados: métricas do colaborador (minha_jornada_extra / perfil_publico)
export function GradeEmblemas({ catalogo, dados }) {
  const { ganhosLista } = avaliarCatalogo(catalogo, dados)
  const [ativo, setAtivo] = useState(null)
  const selecionado = ganhosLista.find((e) => e.chave === ativo)

  if (ganhosLista.length === 0) {
    return (
      <div className="py-2 text-center text-xs text-muted">
        Nenhuma conquista ainda. Complete desafios e participe pra desbloquear! 🎉
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {ganhosLista.map((e) => {
          const Icon = resolveIcon(e.icone)
          const on = e.chave === ativo
          return (
            <button
              key={e.chave}
              type="button"
              title={e.descricao}
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
          <span className="font-semibold text-text">{selecionado.titulo}</span>
          {selecionado.descricao ? ` · ${selecionado.descricao}` : ''}
        </div>
      )}
    </div>
  )
}

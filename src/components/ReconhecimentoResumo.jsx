import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { carregarMotivos, iconeMotivo, rotuloMotivo } from '../lib/reconhecimento.js'

// Badges de reconhecimento de um colaborador (RPC reconhecimento_resumo):
// total + contagem por motivo. `recarregar` (qualquer valor que muda) força
// refazer a leitura — ex.: logo após reconhecer a pessoa.
export function ReconhecimentoResumo({ matricula, recarregar }) {
  const [resumo, setResumo] = useState(null) // { total, por_motivo }
  const [motivos, setMotivos] = useState([])

  useEffect(() => {
    let ativo = true
    carregarMotivos().then((m) => ativo && setMotivos(m))
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (!matricula) return
    let ativo = true
    supabase.rpc('reconhecimento_resumo', { p_matricula: matricula }).then(({ data }) => {
      if (ativo) setResumo(data?.[0] || data || null)
    })
    return () => {
      ativo = false
    }
  }, [matricula, recarregar])

  const total = Number(resumo?.total || 0)
  const porMotivo = resumo?.por_motivo || {}
  const itens = Object.entries(porMotivo)
    .map(([slug, n]) => ({ slug, n: Number(n) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)

  if (total === 0) {
    return (
      <p className="text-xs text-muted">
        Ainda sem reconhecimentos. Seja o primeiro a reconhecer o trabalho dele(a). 👏
      </p>
    )
  }

  return (
    <div>
      <div className="text-sm font-semibold">
        <span className="text-accent">{total}</span>{' '}
        {total === 1 ? 'reconhecimento' : 'reconhecimentos'}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {itens.map(({ slug, n }) => {
          const Icon = iconeMotivo(slug)
          return (
            <span
              key={slug}
              className="hstack gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
            >
              <Icon size={13} className="text-accent" />
              {rotuloMotivo(slug, motivos)}
              <span className="text-muted-2">{n}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

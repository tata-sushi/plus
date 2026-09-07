import { useEffect, useState } from 'react'
import { Loader2, FileSignature, ClipboardList, CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// Painel de Pendências do líder — SÓ leitura. Lista as demandas do sistema
// (assinaturas, avaliações de experiência…) roteadas para este líder pelo mapa
// unidade+departamento (tabela pendencia_responsavel). Não abre nada: mostra
// apenas a descrição da demanda. Quais tipos entram é controlado por flags no
// banco (pendencia_tipos.ativo) — enquanto nenhum estiver ligado, vem vazio.
//
// embutido=true → usado no topo do Quadros: some por completo quando não há
// pendências, pra não poluir a tela de quem só usa os quadros.

const ICONE = {
  assinatura: FileSignature,
  exp_colab: ClipboardList,
  exp_lider: ClipboardList,
}

export function PainelPendencias({ embutido = false }) {
  const [lista, setLista] = useState(null) // null = carregando

  useEffect(() => {
    let ativo = true
    supabase.rpc('minhas_pendencias').then(({ data }) => {
      if (ativo) setLista(Array.isArray(data) ? data : [])
    })
    return () => {
      ativo = false
    }
  }, [])

  // Embutido e vazio (ou ainda carregando): não ocupa espaço nenhum.
  if (embutido && (lista === null || lista.length === 0)) return null

  return (
    <section className={embutido ? 'mb-4' : ''}>
      <div className="hstack gap-1.5 px-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
        <CircleAlert size={12} /> Pendências{lista?.length ? ` (${lista.length})` : ''}
      </div>

      {lista === null ? (
        <div className="hstack justify-center py-10 text-muted-2">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted-2">
            <CircleAlert size={22} />
          </div>
          <p className="mx-auto mt-3 max-w-[260px] text-sm text-muted">
            Nenhuma pendência no momento. Assim que algo precisar da sua atenção, aparece aqui.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {lista.map((p, i) => {
            const Icon = ICONE[p.tipo] || CircleAlert
            return (
              <div
                key={`${p.tipo}-${p.colaborador_matricula}-${i}`}
                className={`hstack items-start gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug">{p.descricao}</span>
                  {p.colaborador_nome && (
                    <span className="mt-0.5 block truncate text-[11px] text-muted">{p.colaborador_nome}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default PainelPendencias

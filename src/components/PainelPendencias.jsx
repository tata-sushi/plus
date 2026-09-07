import { useEffect, useState } from 'react'
import { Loader2, CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// Painel de Pendências do líder — SÓ leitura. Segue o MESMO padrão dos quadros
// do Kanban: um "card" (ícone redondo + título + meta) e, indentada embaixo, a
// lista no estilo "minhas tarefas" (barrinha colorida + nome · demanda). Não
// abre nada. As demandas vêm de minhas_pendencias() (roteadas pelo mapa
// unidade+departamento); quais tipos entram é controlado por flags no banco.
//
// embutido=true → topo do Quadros: some por completo quando vazio.

// Cor da barrinha por tipo (igual ao esquema de cores dos cartões do Kanban).
const COR = {
  assinatura: '#f59e0b', // âmbar — documentos
  exp_colab: '#38bdf8', // azul — auto-avaliação do colaborador
  exp_lider: '#a78bfa', // roxo — avaliação que o líder faz
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

  // Embutido e vazio (ou carregando): não ocupa espaço.
  if (embutido && (lista === null || lista.length === 0)) return null

  if (lista === null) {
    return (
      <div className="hstack justify-center py-8 text-muted-2">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  }

  const n = lista.length

  return (
    <section className={embutido ? 'mb-3' : ''}>
      {/* Card no mesmo padrão dos quadros */}
      <div className="card hstack gap-2 py-2 pl-2 pr-2">
        <div className="hstack min-w-0 flex-1 gap-3 px-2 py-1.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-accent-soft text-accent">
            <CircleAlert size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-bold">Pendências</div>
            <div className="mt-0.5 hstack gap-3 text-[11px] text-muted">
              <span>
                {n} {n === 1 ? 'pendência' : 'pendências'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista indentada, estilo "minhas tarefas" */}
      {n === 0 ? (
        <div className="ml-5 mt-1.5 border-l border-line pl-3 py-1 text-[12px] text-muted">
          Nenhuma pendência no momento.
        </div>
      ) : (
        <div className="mb-1 ml-5 mt-1.5 flex flex-col gap-1 border-l border-line pl-3">
          {lista.map((p, i) => (
            <div
              key={`${p.tipo}-${p.colaborador_matricula}-${i}`}
              title={`${p.colaborador_nome} — ${p.descricao}`}
              className="hstack gap-2 rounded-lg px-2 py-1.5"
            >
              <span
                className="h-4 w-1 shrink-0 rounded-full"
                style={{ background: COR[p.tipo] || 'rgb(var(--muted-2) / 0.6)' }}
              />
              <span className="min-w-0 flex-1 truncate text-[12px]">
                <span className="font-medium text-text">{p.colaborador_nome}</span>
                <span className="text-muted"> · {p.descricao}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default PainelPendencias

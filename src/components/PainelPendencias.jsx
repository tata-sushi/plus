import { useEffect, useState } from 'react'
import { Loader2, CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// Painel de Pendências do líder — SÓ leitura, no formato "minhas tarefas" do
// Kanban: barrinha colorida + uma linha (nome · demanda). Não abre nada.
// As demandas vêm de minhas_pendencias() (roteadas pelo mapa unidade+departamento);
// quais tipos entram é controlado por flags no banco (pendencia_tipos.ativo).
//
// embutido=true → usado no topo do Quadros: some por completo quando vazio.

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

  return (
    <section className={embutido ? 'mb-3' : ''}>
      <div className="hstack gap-1.5 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
        <CircleAlert size={11} /> Pendências{lista?.length ? ` (${lista.length})` : ''}
      </div>

      {lista === null ? (
        <div className="hstack justify-center py-8 text-muted-2">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="mt-1 rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
          Nenhuma pendência no momento.
        </div>
      ) : (
        <div className="mt-0.5 flex flex-col gap-0.5">
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

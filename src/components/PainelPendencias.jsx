import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, CircleAlert, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Painel de Pendências (individual) — cada colaborador vê as PRÓPRIAS pendências.
// Segue o MESMO padrão dos quadros do Kanban: um "card" (ícone redondo + título
// + meta) e, indentada embaixo, a lista no estilo "minhas tarefas" (barrinha
// colorida + demanda). Tocar numa pendência leva à tela onde ela se resolve.
// As demandas vêm de minhas_pendencias(); quais tipos entram é controlado por
// flags no banco (pendencia_tipos.ativo).
//
// embutido=true → topo do Quadros: some por completo quando vazio.

// Cor da barrinha por tipo (igual ao esquema de cores dos cartões do Kanban).
const COR = {
  assinatura: '#f59e0b', // âmbar — documentos
  exp_colab: '#38bdf8', // azul — auto-avaliação do colaborador
  exp_lider: '#a78bfa', // roxo — avaliação que o líder faz
  lideranca: '#f472b6', // rosa — avaliação de liderança
  absenteismo: '#ef4444', // vermelho — falta sem devolutiva
  exame_colab: '#14b8a6', // teal — exame periódico (colaborador)
  exame_lider: '#14b8a6', // teal — exame periódico (líder)
}

// Para onde cada pendência leva ao ser tocada (atalho pra resolver).
// Tipos ausentes daqui são só leitura (ex.: exame_colab — o colaborador não agenda).
const ROTA = {
  assinatura: '/documentos',
  exp_colab: '/minha-experiencia',
  lideranca: '/minha-experiencia',
  exp_lider: '/governanca', // líder avalia o novato no portal de governança
  absenteismo: '/governanca', // líder dá a devolutiva da falta no portal
  exame_lider: '/governanca', // líder acompanha o exame do time no portal
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
          {lista.map((p, i) => {
            const rota = ROTA[p.tipo]
            const titulo = p.colaborador_nome ? `${p.colaborador_nome} — ${p.descricao}` : p.descricao
            const conteudo = (
              <>
                <span
                  className="h-4 w-1 shrink-0 rounded-full"
                  style={{ background: COR[p.tipo] || 'rgb(var(--muted-2) / 0.6)' }}
                />
                <span className="min-w-0 flex-1 truncate text-[12px]">
                  {p.colaborador_nome ? (
                    <>
                      <span className="font-medium text-text">{p.colaborador_nome}</span>
                      <span className="text-muted"> · {p.descricao}</span>
                    </>
                  ) : (
                    <span className="text-text">{p.descricao}</span>
                  )}
                </span>
                {rota && <ChevronRight size={14} className="shrink-0 text-muted-2" />}
              </>
            )
            const key = `${p.tipo}-${p.colaborador_matricula}-${i}`
            const cls = 'hstack gap-2 rounded-lg px-2 py-1.5'
            return rota ? (
              <Link key={key} to={rota} title={titulo} onClick={tapHaptic} className={`${cls} tap hover:bg-fill`}>
                {conteudo}
              </Link>
            ) : (
              <div key={key} title={titulo} className={cls}>
                {conteudo}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default PainelPendencias

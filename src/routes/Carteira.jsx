import { useEffect, useState } from 'react'
import {
  Loader2,
  Trophy,
  CalendarCheck2,
  Gift,
  ArrowLeftRight,
  Coins,
  Receipt,
  KanbanSquare,
  CalendarX,
  Snowflake,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Fundo } from '../components/IntroDesafio.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

// Ícone + rótulo por categoria — um padrão pra tudo, diferenciando só as
// principais (desafio, escala, recompensa, transferência). O resto usa o padrão.
const CATEG = {
  desafio: { label: 'Desafio', Icon: Trophy },
  escala: { label: 'Escala', Icon: CalendarCheck2 },
  recompensa: { label: 'Recompensa', Icon: Gift },
  transferencia: { label: 'Transferência', Icon: ArrowLeftRight },
  kanban: { label: 'Kanban', Icon: KanbanSquare },
  absenteismo: { label: 'Penalidade', Icon: CalendarX },
}
function metaCateg(cat) {
  return CATEG[cat] || { label: 'Lançamento', Icon: Coins }
}
function fmtData(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return ''
  }
}
// data_falta vem como 'YYYY-MM-DD' (date puro) — formata sem fuso pra não voltar 1 dia.
function fmtDataFalta(d) {
  try {
    const [y, m, dia] = String(d).split('-')
    return `${dia}/${m}/${y.slice(2)}`
  } catch {
    return ''
  }
}

// Histórico de transações da carteira do colaborador (extrato de pontos).
export function Carteira() {
  const [saldo, setSaldo] = useState(null)
  const [itens, setItens] = useState(null)
  const [congelado, setCongelado] = useState(0)
  const [congelList, setCongelList] = useState([])

  useEffect(() => {
    let ativo = true
    supabase.rpc('meu_saldo').then(({ data }) => {
      if (ativo) setSaldo(Number(data) || 0)
    })
    supabase.rpc('minha_carteira_extrato').then(({ data, error }) => {
      if (ativo) setItens(error ? [] : data || [])
    })
    supabase.rpc('meus_pontos_congelados').then(({ data }) => {
      if (ativo) setCongelado(Number(data) || 0)
    })
    supabase.rpc('meus_congelamentos').then(({ data }) => {
      if (ativo) setCongelList(data || [])
    })
    return () => {
      ativo = false
    }
  }, [])

  return (
    <>
      <Header />
      <Voltar to="/mais" />

      {/* Topo — só o fundo dos desafios + saldo simples (sem ícone/frase) */}
      <div className="px-5 pt-3">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-7 text-center">
          <Fundo variante={0} />
          <div className="relative">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Saldo atual
            </div>
            <div className="mt-1 font-display text-4xl font-bold text-accent">
              {saldo == null ? '—' : saldo.toLocaleString('pt-BR')}
              <span className="ml-1 text-lg font-semibold">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pontos congelados por falta em análise */}
      {congelado > 0 && (
        <div className="px-5 pt-3">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
            <div className="hstack gap-2">
              <Snowflake size={18} className="shrink-0 text-sky-400" />
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {congelado.toLocaleString('pt-BR')} pts congelados
                </div>
                <div className="text-[11px] text-muted">
                  Falta em análise — bloqueados pra gastar. Se justificada, voltam; se confirmada,
                  saem de vez.
                </div>
              </div>
            </div>
            {congelList.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-sky-500/20 pt-2">
                {congelList.map((c, i) => (
                  <div key={i} className="hstack justify-between text-[11px]">
                    <span className="text-muted">Falta em {fmtDataFalta(c.data_falta)}</span>
                    <span className="text-muted-2 tabular-nums">
                      {c.dias_restantes > 0 ? `vence em ${c.dias_restantes}d` : 'vence hoje'} ·{' '}
                      {c.pontos} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Section className="mt-5 pb-24" title="Histórico de transações">
        {itens == null ? (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : itens.length === 0 ? (
          <div className="card grid place-items-center gap-2 px-6 py-12 text-center text-muted">
            <Receipt size={28} className="text-muted-2" />
            <p className="text-sm">Nenhuma transação ainda. Conclua desafios pra pontuar!</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {itens.map((t, i) => {
              const m = metaCateg(t.categoria)
              const pos = (t.pontos ?? 0) >= 0
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    i > 0 && 'border-t border-line',
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                    <m.Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.descricao || m.label}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      <span>
                        {m.label} · {fmtData(t.created_at)}
                      </span>
                      {t.conta_ranking === false && (
                        <span className="rounded bg-surface-2 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-muted-2">
                          só carteira
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'shrink-0 text-sm font-bold tabular-nums',
                      pos ? 'text-accent' : 'text-danger',
                    )}
                  >
                    {pos ? '+' : ''}
                    {(t.pontos ?? 0).toLocaleString('pt-BR')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </>
  )
}

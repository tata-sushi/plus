import { useEffect, useState } from 'react'
import {
  Loader2,
  Wallet,
  Trophy,
  CalendarCheck2,
  ClipboardCheck,
  Gift,
  ArrowLeftRight,
  History,
  Receipt,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

// Rótulo + ícone amigável por origem do lançamento.
const ORIGEM = {
  treinamento: { label: 'Desafio concluído', Icon: Trophy },
  escala_check: { label: 'Escala confirmada', Icon: CalendarCheck2 },
  escala_lider: { label: 'Revisão de escala', Icon: ClipboardCheck },
  resgate: { label: 'Resgate', Icon: Gift },
  transferencia: { label: 'Transferência', Icon: ArrowLeftRight },
  historico: { label: 'Histórico', Icon: History },
}
function metaOrigem(o) {
  return ORIGEM[o] || { label: 'Lançamento', Icon: Wallet }
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

// Histórico de transações da carteira do colaborador (extrato de pontos).
export function Carteira() {
  const [saldo, setSaldo] = useState(null)
  const [itens, setItens] = useState(null)

  useEffect(() => {
    let ativo = true
    supabase.rpc('meu_saldo').then(({ data }) => {
      if (ativo) setSaldo(Number(data) || 0)
    })
    supabase.rpc('minha_carteira_extrato').then(({ data, error }) => {
      if (ativo) setItens(error ? [] : data || [])
    })
    return () => {
      ativo = false
    }
  }, [])

  return (
    <>
      <Header />
      <Voltar to="/mais" />

      <div className="px-5 pt-3">
        <div className="card flex flex-col items-center gap-1 p-6 text-center">
          <div className="hstack gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
            <Wallet size={13} /> Saldo atual
          </div>
          <div className="font-display text-4xl font-bold text-accent">
            {saldo == null ? '—' : saldo.toLocaleString('pt-BR')}
            <span className="ml-1 text-lg font-semibold">pts</span>
          </div>
        </div>
      </div>

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
              const m = metaOrigem(t.origem)
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
                    <div className="text-[11px] text-muted">
                      {m.label} · {fmtData(t.created_at)}
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

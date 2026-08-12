import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Loader2, Trophy } from 'lucide-react'
import { Avatar } from './Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR')
const dMes = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : ''

// Seção principal do Ranking: a "corrida" da semana (top 5 que mais pontuaram
// nos últimos 7 dias) + os coroados das semanas anteriores (histórico). Pontua
// só atividade da semana — o saldo migrado (origem 'historico') não entra.
export function DestaquesSemana() {
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)

  useEffect(() => {
    let ativo = true
    supabase.rpc('destaques_semana').then(({ data }) => {
      if (ativo) setDados(data || { atual: [], historico: [] })
    })
    return () => {
      ativo = false
    }
  }, [])

  if (dados === null) {
    return (
      <div className="px-5 pt-3">
        <div className="hero-card hstack justify-center py-8 text-muted-2">
          <Loader2 size={20} className="animate-spin" />
        </div>
      </div>
    )
  }

  const atual = dados.atual || []
  const historico = dados.historico || []

  return (
    <div className="px-5 pt-3">
      <div className="hero-card p-4">
        <div className="hstack items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Trophy size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-bold">Destaques da semana</div>
            <div className="text-[11px] font-semibold text-accent">1º leva +25 pts 🏆</div>
          </div>
        </div>

        {atual.length === 0 ? (
          <div className="mt-3 rounded-card border border-line bg-surface px-3.5 py-5 text-center text-xs text-muted">
            Ninguém pontuou ainda esta semana. Bora abrir a corrida? 🚀
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {atual.map((c, i) => (
              <button
                key={c.matricula}
                onClick={() => navigate(`/perfil/${c.matricula}`)}
                className={cn(
                  'hstack items-center gap-3 rounded-card px-3 py-2 text-left tap',
                  i === 0 ? 'bg-accent-soft' : 'bg-surface',
                )}
              >
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                    i === 0 ? 'bg-accent text-black' : 'bg-surface-2 text-muted',
                  )}
                >
                  {i + 1}
                </span>
                <Avatar
                  name={c.nome}
                  src={c.avatar_url}
                  size={34}
                  className={i === 0 ? 'ring-2 ring-accent' : ''}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {(c.nome || '').split(' ').slice(0, 2).join(' ')}
                    {i === 0 && <Crown size={13} className="ml-1 inline align-[-1px] text-accent" />}
                  </div>
                  <div className="truncate text-[11px] text-muted">
                    {c.departamento}
                    {c.departamento && c.unidade ? ' · ' : ''}
                    {c.unidade}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-accent">
                  {fmt(c.pontos)}
                  <span className="ml-0.5 text-[10px] font-medium text-muted">pts</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {historico.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 hstack gap-1 px-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-2">
              <Crown size={11} /> Coroados
            </div>
            <div className="flex flex-col gap-1.5">
              {historico.map((h) => (
                <button
                  key={h.semana}
                  onClick={() => navigate(`/perfil/${h.matricula}`)}
                  className="hstack items-center gap-3 rounded-card bg-surface px-3 py-2 text-left tap"
                >
                  <Avatar name={h.nome} src={h.avatar_url} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {(h.nome || '').split(' ').slice(0, 2).join(' ')}
                    </div>
                    <div className="truncate text-[11px] text-muted">
                      {h.departamento}
                      {h.departamento && h.unidade ? ' · ' : ''}
                      {h.unidade}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-muted-2">
                    sem. {dMes(h.semana)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ChevronRight, Gift } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { currentUser, jornadaResumo } from '../lib/mockData.js'
import { useCountUp } from '../lib/useCountUp.js'

export function Jornada() {
  const saldoAnimado = useCountUp(currentUser.pontosCarteira)
  return (
    <>
      <Header title="Minha Jornada" />

      {/* Perfil + rank */}
      <div className="px-5">
        <div className="hero-card reveal p-4">
          <div className="hstack gap-3">
            <Avatar name={currentUser.nome} size={56} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{currentUser.nome}</div>
              <div className="text-xs text-muted">
                {currentUser.cargo} · {currentUser.loja}
              </div>
            </div>
          </div>
          <div className="mt-4 hstack justify-between text-xs">
            <span className="font-semibold text-muted">{currentUser.rank}</span>
            <span className="hstack gap-1 font-semibold text-accent">
              Próximo: {currentUser.proximoRank}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar value={jornadaResumo.progressoRank} />
          </div>
          <div className="mt-1 text-right text-[11px] text-muted">
            {Math.round(jornadaResumo.progressoRank * 100)}%
          </div>
        </div>
      </div>

      {/* Carteira / recompensas */}
      <Section className="reveal reveal-1 mt-5" title="Carteira de pontos">
        <Card>
          <div className="hstack justify-between">
            <div>
              <div className="text-xs text-muted">Saldo atual</div>
              <div className="font-display text-2xl font-bold text-accent">
                {saldoAnimado.toLocaleString('pt-BR')} pts
              </div>
            </div>
            <Link to="/recompensas" className="btn-primary">
              <Gift size={16} /> Resgatar
            </Link>
          </div>
        </Card>
      </Section>

      {/* Stats */}
      <Section className="reveal reveal-2 mt-5" title="Meus indicadores">
        <div className="grid grid-cols-2 gap-2">
          {jornadaResumo.stats.map((s) => (
            <Card key={s.label} className="!p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted">{s.label}</div>
              <div className="mt-1 font-display text-base font-bold">{s.valor}</div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Ações */}
      <Section className="reveal reveal-3 mt-5" title="Minhas ações">
        <div className="card overflow-hidden">
          {jornadaResumo.minhasAcoes.map((a, idx) => (
            <button
              key={a.id}
              className={`hstack w-full justify-between px-4 py-3.5 tap ${
                idx > 0 ? 'border-t border-white/5' : ''
              }`}
            >
              <span className="text-sm font-semibold">{a.label}</span>
              <span className="hstack gap-1 text-xs text-muted">
                {a.hint} <ChevronRight size={14} />
              </span>
            </button>
          ))}
        </div>
      </Section>
    </>
  )
}

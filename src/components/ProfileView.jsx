import { Link } from 'react-router-dom'
import { ChevronRight, Gift } from 'lucide-react'
import { Header } from './Header.jsx'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { Avatar } from './Avatar.jsx'
import { ProgressBar } from './ProgressBar.jsx'
import { MeuPerfil } from './MeuPerfil.jsx'
import { useCountUp } from '../lib/useCountUp.js'
import { minhasAcoes } from '../lib/mockData.js'

export function ProfileView({ colaborador, isSelf }) {
  const saldoAnimado = useCountUp(colaborador.pontosCarteira)

  return (
    <>
      <Header title={isSelf ? 'Minha Jornada' : colaborador.nome} />

      {/* Perfil + rank */}
      <div className="px-5">
        <div className="hero-card reveal p-4">
          <div className="hstack gap-3">
            <Avatar name={colaborador.nome} src={colaborador.avatar} size={56} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{colaborador.nome}</div>
              <div className="text-xs text-muted">
                {colaborador.cargo} · {colaborador.loja}
              </div>
            </div>
          </div>
          <div className="mt-4 hstack justify-between text-xs">
            <span className="font-semibold text-muted">{colaborador.rank}</span>
            <span className="hstack gap-1 font-semibold text-accent">
              Próximo: {colaborador.proximoRank}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar value={colaborador.progressoRank} />
          </div>
          <div className="mt-1 text-right text-[11px] text-muted">
            {Math.round(colaborador.progressoRank * 100)}%
          </div>
        </div>
      </div>

      {/* Carteira */}
      <Section className="reveal reveal-1 mt-5" title="Carteira de pontos">
        <Card>
          <div className="hstack justify-between">
            <div>
              <div className="text-xs text-muted">{isSelf ? 'Saldo atual' : 'Saldo'}</div>
              <div className="font-display text-2xl font-bold text-accent">
                {saldoAnimado.toLocaleString('pt-BR')} pts
              </div>
            </div>
            {isSelf && (
              <Link to="/recompensas" className="btn-primary">
                <Gift size={16} /> Resgatar
              </Link>
            )}
          </div>
        </Card>
      </Section>

      {/* Stats */}
      <Section className="reveal reveal-2 mt-5" title="Indicadores">
        <div className="grid grid-cols-2 gap-2">
          {colaborador.stats.map((s) => (
            <Card key={s.label} className="!p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted">{s.label}</div>
              <div className="mt-1 font-display text-base font-bold">{s.valor}</div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Meu perfil (DISC) — só no próprio perfil */}
      {isSelf && <MeuPerfil />}

      {/* Ações — só para o próprio perfil */}
      {isSelf && (
        <Section className="reveal reveal-3 mt-5" title="Minhas ações">
          <div className="card overflow-hidden">
            {minhasAcoes.map((a, idx) => (
              <button
                key={a.id}
                className={`hstack w-full justify-between px-4 py-3.5 tap ${
                  idx > 0 ? 'border-t border-line' : ''
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
      )}
    </>
  )
}

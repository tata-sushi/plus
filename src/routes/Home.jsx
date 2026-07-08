import { Link } from 'react-router-dom'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { StatCard } from '../components/StatCard.jsx'
import { Card } from '../components/Card.jsx'
import { IconTile } from '../components/IconTile.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import {
  currentUser,
  destaquesDoDia,
  urgentes,
  acessosRapidos,
  minhaProgressao,
} from '../lib/mockData.js'

export function Home() {
  return (
    <>
      <Header
        right={
          <button className="grid h-9 w-9 place-items-center rounded-full bg-surface tap" aria-label="Atualizar">
            <RefreshCw size={18} />
          </button>
        }
      />

      {/* Hero de saudação */}
      <div className="px-5 pt-2">
        <div className="hero-card reveal p-4">
          <div className="hstack gap-3">
            <Avatar name={currentUser.nome} size={48} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-bold">Olá, {currentUser.primeiroNome}!</div>
              <div className="mt-0.5 truncate text-xs text-muted">
                {currentUser.cargo} · {currentUser.loja}
              </div>
            </div>
            <span className="pill bg-accent text-black text-[10px]">{currentUser.rank}</span>
          </div>
          <div className="mt-4 hstack justify-between text-[11px]">
            <span className="text-muted">Rumo ao nível {currentUser.proximoRank}</span>
            <span className="font-semibold text-accent">
              {Math.round(currentUser.progressoRank * 100)}%
            </span>
          </div>
          <div className="mt-1.5">
            <ProgressBar value={currentUser.progressoRank} />
          </div>
        </div>
      </div>

      {/* Destaques do dia */}
      <Section className="reveal reveal-1 mt-5" title="Destaques do dia">
        <div className="grid grid-cols-3 gap-2">
          {destaquesDoDia.map((d) => (
            <StatCard key={d.label} label={d.label} valor={d.valor} hint={d.hint} trend={d.trend} />
          ))}
        </div>
      </Section>

      {/* Urgentes */}
      <Section className="reveal reveal-2 mt-5" title="Urgentes">
        {urgentes.map((u) => (
          <Card key={u.id} highlight className="mb-2">
            <div className="hstack justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-base font-bold">{u.titulo}</div>
                <div className="mt-1 text-xs text-muted">{u.quando}</div>
              </div>
              <Link to="/comunicados" className="hstack shrink-0 gap-1 text-xs font-semibold text-accent">
                Ver detalhes <ChevronRight size={14} />
              </Link>
            </div>
          </Card>
        ))}
      </Section>

      {/* Acessos rápidos */}
      <Section className="reveal reveal-3 mt-5" title="Acessos rápidos">
        <div className="grid grid-cols-3 gap-2">
          {acessosRapidos.map((a) => (
            <IconTile key={a.id} icon={a.icon} label={a.label} to={a.to} />
          ))}
        </div>
      </Section>

      {/* Minha progressão */}
      <Section className="reveal reveal-4 mt-5" title="Minha progressão">
        <Card>
          <div className="hstack justify-between">
            <span className="text-sm text-muted">{minhaProgressao.label}</span>
            <span className="text-sm font-semibold text-accent">
              {Math.round(minhaProgressao.valor * 100)}%
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar value={minhaProgressao.valor} />
          </div>
        </Card>
      </Section>
    </>
  )
}

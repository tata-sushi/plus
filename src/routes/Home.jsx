import { Link } from 'react-router-dom'
import { ChevronRight, RefreshCw, Flag, Trophy, UsersRound } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { IconTile } from '../components/IconTile.jsx'
import { PromoCard } from '../components/PromoCard.jsx'
import { DesafiosDecor, RecompensasDecor, ComunidadeDecor } from '../components/promoDecor.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { resolveIcon } from '../lib/icons.js'
import { currentUser, menuDoDia, comunicados, acessosRapidos } from '../lib/mockData.js'

const ultimoComunicado = comunicados[0]

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

      {/* Menu do dia */}
      <Section className="reveal reveal-1 mt-5" title="Menu do dia">
        <Card>
          <div className="text-xs font-semibold text-muted">{menuDoDia.dataLabel}</div>
          <div className="mt-3 flex flex-col gap-3">
            {menuDoDia.itens.map((item, idx) => {
              const Icon = resolveIcon(item.icon)
              return (
                <div
                  key={item.label}
                  className={`hstack gap-3 ${idx > 0 ? 'border-t border-white/5 pt-3' : ''}`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted">{item.label}</div>
                    <div className="text-sm font-semibold">{item.valor}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </Section>

      {/* Comunicado */}
      <Section className="reveal reveal-2 mt-5" title="Comunicado">
        <Card highlight={ultimoComunicado.urgente}>
          <div className="hstack justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display text-base font-bold leading-snug">{ultimoComunicado.titulo}</div>
              <div className="mt-1 text-xs text-muted">{ultimoComunicado.resumo}</div>
            </div>
            <Link to="/comunicados" className="hstack shrink-0 gap-1 text-xs font-semibold text-accent">
              Ver detalhes <ChevronRight size={14} />
            </Link>
          </div>
        </Card>
      </Section>

      {/* Cards de destaque */}
      <Section className="mt-5 flex flex-col gap-3">
        <PromoCard
          to="/treinamentos"
          badgeIcon={Flag}
          title="Desafios"
          subtitle="Confira suas trilhas de aprendizados"
          decor={DesafiosDecor}
          className="reveal reveal-1"
        />
        <PromoCard
          to="/recompensas"
          badgeIcon={Trophy}
          title="Recompensas"
          subtitle="Conheça nossas recompensas"
          decor={RecompensasDecor}
          className="reveal reveal-2"
        />
        <PromoCard
          to="/comunidade"
          badgeIcon={UsersRound}
          title="Comunidade"
          subtitle="Curta, compartilhe e interaja com diferentes equipes"
          decor={ComunidadeDecor}
          className="reveal reveal-3"
        />
      </Section>

      {/* Acessos rápidos */}
      <Section className="reveal reveal-4 mt-5" title="Acessos rápidos">
        <div className="grid grid-cols-3 gap-2">
          {acessosRapidos.map((a) => (
            <IconTile key={a.id} icon={a.icon} label={a.label} to={a.to} />
          ))}
        </div>
      </Section>
    </>
  )
}

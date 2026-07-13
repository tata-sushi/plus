import { Link } from 'react-router-dom'
import { ChevronRight, Flag, Trophy, UsersRound, Megaphone } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { IconTile } from '../components/IconTile.jsx'
import { PromoCard } from '../components/PromoCard.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { resolveIcon } from '../lib/icons.js'
import { currentUser, menuDoDia, comunicados, acessosRapidos } from '../lib/mockData.js'

const ultimoComunicado = comunicados[0]

export function Home() {
  return (
    <>
      <Header />

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

      {/* Menu do dia — uma linha */}
      <Section className="reveal reveal-1 mt-5" title="Menu do dia">
        <Card className="!py-3">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            {menuDoDia.itens.map((item, idx) => {
              const Icon = resolveIcon(item.icon)
              return (
                <div key={item.label} className="hstack shrink-0 gap-3">
                  {idx > 0 && <span className="h-4 w-px shrink-0 bg-carbon/60" />}
                  <span className="hstack shrink-0 gap-1.5">
                    <Icon size={15} className="shrink-0 text-accent" />
                    <span className="whitespace-nowrap text-sm font-semibold">{item.valor}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </Section>

      {/* Comunicado */}
      <Section className="reveal reveal-2 mt-5" title="Comunicado">
        <Link to="/comunicados" className="card tap flex items-center gap-3 p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-accent/40 bg-accent-soft text-accent shadow-glow">
            <Megaphone size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-bold leading-snug">{ultimoComunicado.titulo}</div>
            <div className="mt-1 text-xs text-muted">{ultimoComunicado.resumo}</div>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-accent/40 text-accent">
            <ChevronRight size={18} />
          </span>
        </Link>
      </Section>

      {/* TATÁ PLUS — cards principais */}
      <Section className="mt-5" title="TATÁ PLUS">
        <div className="flex flex-col gap-3">
          <PromoCard
            to="/treinamentos"
            badgeIcon={Flag}
            title="Treinamentos"
            subtitle="Confira suas trilhas de aprendizados"
            className="reveal reveal-1"
          />
          <PromoCard
            to="/recompensas"
            badgeIcon={Trophy}
            title="Recompensas"
            subtitle="Conheça nossas recompensas"
            className="reveal reveal-2"
          />
          <PromoCard
            to="/comunidade"
            badgeIcon={UsersRound}
            title="Comunidade"
            subtitle="Curta, compartilhe e interaja com diferentes equipes"
            className="reveal reveal-3"
          />
        </div>
      </Section>

      {/* Acesso rápido — atalhos */}
      <Section className="reveal reveal-1 mt-5" title="Acesso Rápido">
        <div className="grid grid-cols-2 gap-2">
          {acessosRapidos.map((a) => (
            <IconTile key={a.id} icon={a.icon} label={a.label} to={a.to} variant={a.variant} />
          ))}
        </div>
      </Section>
    </>
  )
}

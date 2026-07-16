import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Gift, Plus, ChevronRight } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { PromoCard } from '../components/PromoCard.jsx'
import { ProgressRing } from '../components/ProgressRing.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { DestaqueBanner } from '../components/DestaqueBanner.jsx'
import { resolveIcon } from '../lib/icons.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { currentUser, menuDoDia } from '../lib/mockData.js'

const tataPlusCards = [
  {
    to: '/treinamentos',
    badgeIcon: Flag,
    title: 'Treinamentos',
    subtitle: 'Confira suas trilhas de aprendizados',
  },
  {
    to: '/recompensas',
    badgeIcon: Gift,
    title: 'Recompensas',
    subtitle: 'Conheça nossas recompensas',
  },
]

export function Home() {
  const { usuario } = useAuth()
  const nome = usuario?.nome || currentUser.nome
  const primeiroNome = usuario?.primeiroNome || currentUser.primeiroNome
  const cargo = usuario?.cargo || currentUser.cargo
  const loja = usuario?.loja || currentUser.loja

  const [tataIdx, setTataIdx] = useState(0)

  const cards = tataPlusCards

  // Progresso real de desafios (para o anel do card de identificação)
  const [progresso, setProgresso] = useState(null)
  useEffect(() => {
    let ativo = true
    supabase.rpc('meu_progresso_desafios').then(({ data }) => {
      if (ativo) setProgresso(data?.[0] ?? null)
    })
    return () => {
      ativo = false
    }
  }, [])

  // Destaque rotativo: um por visita (cicla a cada vez que abre a home)
  const [destaque, setDestaque] = useState(null)
  useEffect(() => {
    let ativo = true
    supabase.rpc('destaques').then(({ data }) => {
      if (!ativo) return
      const lista = data || []
      if (!lista.length) {
        setDestaque(null)
        return
      }
      // Comunicado tem prioridade: se houver, mostra ele; senão, rotaciona
      const com = lista.find((x) => x.categoria === 'comunicado')
      if (com) {
        setDestaque(com)
        return
      }
      const k = 'tp_destaque_rot'
      const i = Number(localStorage.getItem(k) || '0') % lista.length
      localStorage.setItem(k, String((i + 1) % 100000))
      setDestaque(lista[i])
    })
    return () => {
      ativo = false
    }
  }, [])

  return (
    <>
      <Header />

      {/* Card de identificação — compacto, com anel de progresso dos desafios */}
      <div className="px-5 pt-2 hxs:pt-1">
        <div className="hero-card reveal hstack gap-3 p-4 hsm:p-3">
          <Avatar name={nome} src={usuario?.avatarUrl} size={48} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-bold">Olá, {primeiroNome}!</div>
            <div className="mt-0.5 truncate text-xs text-muted">
              {cargo}
              {loja ? ` · ${loja}` : ''}
            </div>
          </div>
          <ProgressRing value={(progresso?.pct ?? 0) / 100} size={54} stroke={5} />
        </div>
      </div>

      {/* Menu do dia — uma linha com scroll lateral e botão + fixo à direita */}
      <Section className="reveal reveal-1 mt-4 hsm:mt-3" title="Menu do dia">
        <Card className="relative overflow-hidden !p-0">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-3 pl-4 pr-16">
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
          <Link
            to="/cardapio"
            aria-label="Ver cardápio da semana"
            className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-surface from-60% to-transparent pl-6 pr-3 tap"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent-soft text-accent">
              <Plus size={16} />
            </span>
          </Link>
        </Card>
      </Section>

      {/* Notícias — banner (comunicado prioriza; senão rotaciona) */}
      {destaque && (
        <Section className="reveal reveal-3 mt-4 hsm:mt-3" title="Notícias">
          <DestaqueBanner d={destaque} />
        </Section>
      )}

      {/* TATÁ PLUS — carrossel horizontal (um card por vez) */}
      <Section className="mt-4 hsm:mt-3" title="TATÁ PLUS">
        <div className="relative">
          <div
            onScroll={(e) => {
              const el = e.currentTarget
              const passo = (el.firstElementChild?.clientWidth || el.clientWidth) + 12
              setTataIdx(Math.round(el.scrollLeft / passo))
            }}
            className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 no-scrollbar"
          >
            {cards.map((c, i) => (
              <PromoCard
                key={c.to}
                to={c.to}
                badgeIcon={c.badgeIcon}
                title={c.title}
                subtitle={c.subtitle}
                bgClassName={c.bgClassName}
                badgeClassName={c.badgeClassName}
                textClassName={c.textClassName}
                className={`w-full shrink-0 snap-start reveal-${i + 1}`}
              />
            ))}
          </div>
          {tataIdx < cards.length - 1 && (
            <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-80">
              <ChevronRight size={20} className="animate-nudge text-muted" />
            </span>
          )}
        </div>
      </Section>

    </>
  )
}

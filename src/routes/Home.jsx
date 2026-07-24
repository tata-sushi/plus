import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Gift, Star, Network } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { PromoCard } from '../components/PromoCard.jsx'
import { AtalhosGovernanca } from '../components/AtalhosGovernanca.jsx'
import { ProgressRing } from '../components/ProgressRing.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { Carrossel } from '../components/Carrossel.jsx'
import { resolveIcon } from '../lib/icons.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { useDesktop } from '../lib/useDesktop.js'
import { useDesktopCanvas } from '../lib/desktopCanvas.js'
import { supabase } from '../lib/supabase.js'
const TIPO_ICON = { principal: 'UtensilsCrossed', guarnicao: 'Salad', salada: 'Salad', sobremesa: 'IceCreamBowl', bebida: 'Wine', outro: 'Utensils' }
function gruposDia(itens) {
  const ordem = ['principal', 'guarnicao', 'salada', 'sobremesa', 'bebida', 'outro']
  const by = {}
  ;(itens || []).forEach((it) => {
    ;(by[it.tipo] = by[it.tipo] || []).push(it.item)
  })
  return ordem.filter((t) => by[t]).map((t) => ({ icon: TIPO_ICON[t] || 'Utensils', valor: by[t].join(', ') }))
}
const padD = (n) => String(n).padStart(2, '0')
const isoLocal = (d) => d.getFullYear() + '-' + padD(d.getMonth() + 1) + '-' + padD(d.getDate())
function mondayISO() {
  const h = new Date()
  const x = new Date(h.getFullYear(), h.getMonth(), h.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return isoLocal(x)
}

const sugestoesCards = [
  {
    to: '/treinamentos',
    badgeIcon: Flag,
    title: 'Desafios',
    subtitle: 'Confira suas trilhas',
  },
  {
    to: '/recompensas',
    badgeIcon: Gift,
    title: 'Recompensas',
    subtitle: 'Conheça e resgate a sua',
  },
  {
    to: '/cardapio',
    badgeIcon: Star,
    title: 'Cardápio',
    subtitle: 'Avalie a refeição do dia',
  },
  {
    to: '/organograma',
    badgeIcon: Network,
    title: 'Organograma',
    subtitle: 'Conheça nossos líderes',
  },
]

export function Home() {
  const { usuario } = useAuth()
  const carregandoPerfil = !!usuario?.perfilPendente
  const nome = usuario?.nome || 'Colaborador'
  const primeiroNome = usuario?.primeiroNome || (usuario?.nome || 'Colaborador').split(' ')[0]

  const [menuHoje, setMenuHoje] = useState(null)
  useEffect(() => {
    let ativo = true
    supabase.rpc('cardapio_app', { p_inicio: mondayISO() }).then(({ data }) => {
      if (!ativo) return
      const hj = isoLocal(new Date())
      const d = (data || []).find((x) => x.data === hj)
      setMenuHoje(d ? { resumo: d.resumo, grupos: gruposDia(d.itens) } : { grupos: [] })
    })
    return () => {
      ativo = false
    }
  }, [])
  const cargo = usuario?.cargo || ''
  const loja = usuario?.loja || ''

  const cards = sugestoesCards
  const desktop = useDesktop()
  const { setCanvas } = useDesktopCanvas()

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

  // Notícias: carrossel com todos os destaques (já ordenados por prioridade
  // no RPC — aniversário e comunicado primeiro).
  const [destaques, setDestaques] = useState([])
  useEffect(() => {
    let ativo = true
    supabase.rpc('destaques').then(({ data }) => {
      if (ativo) setDestaques(data || [])
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
          {carregandoPerfil ? (
            <span className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-fill" />
          ) : (
            <Avatar name={nome} src={usuario?.avatarUrl} size={48} />
          )}
          <div className="min-w-0 flex-1">
            {carregandoPerfil ? (
              <>
                <span className="block h-5 w-36 max-w-[70%] animate-pulse rounded bg-fill" />
                <span className="mt-2 block h-3 w-24 max-w-[45%] animate-pulse rounded bg-fill" />
              </>
            ) : (
              <>
                <div className="font-display text-lg font-bold">Olá, {primeiroNome}!</div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  {cargo}
                  {loja ? ` · ${loja}` : ''}
                </div>
              </>
            )}
          </div>
          {carregandoPerfil ? (
            <span className="h-[54px] w-[54px] shrink-0 animate-pulse rounded-full bg-fill" />
          ) : (
            <ProgressRing value={(progresso?.pct ?? 0) / 100} size={54} stroke={5} />
          )}
        </div>
      </div>

      {/* Menu do dia — linha com scroll lateral e botão de avaliação (estrela) fixo à direita */}
      <Section className="reveal reveal-1 mt-4 hsm:mt-3" title="Menu do dia">
        <Card className="relative overflow-hidden !p-0">
          <div className="flex items-stretch">
            <div className="flex grow items-center gap-3 overflow-x-auto no-scrollbar py-3 pl-4 pr-2">
              {(menuHoje?.grupos || []).map((item, idx) => {
                const Icon = resolveIcon(item.icon)
                return (
                  <div key={idx} className="hstack shrink-0 gap-3">
                    {idx > 0 && <span className="h-4 w-px shrink-0 bg-carbon/60" />}
                    <span className="hstack shrink-0 gap-1.5">
                      <Icon size={15} className="shrink-0 text-accent" />
                      <span className="whitespace-nowrap text-sm font-semibold">{item.valor}</span>
                    </span>
                  </div>
                )
              })}
              {menuHoje && menuHoje.grupos.length === 0 && (
                <span className="whitespace-nowrap text-sm text-muted">Cardápio a definir hoje</span>
              )}
            </div>
            {menuHoje && menuHoje.grupos.length > 0 && (
              <Link
                to="/avaliar"
                aria-label="Avaliar o cardápio de hoje"
                className="grid shrink-0 place-items-center border-l border-line pl-3 pr-4 tap"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent-soft text-accent">
                  <Star size={16} />
                </span>
              </Link>
            )}
          </div>
        </Card>
      </Section>

      {/* Notícias — carrossel automático (aniversário, comunicados, avisos…) */}
      {destaques.length > 0 && (
        <Section className="reveal reveal-3 mt-4 hsm:mt-3" title="Notícias">
          <Carrossel itens={destaques} />
        </Section>
      )}

      {/* Sugestões — grid de 2 colunas (sem scroll lateral) */}
      <Section className="mt-4 hsm:mt-3" title="Sugestões">
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c, i) => {
            // No desktop, o organograma abre na área principal (dentro do app),
            // não em tela cheia.
            const orgNoDesktop = desktop && c.to === '/organograma'
            return (
              <PromoCard
                key={c.title}
                to={orgNoDesktop ? undefined : c.to}
                onClick={orgNoDesktop ? () => setCanvas('organograma') : undefined}
                badgeIcon={c.badgeIcon}
                title={c.title}
                subtitle={c.subtitle}
                emBreve={c.emBreve}
                bgClassName={c.bgClassName}
                badgeClassName={c.badgeClassName}
                textClassName={c.textClassName}
                className={`reveal-${i + 1}`}
              />
            )
          })}
        </div>
      </Section>

      {/* Atalhos — exclusivo p/ quem tem acesso à Governança */}
      {usuario?.governanca?.tem && <AtalhosGovernanca />}

    </>
  )
}

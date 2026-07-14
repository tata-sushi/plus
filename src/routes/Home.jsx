import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Gift, Plus } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { IconTile } from '../components/IconTile.jsx'
import { PromoCard } from '../components/PromoCard.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { DestaqueBanner } from '../components/DestaqueBanner.jsx'
import { resolveIcon } from '../lib/icons.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { currentUser, menuDoDia, acessosRapidos } from '../lib/mockData.js'

export function Home() {
  const { usuario } = useAuth()
  const nome = usuario?.nome || currentUser.nome
  const primeiroNome = usuario?.primeiroNome || currentUser.primeiroNome
  const cargo = usuario?.cargo || currentUser.cargo
  const loja = usuario?.loja || currentUser.loja

  // Governança só aparece pra quem tem acesso
  const rapidos = acessosRapidos.filter(
    (a) => a.id !== 'governanca' || usuario?.governanca?.tem,
  )

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

      {/* Hero de saudação */}
      <div className="px-5 pt-2">
        <div className="hero-card reveal p-4">
          <div className="hstack gap-3">
            <Avatar name={nome} src={usuario?.avatarUrl} size={48} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-bold">Olá, {primeiroNome}!</div>
              <div className="mt-0.5 truncate text-xs text-muted">
                {cargo}
                {loja ? ` · ${loja}` : ''}
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

      {/* Destaque rotativo — banner dinâmico (um por visita) */}
      {destaque && (
        <div className="reveal reveal-1 mt-4 px-5">
          <DestaqueBanner d={destaque} />
        </div>
      )}

      {/* Menu do dia — uma linha com scroll lateral e botão + fixo à direita */}
      <Section className="reveal reveal-1 mt-5" title="Menu do dia">
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
            badgeIcon={Gift}
            title="Recompensas"
            subtitle="Conheça nossas recompensas"
            className="reveal reveal-2"
          />
        </div>
      </Section>

      {/* Acesso rápido — atalhos */}
      {rapidos.length > 0 && (
        <Section className="reveal reveal-1 mt-5" title="Acesso Rápido">
          <div className={`grid gap-2 ${rapidos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {rapidos.map((a) => (
              <IconTile key={a.id} icon={a.icon} label={a.label} to={a.to} variant={a.variant} />
            ))}
          </div>
        </Section>
      )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Gift, Star, Network, Sun, Check, X, KanbanSquare, SprayCan, Radio as RadioIcon, Puzzle } from 'lucide-react'
import { cn } from '../lib/cn'
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
import { getTheme } from '../lib/theme.js'
import { estadoPush } from '../lib/push.js'
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
const DIAS_ABREV = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
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

// Sugestões em páginas de 4 (grade 2×2) com rolagem lateral + bolinhas — mesmo
// padrão do carrossel de Notícias. Cada página mostra 4 cards; o resto desliza
// pro lado (com Kanban na frente, o Organograma cai na 2ª página).
function paginar4(arr) {
  const out = []
  for (let i = 0; i < arr.length; i += 4) out.push(arr.slice(i, i + 4))
  return out
}

function SugestoesCarrossel({ cards, desktop, setCanvas }) {
  const [idx, setIdx] = useState(0)
  const paginas = paginar4(cards)

  const renderCard = (c, i) => {
    // No desktop, o organograma abre na área principal (dentro do app), não em tela cheia.
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
  }

  if (paginas.length <= 1) {
    return <div className="grid grid-cols-2 gap-3">{cards.map(renderCard)}</div>
  }

  return (
    <div>
      <div
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar"
      >
        {paginas.map((pagina, pi) => (
          // content-start: cards no tamanho normal 2×2, sem esticar (páginas com
          // menos de 4 deixam espaço embaixo até chegarem mais acessos rápidos).
          <div key={pi} className="grid w-full shrink-0 snap-start grid-cols-2 content-start gap-3">
            {pagina.map(renderCard)}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-center gap-1.5">
        {paginas.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-accent' : 'w-1.5 bg-line'}`}
          />
        ))}
      </div>
    </div>
  )
}

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
  // Escala da semana (teste) — vira o 2º slide do card do topo.
  const podeEsc = !!usuario?.podeEscala
  const [escalaSemana, setEscalaSemana] = useState(null)
  useEffect(() => {
    if (!podeEsc) return
    let ativo = true
    supabase.rpc('escala_minha_semana', { p_inicio: mondayISO() }).then(({ data }) => {
      if (ativo) setEscalaSemana(Array.isArray(data) ? data : [])
    })
    return () => {
      ativo = false
    }
  }, [podeEsc])
  // Carrossel do topo: 0 = identificação, 1 = escala. Sem indicador.
  const [heroSlide, setHeroSlide] = useState(0)
  const [heroPing, setHeroPing] = useState(0) // bump = interação (reinicia o auto-retorno)
  const heroTouch = useMemo(() => ({ x: 0, tocou: false }), [])
  // Entrada automática: 1,5s depois de abrir o app, mostra a escala UMA vez por
  // sessão (só pra dar a dica). Depois não se move mais sozinho — é só deslizar.
  useEffect(() => {
    if (!podeEsc) return
    try {
      if (sessionStorage.getItem('tp_esc_peek')) return
      sessionStorage.setItem('tp_esc_peek', '1')
    } catch (e) { /* ignore */ }
    const t = setTimeout(() => {
      if (!heroTouch.tocou) setHeroSlide(1)
    }, 1500)
    return () => clearTimeout(t)
  }, [podeEsc, heroTouch])
  // Auto-retorno: parado na escala por 8s sem interagir → volta pra identificação.
  useEffect(() => {
    if (heroSlide !== 1) return
    const t = setTimeout(() => setHeroSlide(0), 8000)
    return () => clearTimeout(t)
  }, [heroSlide, heroPing])
  // Validação de presença do dia (tocar no dia de hoje no card do topo → +5).
  const [chk, setChk] = useState(null)
  useEffect(() => {
    if (!podeEsc) return
    let ativo = true
    supabase.rpc('escala_check_status').then(({ data }) => {
      if (ativo) setChk(data || null)
    })
    return () => {
      ativo = false
    }
  }, [podeEsc])
  async function validarHoje() {
    setHeroPing((p) => p + 1) // interagiu → reinicia o timer de 8s
    if (!chk?.tem_hoje || chk?.confirmado) return
    const { error } = await supabase.rpc('escala_check')
    if (!error) setChk((c) => ({ ...(c || {}), confirmado: true }))
  }

  const cargo = usuario?.cargo || ''
  const loja = usuario?.loja || ''

  // Ordem dos cards de Sugestões: Kanban · Desafios · Checklist · Cardápio · Recompensas · Organograma · Rádio · Passatempos.
  // Passatempos (Tatá Tango) segue travado na matrícula 7 (em teste); Kanban e
  // Checklist só aparecem pra quem tem o acesso (podeQuadros / podeLimpeza).
  const [desafios, recompensas, cardapio, organograma] = sugestoesCards
  const cards = [
    ...(usuario?.podeQuadros
      ? [{ to: '/quadros', badgeIcon: KanbanSquare, title: 'Kanban Tatá', subtitle: 'Quadro de tarefas' }]
      : []),
    desafios,
    ...(usuario?.podeLimpeza
      ? [{ to: '/limpeza', badgeIcon: SprayCan, title: 'Checklist de limpeza', subtitle: 'Check dos banheiros' }]
      : []),
    cardapio,
    recompensas,
    organograma,
    { to: '/radio', badgeIcon: RadioIcon, title: 'Rádio Tatá', subtitle: 'Playlist do time' },
    ...(String(usuario?.matricula) === '7'
      ? [{ to: '/jogo', badgeIcon: Puzzle, title: 'Passatempos', subtitle: 'Relaxe e pontue' }]
      : []),
  ]
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

  // Card "modo escuro" — entra no sorteio dos automáticos na base (2/dia), mas o
  // tema vive no aparelho: o front mostra só pra quem está no claro (no escuro,
  // filtra fora). O "de vez em quando" já é o sorteio da base.
  const [tema] = useState(getTheme)

  // Card "aviso_1" = ativar notificações. O push é por aparelho (a base não sabe),
  // então o front decide: mostra só pra quem está SEM push AQUI, e o toque ativa
  // direto (onTap → ativarPush). Começa oculto até checar o estado do aparelho.
  const [pushInfo, setPushInfo] = useState({ suportado: false, ativo: true })
  useEffect(() => {
    let ativo = true
    estadoPush().then((e) => {
      if (ativo) setPushInfo({ suportado: e.suportado, ativo: e.ativo })
    })
    return () => {
      ativo = false
    }
  }, [])

  const cardsDestaque = useMemo(
    () =>
      destaques
        .filter((d) => d.chave !== 'modo_escuro' || tema === 'light')
        .filter((d) => d.chave !== 'aviso_1' || (pushInfo.suportado && !pushInfo.ativo))
        // aviso_1 leva pro Painel de Ajustes (não ativa direto) — a pessoa liga lá.
        .map((d) => (d.chave === 'aviso_1' ? { ...d, cta_to: '/manutencao' } : d)),
    [destaques, tema, pushInfo],
  )

  return (
    <>
      <Header />

      {/* Topo: carrossel [identificação · escala] — sem indicador. Espia a escala
          sozinho ao abrir e volta; depois é só deslizar. */}
      <div className="px-5 pt-2 hxs:pt-1">
        <div
          className="overflow-hidden"
          onTouchStart={(e) => {
            heroTouch.x = e.touches[0].clientX
          }}
          onTouchEnd={(e) => {
            if (!podeEsc) return
            const dx = e.changedTouches[0].clientX - heroTouch.x
            if (Math.abs(dx) > 45) {
              heroTouch.tocou = true
              setHeroPing((p) => p + 1)
              setHeroSlide(dx < 0 ? 1 : 0)
            }
          }}
        >
          <div className="flex items-stretch transition-transform duration-500 ease-out" style={{ transform: `translateX(-${heroSlide * 100}%)` }}>
            {/* slide 0 — identificação */}
            <div className="flex w-full shrink-0">
              <div className="hero-card reveal hstack h-full w-full gap-3 p-4 hsm:p-3">
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

            {/* slide 1 — escala da semana (toque no dia de hoje valida presença +5) */}
            {podeEsc && (
              <div className="flex w-full shrink-0">
                <div className="card flex h-full w-full flex-col justify-center p-4 hsm:p-3">
                  <div className="hstack gap-1.5">
                    {(escalaSemana || Array.from({ length: 7 })).map((dia, i) => {
                      const hoje = dia && dia.data === isoLocal(new Date())
                      const conteudo = !escalaSemana ? (
                        <span className="h-2.5 w-6 animate-pulse rounded bg-fill" />
                      ) : dia?.folga ? (
                        <Sun size={12} className="text-muted" />
                      ) : dia?.definido ? (
                        dia.entrada ? String(dia.entrada).slice(0, 2) + 'h' : 'T'
                      ) : (
                        <span className="text-muted-2">—</span>
                      )
                      const miolo = (
                        <>
                          <div className={cn('text-[9px] font-bold uppercase', hoje ? 'text-accent' : 'text-muted-2')}>{DIAS_ABREV[i]}</div>
                          <div className="mt-0.5 flex h-4 items-center justify-center text-[11px] font-bold">{conteudo}</div>
                        </>
                      )
                      if (hoje && chk?.tem_hoje) {
                        return (
                          <button
                            key={i}
                            onClick={validarHoje}
                            aria-label={chk?.confirmado ? 'Presença confirmada' : 'Validar presença de hoje'}
                            className={cn('relative flex-1 rounded-lg border py-1.5 text-center tap', chk?.confirmado ? 'border-accent bg-accent text-black' : 'border-accent bg-accent-soft')}
                          >
                            {chk?.confirmado && <Check size={10} strokeWidth={3} className="absolute right-0.5 top-0.5" />}
                            {miolo}
                          </button>
                        )
                      }
                      const cls = cn('relative flex-1 rounded-lg border py-1.5 text-center', hoje ? 'border-accent bg-accent-soft' : 'border-line')
                      const marca = dia?.definido && !dia?.folga && dia?.data < isoLocal(new Date()) &&
                        (dia.validado ? (
                          <Check size={9} strokeWidth={3} className="absolute right-0.5 top-0.5 text-accent" />
                        ) : (
                          <X size={9} strokeWidth={3} className="absolute right-0.5 top-0.5 text-muted-2" />
                        ))
                      // Dia que não é hoje: toque leva pro calendário. Hoje sem check: só exibe.
                      return hoje ? (
                        <div key={i} className={cls}>
                          {marca}
                          {miolo}
                        </div>
                      ) : (
                        <Link key={i} to="/escala" className={cn(cls, 'tap')}>
                          {marca}
                          {miolo}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
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
                className="grid shrink-0 place-items-center pl-2 pr-1.5 tap"
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
      {cardsDestaque.length > 0 && (
        <Section className="reveal reveal-3 mt-4 hsm:mt-3" title="Notícias">
          <Carrossel itens={cardsDestaque} />
        </Section>
      )}

      {/* Sugestões — páginas de 4 (2×2) com rolagem lateral (Organograma vai pra 2ª) */}
      <Section className="mt-4 hsm:mt-3" title="Sugestões">
        <SugestoesCarrossel cards={cards} desktop={desktop} setCanvas={setCanvas} />
      </Section>

      {/* Atalhos — exclusivo p/ quem tem acesso à Governança */}
      {usuario?.governanca?.tem && <AtalhosGovernanca />}

    </>
  )
}

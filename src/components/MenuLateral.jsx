import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Info } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// ── Ícones idênticos aos do portal de líderes (menucompliance.html) ──
// Traço fino (1.8) como no portal, cor herdada de currentColor (carbon).
const svgBase = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}
const IcoConceitos = ({ size = 24, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="13" y2="13" />
  </svg>
)
const IcoInstitucional = ({ size = 24, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} {...p}>
    <line x1="3" y1="22" x2="21" y2="22" />
    <rect x="2" y="10" width="20" height="12" rx="1" />
    <path d="M2 10l10-8 10 8" />
    <line x1="9" y1="22" x2="9" y2="14" />
    <line x1="15" y1="22" x2="15" y2="14" />
    <rect x="10" y="14" width="4" height="8" />
  </svg>
)
const IcoAreas = ({ size = 24, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} {...p}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)
const IcoParceiros = ({ size = 24, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} {...p}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <polyline points="6 9 9 12 6 15" />
    <line x1="12" y1="12" x2="16" y2="12" />
  </svg>
)
const IcoCompliance = ({ size = 24, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svgBase} {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
)

// ── Estrutura REAL do portal de líderes (menucompliance.html + landings) ──
// Cada página aponta pro seu `id` (= GOV_PAGE_ID / catálogo governanca_paginas),
// que abre no visualizador in-app /painel/:id. A visibilidade é filtrada pelo
// que a pessoa pode acessar (RPC gov_meus_acessos); admin vê tudo.
// Fonte: varredura de tata-sushi/lideres em 2026-09-24.
const PORTAL = [
  {
    secao: 'Conceitos & Informações',
    icon: IcoConceitos,
    paginas: [
      { id: 'governanca-conceitos-governanca', label: 'Governança' },
      { id: 'governanca-conceitos-5s', label: 'Metodologia 5S' },
      { id: 'governanca-conceitos-kanban', label: 'Kanban' },
    ],
    grupos: [],
  },
  {
    secao: 'Institucional',
    icon: IcoInstitucional,
    paginas: [
      { id: 'governanca-institucional-idconceitual', label: 'Conceito, Missão, Visão e Valores' },
      { id: 'governanca-institucional-idvisual', label: 'Identidade da Marca' },
      { id: 'governanca-institucional-papelaria', label: 'Papelaria' },
    ],
    grupos: [],
  },
  {
    secao: 'Áreas & Dashboards',
    icon: IcoAreas,
    // Páginas soltas (cards que abrem direto, sem subpáginas no portal).
    paginas: [
      { id: 'governanca-areas-organograma', label: 'Organograma Geral' },
      { id: 'governanca-kpis-manutencao', label: 'Manutenção' },
      { id: 'governanca-kpis-compras-abastecimento', label: 'Compras' },
    ],
    // Departamentos (têm landing + subpáginas).
    grupos: [
      {
        nome: 'Gente & Gestão',
        paginas: [
          { id: 'governanca-kpis-rh', label: 'Visão geral' },
          { id: 'governanca-areas-rh-papeis', label: 'Papéis & Responsabilidades' },
          { id: 'governanca-kpis-rh-admissao', label: 'Admissão' },
          { id: 'governanca-kpis-rh-absenteismo', label: 'Absenteísmo' },
          { id: 'governanca-kpis-rh-agenda', label: 'Agenda' },
          { id: 'governanca-kpis-rh-armarios', label: 'Armários & Chaves' },
          { id: 'governanca-kpis-rh-bancodehoras', label: 'Banco de Horas' },
          { id: 'governanca-kpis-rh-beneficios', label: 'Benefícios' },
          { id: 'governanca-kpis-rh-ces', label: 'Cargos e Salários' },
          { id: 'governanca-kpis-rh-cei', label: 'Cultura & Clima' },
          { id: 'governanca-kpis-rh-comunicacao', label: 'Comunicação Interna' },
          { id: 'governanca-kpis-rh-demandas', label: 'Demandas' },
          { id: 'governanca-kpis-rh-desligamentos', label: 'Desligamentos' },
          { id: 'governanca-app-escala', label: 'Controle de Escala' },
          { id: 'governanca-kpis-rh-experiencias', label: 'Experiência' },
          { id: 'governanca-kpis-rh-feriados', label: 'Feriados' },
          { id: 'governanca-kpis-rh-ferias', label: 'Férias' },
          { id: 'governanca-kpis-rh-folha', label: 'Folha de Pagamento' },
          { id: 'governanca-kpis-rh-doc', label: 'Documentos' },
          { id: 'governanca-kpis-rh-hc', label: 'Headcount' },
          { id: 'governanca-kpis-rh-medicina', label: 'Medicina Ocupacional' },
          { id: 'governanca-kpis-rh-ouvidoria', label: 'Ouvidoria' },
          { id: 'governanca-kpis-rh-performance', label: 'Performance' },
          { id: 'governanca-kpis-rh-reclamacoes', label: 'Reclamações Trabalhistas' },
          { id: 'governanca-kpis-rh-recrutamento', label: 'Recrutamento & Seleção' },
          { id: 'governanca-kpis-rh-semanal', label: 'Report Semanal' },
          { id: 'governanca-kpis-rh-sancoes', label: 'Sanções Disciplinares' },
          { id: 'governanca-kpis-rh-solicitacoes', label: 'Solicitações' },
          { id: 'governanca-kpis-rh-ted', label: 'T&D' },
          { id: 'governanca-kpis-rh-estoqueadm', label: 'Uniformes & EPIs' },
        ],
      },
      {
        nome: 'Estoque',
        paginas: [
          { id: 'governanca-kpis-estoque', label: 'Visão geral' },
          { id: 'governanca-kpis-estoque-semanal', label: 'Inventário Semanal' },
        ],
      },
      {
        nome: 'Limpeza',
        paginas: [
          { id: 'governanca-kpis-limpeza', label: 'Visão geral' },
          { id: 'governanca-kpis-limpeza-checklist', label: 'Checklist de limpeza' },
        ],
      },
      {
        nome: 'Tatá House',
        paginas: [
          { id: 'governanca-kpis-tatahouse', label: 'Visão geral' },
          { id: 'governanca-kpis-tatahouse-cardapio', label: 'Cardápio' },
        ],
      },
    ],
  },
  {
    secao: 'Parceiros & Sistemas',
    icon: IcoParceiros,
    paginas: [{ id: 'governanca-parceiros-sistemas', label: 'Parceiros & Sistemas' }],
    grupos: [],
  },
  {
    secao: 'Compliance',
    icon: IcoCompliance,
    paginas: [
      { id: 'governanca-auditoria', label: 'Auditoria de páginas' },
      { id: 'governanca-auditoria-docsrh', label: 'Gestão de Documentos' },
    ],
    grupos: [],
  },
]

// Filtra a árvore pelo conjunto de páginas liberadas (Set de ids). Some grupos
// e seções que ficarem vazios.
function filtrar(acesso) {
  const has = (id) => acesso.has(id)
  return PORTAL.map((sec) => {
    const paginas = sec.paginas.filter((p) => has(p.id))
    const grupos = (sec.grupos || [])
      .map((g) => ({ ...g, paginas: g.paginas.filter((p) => has(p.id)) }))
      .filter((g) => g.paginas.length > 0)
    return { ...sec, paginas, grupos }
  }).filter((sec) => sec.paginas.length > 0 || sec.grupos.length > 0)
}

// Menu de navegação lateral (drawer) da Governança de Processos — espelha o
// portal de líderes (5 seções). Desliza da esquerda; seções e departamentos
// abrem/recolhem em cascata. Montado no rodapé (portal), controlado por
// `aberto`/`onClose` de fora.
export function MenuLateral({ aberto, onClose }) {
  const [render, setRender] = useState(aberto)
  const [show, setShow] = useState(false)
  const [acesso, setAcesso] = useState(null) // null = carregando · Set de ids
  const [abertos, setAbertos] = useState(() => new Set())
  const carregou = useRef(false)

  // Entrada suave: monta primeiro, deixa o navegador pintar o estado inicial
  // (fora da tela) e só então dispara a transição — dois requestAnimationFrame
  // evitam a "truncada" de quando classe inicial e final entram no mesmo frame.
  useEffect(() => {
    if (aberto) {
      setRender(true)
      let r2
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShow(true))
      })
      return () => {
        cancelAnimationFrame(r1)
        if (r2) cancelAnimationFrame(r2)
      }
    }
    setShow(false)
    const t = setTimeout(() => setRender(false), 300)
    return () => clearTimeout(t)
  }, [aberto])

  // Carrega as páginas liberadas uma vez, na primeira abertura.
  useEffect(() => {
    if (!aberto || carregou.current) return
    carregou.current = true
    supabase.rpc('gov_meus_acessos').then(({ data }) => {
      setAcesso(new Set((data || []).map((p) => p.pagina_id)))
    })
  }, [aberto])

  // Trava a rolagem do fundo enquanto aberto.
  useEffect(() => {
    if (!render) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [render])

  // Esc fecha (desktop).
  useEffect(() => {
    if (!render) return
    const aoTeclar = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [render, onClose])

  const arvore = useMemo(() => (acesso ? filtrar(acesso) : null), [acesso])

  if (!render) return null

  const toggle = (k) =>
    setAbertos((prev) => {
      const n = new Set(prev)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  const aoTocar = () => {
    tapHaptic()
    onClose()
  }

  // Uma página (folha). `dentro` = está sob um departamento (recuo maior).
  const linhaPagina = (p, dentro) => (
    <NavLink
      key={p.id}
      to={`/painel/${p.id}`}
      onClick={aoTocar}
      className={({ isActive }) =>
        cn(
          'hstack gap-2.5 rounded-lg py-2 pr-2 text-sm tap',
          dentro ? 'pl-5' : 'pl-2.5',
          isActive ? 'font-semibold text-accent' : 'text-text active:bg-surface-2',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              isActive ? 'bg-accent' : 'bg-carbon',
            )}
          />
          <span className="min-w-0 flex-1 truncate">{p.label}</span>
        </>
      )}
    </NavLink>
  )

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Fundo escuro (fecha ao tocar) */}
      <button
        aria-label="Fechar menu"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          show ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Painel lateral */}
      <aside
        role="dialog"
        aria-label="Menu da Governança"
        className={cn(
          'absolute left-0 top-0 flex h-full w-[86vw] max-w-[340px] flex-col bg-bg shadow-2xl',
          'transition-transform duration-300 ease-out will-change-transform',
          show ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Topo */}
        <div className="safe-top border-b border-line px-4 pb-3 pt-3">
          <div className="hstack items-center justify-between gap-2">
            <div className="min-w-0 font-display text-base font-bold leading-tight">
              Governança de Processos
            </div>
            <NavLink
              to="/governanca"
              onClick={aoTocar}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-carbon tap"
              aria-label="Abrir portal completo"
            >
              <ExternalLink size={18} />
            </NavLink>
          </div>
        </div>

        {/* Corpo: acordeão das seções do portal */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-1">
          {/* Foto da Governança — fora do "Sobre", sempre visível */}
          <div className="px-2 pb-2 pt-1">
            <div className="overflow-hidden rounded-xl bg-surface-2">
              <img
                src="/governanca-sobre.jpg"
                alt="Governança de Processos"
                className="h-36 w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Sobre (recolhido por padrão) — texto da Governança */}
          {(() => {
            const kSobre = 'sec:__sobre'
            const sobreOpen = abertos.has(kSobre)
            return (
              <div className="border-b border-black/[0.06] dark:border-white/[0.04]">
                <button
                  onClick={() => toggle(kSobre)}
                  className="hstack w-full gap-3 px-2 py-3 text-left tap"
                  aria-expanded={sobreOpen}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center text-carbon dark:text-accent">
                    <Info size={18} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">Sobre</span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      'shrink-0 text-muted-2 transition-transform duration-300',
                      sobreOpen && 'rotate-180',
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-300 ease-out',
                    sobreOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-2 pb-3 pt-1">
                      <p
                        lang="pt-BR"
                        className="text-justify text-xs leading-relaxed text-muted hyphens-auto"
                      >
                        <strong className="font-semibold text-text">Governança de Processos</strong>{' '}
                        é a maneira pela qual consolidaremos as iniciativas da gestão de processos do
                        Tatá Sushi, com papéis, diretrizes e mecanismos que orientarão como os
                        processos devem ser definidos, executados, monitorados e aprimorados.
                      </p>
                      <p
                        lang="pt-BR"
                        className="mt-2 text-justify text-xs leading-relaxed text-muted hyphens-auto"
                      >
                        <strong className="font-semibold text-text">
                          A Governança de Processos garantirá
                        </strong>{' '}
                        a padronização e a melhoria contínua das rotinas, além do alinhamento
                        operacional com os objetivos estratégicos da companhia, assegurando que cada
                        área gere valor com eficiência e qualidade consistentes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {arvore === null ? (
            <div className="grid place-items-center py-16 text-muted-2">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : arvore.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted">
              Nenhuma página da Governança liberada pra você.
            </div>
          ) : (
            arvore.map((sec) => {
              const Icon = sec.icon
              const kSec = 'sec:' + sec.secao
              const open = abertos.has(kSec)
              // Seção de página única (ex.: Parceiros & Sistemas) vira link direto.
              const direto = sec.paginas.length === 1 && sec.grupos.length === 0

              if (direto) {
                const p = sec.paginas[0]
                return (
                  <div key={sec.secao} className="border-b border-black/[0.06] dark:border-white/[0.04] last:border-0">
                    <NavLink
                      to={`/painel/${p.id}`}
                      onClick={aoTocar}
                      className="hstack w-full gap-3 px-2 py-3 tap"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center text-carbon dark:text-accent">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">
                        {sec.secao}
                      </span>
                    </NavLink>
                  </div>
                )
              }

              return (
                <div key={sec.secao} className="border-b border-black/[0.06] dark:border-white/[0.04] last:border-0">
                  <button
                    onClick={() => toggle(kSec)}
                    className="hstack w-full gap-3 px-2 py-3 text-left tap"
                    aria-expanded={open}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center text-carbon dark:text-accent">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{sec.secao}</span>
                    <ChevronDown
                      size={18}
                      className={cn(
                        'shrink-0 text-muted-2 transition-transform duration-300',
                        open && 'rotate-180',
                      )}
                    />
                  </button>

                  {/* Conteúdo da seção (anima altura via grid-rows 0fr→1fr) */}
                  <div
                    className={cn(
                      'grid transition-all duration-300 ease-out',
                      open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-2 pl-2 pr-1">
                        {sec.paginas.map((p) => linhaPagina(p, false))}

                        {sec.grupos.map((g) => {
                          const kSub = 'sub:' + sec.secao + '|' + g.nome
                          const openSub = abertos.has(kSub)
                          return (
                            <div key={g.nome} className="mt-0.5">
                              <button
                                onClick={() => toggle(kSub)}
                                className="hstack w-full gap-2 rounded-lg px-2 py-2 text-left tap"
                                aria-expanded={openSub}
                              >
                                <ChevronRight
                                  size={14}
                                  className={cn(
                                    'shrink-0 text-muted-2 transition-transform duration-300',
                                    openSub && 'rotate-90',
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted">
                                  {g.nome}
                                </span>
                              </button>
                              <div
                                className={cn(
                                  'grid transition-all duration-300 ease-out',
                                  openSub ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                                )}
                              >
                                <div className="overflow-hidden">
                                  <div className="pb-1">
                                    {g.paginas.map((p) => linhaPagina(p, true))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div aria-hidden className="safe-bottom h-3" />
        </div>
      </aside>
    </div>,
    document.body,
  )
}

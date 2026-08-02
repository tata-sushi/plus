import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  X,
  Trash2,
  CalendarDays,
  Users,
  Check,
  GripVertical,
  Loader2,
  Tag,
  Archive,
  Settings2,
  ChevronLeft,
  Columns3,
  Search,
  ListChecks,
  MessageSquare,
  Send,
  History,
  SlidersHorizontal,
  Layers,
  AtSign,
  List,
  Circle,
  Paperclip,
  FileText,
  Pencil,
  KanbanSquare,
  ClipboardList,
  Rocket,
  Target,
  ShoppingCart,
  UtensilsCrossed,
  Wrench,
  Lightbulb,
  Star,
  Flag,
  Briefcase,
  Truck,
  Heart,
  PartyPopper,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'
import { useDesktop } from '../lib/useDesktop.js'
import { useDesktopCanvas } from '../lib/desktopCanvas.js'
import { supabase } from '../lib/supabase.js'

// ── Painel Kanban (Quadros) — ligado ao backend (schema tata_kanban via RPCs) ──
// Membros criam cartões; editar/mover/arquivar/excluir e gerir o quadro é do
// admin. Tempo real via realtime do Supabase. Notificação só por @menção.

const CORES = ['#2f7d4f', '#d98a2b', '#c2453f', '#3b6fb3', '#7a4fb3', '#0f766e', '#64748b']
const TABELAS_RT = ['cards', 'colunas', 'etiquetas', 'membros', 'card_comentarios', 'card_checklist', 'card_anexos']

// Ícones pré-definidos para diferenciar os quadros
const ICONES_QUADRO = {
  quadro: KanbanSquare,
  lista: ClipboardList,
  foguete: Rocket,
  alvo: Target,
  agenda: CalendarDays,
  equipe: Users,
  compras: ShoppingCart,
  cozinha: UtensilsCrossed,
  manutencao: Wrench,
  ideia: Lightbulb,
  estrela: Star,
  bandeira: Flag,
  maleta: Briefcase,
  entrega: Truck,
  coracao: Heart,
  festa: PartyPopper,
}
const iconeQuadro = (chave) => ICONES_QUADRO[chave] || KanbanSquare

// Ações do quadro compartilhadas com os cartões/colunas (evita threading de props)
const QuadroCtx = createContext(null)
const ACOES = {
  quadro_criado: 'criou o quadro',
  quadro_arquivado: 'arquivou o quadro',
  quadro_reaberto: 'reabriu o quadro',
  cartao_criado: 'criou o cartão',
  cartao_editado: 'editou',
  cartao_arquivado: 'arquivou',
  cartao_reaberto: 'reabriu',
  cartao_excluido: 'excluiu',
  comentou: 'comentou',
}

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}
function avisarErro(e) {
  // eslint-disable-next-line no-alert
  window.alert(e?.message || 'Não foi possível concluir a ação.')
}
function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}
function fmtPrazo(iso) {
  const p = String(iso || '').split('-')
  if (p.length !== 3) return iso
  return `${p[2]}/${p[1]}`
}
function fmtQuando(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
const primeiro = (n) => (n || '').trim().split(/\s+/)[0] || ''

// Texto legível (preto/branco) sobre uma cor de fundo, pela luminância percebida.
function corTexto(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length !== 6) return '#fff'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1a1a1a' : '#fff'
}

// ── Entrada / gate ───────────────────────────────────────────────────────────
function Quadros() {
  const { usuario } = useAuth()
  if (!usuario || usuario.perfilPendente || usuario.podeQuadros == null) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }
  if (!usuario.podeQuadros) return <Navigate to="/" replace />
  return <Painel />
}

// Board aberto na área grande do desktop (canvas do DesktopShell).
export function QuadroCanvas({ quadroId, onVoltar }) {
  return <VisaoQuadro quadroId={quadroId} onVoltar={onVoltar} emCanvas />
}

// ── Casca: lista de quadros ↔ visão de um quadro ─────────────────────────────
function Painel() {
  const desktop = useDesktop()
  const { canvas, setCanvas } = useDesktopCanvas()
  const [quadros, setQuadros] = useState(null)
  const [quadroIdMobile, setQuadroIdMobile] = useState(null)

  const recarregarLista = useCallback(async () => {
    try {
      const data = await call('kanban_meus_quadros')
      setQuadros(Array.isArray(data) ? data : [])
    } catch (e) {
      avisarErro(e)
      setQuadros([])
    }
  }, [])
  useEffect(() => {
    recarregarLista()
  }, [recarregarLista])

  // Desktop: o quadro abre no canvas; ao fechar, a lista se atualiza.
  const canvasQuadro = canvas?.tipo === 'quadro' ? canvas.quadroId : null
  useEffect(() => {
    if (desktop && !canvasQuadro) recarregarLista()
  }, [desktop, canvasQuadro, recarregarLista])

  function abrir(id) {
    if (desktop) setCanvas({ tipo: 'quadro', quadroId: id })
    else setQuadroIdMobile(id)
  }

  if (!desktop && quadroIdMobile) {
    return (
      <VisaoQuadro
        quadroId={quadroIdMobile}
        onVoltar={() => {
          setQuadroIdMobile(null)
          recarregarLista()
        }}
      />
    )
  }
  return <ListaQuadros quadros={quadros} onAbrir={abrir} onMudou={recarregarLista} selecionadoId={canvasQuadro} />
}

// ── Lista de quadros ─────────────────────────────────────────────────────────
function ListaQuadros({ quadros, onAbrir, onMudou, selecionadoId }) {
  const [criando, setCriando] = useState(false)
  const podeMais = (quadros?.filter((q) => !q.arquivado).length || 0) < 3

  async function novoQuadro() {
    const nome = window.prompt('Nome do novo quadro:')
    if (!nome || !nome.trim()) return
    setCriando(true)
    try {
      const id = await call('kanban_criar_quadro', { p_nome: nome.trim() })
      await onMudou()
      onAbrir(id)
    } catch (e) {
      avisarErro(e)
    } finally {
      setCriando(false)
    }
  }

  return (
    <>
      <Header title="Kanban Tatá" />
      <Voltar />
      <div className="px-5 pt-2 pb-24">
        {quadros == null ? (
          <div className="grid place-items-center py-16 text-muted">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : quadros.length === 0 ? (
          <div className="mt-6 rounded-card border border-dashed border-line px-4 py-10 text-center">
            <Columns3 size={26} className="mx-auto text-muted-2" />
            <div className="mt-2 text-sm font-semibold">Nenhum quadro ainda</div>
            <div className="mt-1 text-xs text-muted">Crie seu primeiro quadro para organizar tarefas em listas.</div>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2.5">
            {quadros.map((q) => {
              const Ic = iconeQuadro(q.icone)
              return (
              <button
                key={q.id}
                onClick={() => onAbrir(q.id)}
                className={cn('card hstack gap-3 px-4 py-3.5 text-left tap', selecionadoId === q.id && 'ring-2 ring-accent')}
              >
                <div className="grid h-10 w-10 place-items-center rounded-card bg-accent-soft text-accent">
                  <Ic size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-sm font-bold">{q.nome}</div>
                  <div className="mt-0.5 hstack gap-3 text-[11px] text-muted">
                    <span className="hstack gap-1">
                      <Users size={12} /> {q.n_membros}
                    </span>
                    <span className="hstack gap-1">
                      <Tag size={12} /> {q.n_cards} {q.n_cards === 1 ? 'cartão' : 'cartões'}
                    </span>
                    {q.sou_admin && <span className="text-accent">admin</span>}
                  </div>
                </div>
              </button>
              )
            })}
          </div>
        )}

        {quadros != null && (
          <button onClick={novoQuadro} disabled={!podeMais || criando} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
            {criando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Novo quadro
          </button>
        )}
        {quadros != null && !podeMais && <div className="mt-2 text-center text-[11px] text-muted">Limite de 3 quadros por pessoa.</div>}
      </div>
    </>
  )
}

// ── Visão de um quadro ───────────────────────────────────────────────────────
function VisaoQuadro({ quadroId, onVoltar, emCanvas }) {
  const { usuario } = useAuth()
  const mat = usuario?.matricula
  const [board, setBoard] = useState(null)
  const [cols, setCols] = useState([])
  const [cardAberto, setCardAberto] = useState(null)
  const [sheet, setSheet] = useState(null)

  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [agrupar, setAgrupar] = useState(false)
  const [vista, setVista] = useState('kanban') // 'kanban' | 'lista' | 'calendario'
  const [filtros, setFiltros] = useState({ filtroEtq: new Set(), filtroResp: new Set(), soVencidos: false, soMeus: false })

  const carregarInicial = useCallback(async () => {
    try {
      setBoard(await call('kanban_carregar', { p_quadro: quadroId }))
    } catch (e) {
      avisarErro(e)
      onVoltar()
    }
  }, [quadroId, onVoltar])
  useEffect(() => {
    carregarInicial()
  }, [carregarInicial])

  const recarregar = useCallback(async () => {
    try {
      setBoard(await call('kanban_carregar', { p_quadro: quadroId }))
    } catch {
      /* silencioso */
    }
  }, [quadroId])

  const timerRef = useRef(null)
  const agendar = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => recarregar(), 350)
  }, [recarregar])
  useEffect(() => {
    const canal = supabase.channel(`kanban:${quadroId}`)
    for (const t of TABELAS_RT) {
      canal.on('postgres_changes', { event: '*', schema: 'tata_kanban', table: t, filter: `quadro_id=eq.${quadroId}` }, agendar)
    }
    canal.subscribe()
    return () => {
      clearTimeout(timerRef.current)
      supabase.removeChannel(canal)
    }
  }, [quadroId, agendar])
  useEffect(() => {
    function v() {
      if (document.visibilityState === 'visible') recarregar()
    }
    document.addEventListener('visibilitychange', v)
    return () => document.removeEventListener('visibilitychange', v)
  }, [recarregar])

  useEffect(() => {
    if (!board) return
    setCols(
      (board.colunas || []).map((c) => ({
        ...c,
        cards: (board.cards || [])
          .filter((k) => k.coluna_id === c.id)
          .sort((a, b) => a.ordem - b.ordem || String(a.created_at).localeCompare(String(b.created_at))),
      })),
    )
  }, [board])

  const admin = !!board?.sou_admin
  const etiquetaPorId = useMemo(() => {
    const m = {}
    for (const e of board?.etiquetas || []) m[e.id] = e
    return m
  }, [board])

  const cardLive = cardAberto?.cardId ? (board?.cards || []).find((k) => k.id === cardAberto.cardId) : null
  useEffect(() => {
    if (cardAberto?.cardId && board && !cardLive) setCardAberto(null)
  }, [cardAberto, board, cardLive])

  const temFiltro = filtros.filtroEtq.size || filtros.filtroResp.size || filtros.soVencidos || filtros.soMeus
  const filtrando = !!busca.trim() || !!temFiltro
  const cardVisivel = useCallback(
    (card) => {
      if (busca.trim()) {
        const q = busca.trim().toLowerCase()
        if (!`${card.titulo} ${card.descricao || ''}`.toLowerCase().includes(q)) return false
      }
      if (filtros.filtroEtq.size && !(card.etiquetas || []).some((id) => filtros.filtroEtq.has(id))) return false
      if (filtros.filtroResp.size && !(card.responsaveis || []).some((r) => filtros.filtroResp.has(r.matricula))) return false
      if (filtros.soVencidos && !(card.data_conclusao && card.data_conclusao < hojeISO())) return false
      if (filtros.soMeus && !(card.responsaveis || []).some((r) => r.matricula === mat)) return false
      return true
    },
    [busca, filtros, mat],
  )
  const colsFiltradas = useMemo(() => cols.map((c) => ({ ...c, cards: c.cards.filter(cardVisivel) })), [cols, cardVisivel])
  const grupos = useMemo(() => {
    if (!agrupar) return null
    const base = (board?.membros || []).map((m) => ({ key: m.matricula, nome: m.nome }))
    base.push({ key: '__none__', nome: 'Sem responsável' })
    return base
      .map((g) => ({
        ...g,
        cols: colsFiltradas.map((c) => ({
          ...c,
          cards: c.cards.filter((k) => (g.key === '__none__' ? (k.responsaveis || []).length === 0 : (k.responsaveis || []).some((r) => r.matricula === g.key))),
        })),
      }))
      .filter((g) => g.cols.some((c) => c.cards.length > 0))
  }, [agrupar, colsFiltradas, board])

  const dragEnabled = admin && !filtrando && !agrupar && vista === 'kanban'
  function abrirCard(colId, card) {
    setCardAberto({ modo: admin ? 'editar' : 'ver', cardId: card.id, colunaId: colId })
  }
  function novoCard(colId) {
    setCardAberto({ modo: 'criar', colunaId: colId })
  }
  async function concluirCard(card) {
    try {
      await call('kanban_card_concluir', { p_id: card.id, p_concluido: !card.concluido })
      await recarregar()
    } catch (e) {
      avisarErro(e)
    }
  }
  async function arquivarLista(colId) {
    if (!window.confirm('Arquivar TODOS os cartões desta lista? Eles saem do quadro.')) return
    try {
      await call('kanban_coluna_arquivar_cards', { p_coluna: colId })
      await recarregar()
    } catch (e) {
      avisarErro(e)
    }
  }

  if (!board) {
    const loader = (
      <div className="grid h-full place-items-center py-20 text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
    return emCanvas ? <div className="flex h-full flex-col">{loader}</div> : <><Header title="Quadro" />{loader}</>
  }

  const IconeBoard = iconeQuadro(board.icone)
  // Todos os controles do quadro numa única linha, com o mesmo padrão de botão
  // (círculo em branco; ativo = accent). Ordem: membros · filtros · busca ·
  // camadas · opções.
  const btnQuadro = 'grid h-8 w-8 shrink-0 place-items-center rounded-full tap'
  const btnOff = 'bg-surface text-muted'
  const btnOn = 'bg-accent-soft text-accent'
  const barra = (
    <div className="hstack gap-1.5 px-5 pt-1">
      <button onClick={onVoltar} aria-label="Voltar" className={cn(btnQuadro, btnOff)}>
        <ChevronLeft size={18} />
      </button>
      <IconeBoard size={18} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-lg font-bold leading-tight">{board.nome}</div>
      </div>
      <button onClick={() => setSheet('membros')} aria-label="Membros do quadro" className="hstack h-8 shrink-0 gap-1.5 rounded-pill border border-line px-2.5 text-xs font-semibold text-muted tap">
        <PilhaAvatares membros={board.membros} />
        <Users size={14} />
      </button>
      <button onClick={() => setSheet('filtros')} aria-label="Filtros" className={cn(btnQuadro, temFiltro ? btnOn : btnOff)}>
        <SlidersHorizontal size={16} />
      </button>
      <button onClick={() => setBuscaAberta((v) => !v)} aria-label="Buscar" className={cn(btnQuadro, buscaAberta || busca ? btnOn : btnOff)}>
        <Search size={16} />
      </button>
      {vista === 'kanban' && (
        <button onClick={() => setAgrupar((a) => !a)} aria-label="Agrupar por responsável" className={cn(btnQuadro, agrupar ? btnOn : btnOff)}>
          <Layers size={16} />
        </button>
      )}
      <button onClick={() => setSheet('arquivados')} aria-label="Cartões arquivados" className={cn(btnQuadro, btnOff)}>
        <Archive size={16} />
      </button>
      <button onClick={() => setSheet('menu')} aria-label="Opções do quadro" className={cn(btnQuadro, btnOff)}>
        <Settings2 size={16} />
      </button>
    </div>
  )

  const toolbar = buscaAberta ? (
    <div className="mt-2 px-5">
      <div className="hstack gap-2 rounded-pill border border-line bg-surface px-3 py-1.5">
        <Search size={14} className="shrink-0 text-muted-2" />
        <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cartão…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2" />
        <button onClick={() => { setBusca(''); setBuscaAberta(false) }} aria-label="Fechar busca">
          <X size={14} className="text-muted-2" />
        </button>
      </div>
    </div>
  ) : null

  const kanbanEl = dragEnabled ? (
    <BoardDnD cols={cols} setCols={setCols} quadroId={board.id} etiquetaPorId={etiquetaPorId} onAbrirCard={abrirCard} onNovoCard={novoCard} />
  ) : (
    <BoardStatic cols={agrupar ? undefined : colsFiltradas} grupos={agrupar ? grupos : null} etiquetaPorId={etiquetaPorId} podeAdicionar={!filtrando} onAbrirCard={abrirCard} onNovoCard={novoCard} />
  )
  const conteudo =
    vista === 'lista' ? (
      <ListaView cols={colsFiltradas} etiquetaPorId={etiquetaPorId} onAbrirCard={abrirCard} />
    ) : vista === 'calendario' ? (
      <CalendarioView cards={colsFiltradas.flatMap((c) => c.cards)} etiquetaPorId={etiquetaPorId} onAbrirCard={abrirCard} />
    ) : (
      kanbanEl
    )
  const conteudoProvido = (
    <QuadroCtx.Provider value={{ admin, pontua: !!board.pontua, onConcluir: concluirCard, onArquivarLista: arquivarLista }}>{conteudo}</QuadroCtx.Provider>
  )

  const overlays = (
    <>
      {cardAberto && (
        <CardModal key={cardAberto.cardId || 'novo'} estado={cardAberto} card={cardLive} board={board} admin={admin} minhaMat={mat} onClose={() => setCardAberto(null)} onRefresh={recarregar} onFeito={async () => { setCardAberto(null); await recarregar() }} />
      )}
      {sheet === 'filtros' && <FiltrosSheet board={board} filtros={filtros} setFiltros={setFiltros} onClose={() => setSheet(null)} />}
      {sheet === 'membros' && <MembrosSheet board={board} admin={admin} onClose={() => setSheet(null)} onFeito={recarregar} />}
      {sheet === 'etiquetas' && <EtiquetasSheet board={board} onClose={() => setSheet(null)} onFeito={recarregar} />}
      {sheet === 'colunas' && <ColunasSheet board={board} onClose={() => setSheet(null)} onFeito={recarregar} />}
      {sheet === 'arquivados' && <ArquivadosSheet board={board} admin={admin} onClose={() => setSheet(null)} onFeito={recarregar} />}
      {sheet === 'editar' && <EditarQuadroSheet board={board} onClose={() => setSheet(null)} onFeito={recarregar} />}
      {sheet === 'modelos' && <ModelosSheet board={board} onClose={() => setSheet(null)} />}
      {sheet === 'menu' && (
        <MenuGerenciar board={board} admin={admin} vista={vista} setVista={setVista} onClose={() => setSheet(null)} onEscolher={(s) => setSheet(s)} onArquivou={() => { setSheet(null); onVoltar() }} onFeito={recarregar} />
      )}
    </>
  )

  if (emCanvas) {
    return (
      <div className="flex h-full flex-col bg-bg pt-3">
        {barra}
        {toolbar}
        <div className="min-h-0 flex-1 overflow-y-auto">{conteudoProvido}</div>
        {overlays}
      </div>
    )
  }
  return (
    <>
      <Header title="Kanban Tatá" />
      {barra}
      {toolbar}
      {conteudoProvido}
      {overlays}
    </>
  )
}

// ── Rosto do cartão (visual puro) ────────────────────────────────────────────
function CardFace({ card, etiquetaPorId, onOpen, handle, semAcoes }) {
  const ctx = useContext(QuadroCtx)
  const etqs = (card.etiquetas || []).map((id) => etiquetaPorId[id]).filter(Boolean)
  const resp = card.responsaveis || []
  const chk = card.checklist || []
  const feitos = chk.filter((c) => c.feito).length
  const nCom = (card.comentarios || []).length
  const nAnexos = (card.anexos || []).length
  const vencido = card.data_conclusao && card.data_conclusao < hojeISO()
  const temMeta = card.data_conclusao || chk.length > 0 || nCom > 0 || nAnexos > 0 || resp.length > 0
  return (
    <div className={cn('rounded-xl border border-line bg-surface p-2.5 shadow-sm', card.concluido && 'opacity-70')}>
      <div className="hstack items-start gap-1.5">
        {handle}
        {!semAcoes && ctx?.onConcluir && (!ctx.pontua || ctx.admin) && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              ctx.onConcluir(card)
            }}
            aria-label={card.concluido ? 'Reabrir cartão' : 'Concluir cartão'}
            title={ctx.pontua ? (card.concluido ? 'Entrega confirmada (+5)' : 'Confirmar entrega (+5)') : undefined}
            className={cn('mt-1 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border tap', card.concluido ? 'border-accent bg-accent text-black' : 'border-line text-muted-2')}
          >
            {card.concluido && <Check size={9} />}
          </button>
        )}
        <button onClick={onOpen} className="min-w-0 flex-1 text-left tap">
          {/* Título à esquerda; cor da etiqueta à direita (acima das fotos dos responsáveis) */}
          <div className="hstack items-start gap-2">
            <div className={cn('min-w-0 flex-1 text-sm font-semibold leading-snug', card.concluido && 'text-muted line-through')}>{card.titulo}</div>
            {etqs.length > 0 && (
              <div className="mt-1.5 hstack shrink-0 flex-wrap justify-end gap-1">
                {etqs.map((e) => (
                  <span key={e.id} className="h-1.5 w-6 rounded-pill" style={{ backgroundColor: e.cor }} title={e.nome} />
                ))}
              </div>
            )}
          </div>
          {temMeta && (
            <div className="mt-2 hstack flex-wrap items-center gap-2 text-[11px]">
              {card.data_conclusao && (
                <span className={cn('hstack gap-1 rounded-pill px-1.5 py-0.5 font-semibold', vencido ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn')}>
                  <CalendarDays size={11} /> {fmtPrazo(card.data_conclusao)}
                </span>
              )}
              {chk.length > 0 && (
                <span className={cn('hstack gap-1 text-muted', feitos === chk.length && 'text-accent')}>
                  <ListChecks size={12} /> {feitos}/{chk.length}
                </span>
              )}
              {nCom > 0 && (
                <span className="hstack gap-1 text-muted">
                  <MessageSquare size={12} /> {nCom}
                </span>
              )}
              {nAnexos > 0 && (
                <span className="hstack gap-1 text-muted">
                  <Paperclip size={12} /> {nAnexos}
                </span>
              )}
              {resp.length > 0 && (
                <span className="ml-auto">
                  <PilhaAvatares membros={resp} size={22} />
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  )
}

function ColunaFace({ col, isOver, bodyRef, children, onNovoCard, podeAdicionar, semArquivar }) {
  const ctx = useContext(QuadroCtx)
  return (
    <section className="flex w-[80vw] max-w-[300px] shrink-0 snap-start flex-col self-start rounded-2xl bg-surface/60 p-2">
      <div className="hstack gap-1 px-1 py-1">
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{col.nome}</span>
        <span className="rounded-pill bg-fill px-1.5 text-[11px] font-semibold text-muted">{col.cards.length}</span>
        {!semArquivar && ctx?.admin && ctx?.onArquivarLista && col.cards.length > 0 && (
          <button onClick={() => ctx.onArquivarLista(col.id)} aria-label="Arquivar todos os cartões da lista" className="grid h-6 w-6 shrink-0 place-items-center text-muted-2 tap">
            <Archive size={13} />
          </button>
        )}
      </div>
      <div ref={bodyRef} className={cn('flex min-h-[8px] flex-col gap-2 rounded-xl p-0.5', isOver && 'bg-accent-soft/40')}>
        {children}
      </div>
      {podeAdicionar && onNovoCard && (
        <button onClick={onNovoCard} className="mt-1 hstack gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-muted tap">
          <Plus size={14} /> Adicionar cartão
        </button>
      )}
    </section>
  )
}

function BoardStatic({ cols, grupos, etiquetaPorId, podeAdicionar, onAbrirCard, onNovoCard }) {
  if (grupos) {
    return (
      <div className="mt-3 flex flex-col gap-5 px-5 pb-24">
        {grupos.length === 0 && <div className="py-10 text-center text-sm text-muted">Nenhum cartão para agrupar.</div>}
        {grupos.map((g) => (
          <div key={g.key}>
            <div className="mb-1.5 hstack gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              <span className="h-px flex-1 bg-line" />
              {g.nome}
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="flex items-start gap-3 overflow-x-auto no-scrollbar snap-x">
              {g.cols.map((col) => (
                <ColunaFace key={col.id} col={col} podeAdicionar={false} semArquivar>
                  {col.cards.map((card) => (
                    <CardFace key={card.id} card={card} etiquetaPorId={etiquetaPorId} onOpen={() => onAbrirCard(col.id, card)} />
                  ))}
                </ColunaFace>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="mt-3 flex items-start gap-3 overflow-x-auto px-5 pb-24 no-scrollbar snap-x">
      {cols.map((col) => (
        <ColunaFace key={col.id} col={col} podeAdicionar={podeAdicionar} onNovoCard={() => onNovoCard(col.id)}>
          {col.cards.map((card) => (
            <CardFace key={card.id} card={card} etiquetaPorId={etiquetaPorId} onOpen={() => onAbrirCard(col.id, card)} />
          ))}
        </ColunaFace>
      ))}
    </div>
  )
}

// ── Visualização em Lista (tabela, estilo Monday) ────────────────────────────
const GRUPO_CORES = ['#3b6fb3', '#7a4fb3', '#2f7d4f', '#d98a2b', '#c2453f', '#0f766e', '#64748b']

function ListaView({ cols, etiquetaPorId, onAbrirCard }) {
  const ctx = useContext(QuadroCtx)
  const vazio = cols.every((c) => c.cards.length === 0)
  return (
    <div className="mt-3 flex flex-col gap-5 px-5 pb-24">
      {vazio && <div className="py-10 text-center text-sm text-muted">Nenhum cartão.</div>}
      {cols.map((col, ci) => {
        if (col.cards.length === 0) return null
        const cor = GRUPO_CORES[ci % GRUPO_CORES.length]
        return (
          <div key={col.id}>
            <div className="mb-2 hstack gap-2">
              <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: cor }} />
              <span className="text-sm font-bold" style={{ color: cor }}>{col.nome}</span>
              <span className="rounded-pill bg-fill px-1.5 text-[10px] font-semibold text-muted">{col.cards.length}</span>
            </div>
            <div className="overflow-x-auto no-scrollbar rounded-card border border-line">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="bg-surface/60 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                    <th className="px-3 py-2 text-left">Tarefa</th>
                    <th className="px-2 py-2 text-center">Resp.</th>
                    <th className="px-2 py-2 text-left">Etiquetas</th>
                    <th className="px-3 py-2 text-center">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {col.cards.map((card) => {
                    const etqs = (card.etiquetas || []).map((id) => etiquetaPorId[id]).filter(Boolean)
                    const vencido = card.data_conclusao && card.data_conclusao < hojeISO()
                    const chk = card.checklist || []
                    const feitos = chk.filter((c) => c.feito).length
                    const nCom = (card.comentarios || []).length
                    return (
                      <tr key={card.id} onClick={() => onAbrirCard(col.id, card)} className="cursor-pointer border-t border-line align-middle hover:bg-surface">
                        <td className="py-2 pr-2">
                          <div className="hstack items-start gap-2">
                            <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                            {ctx?.onConcluir && (!ctx.pontua || ctx.admin) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  ctx.onConcluir(card)
                                }}
                                aria-label={card.concluido ? 'Reabrir' : 'Concluir'}
                                className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border tap', card.concluido ? 'border-accent bg-accent text-black' : 'border-line text-muted-2')}
                              >
                                {card.concluido && <Check size={12} />}
                              </button>
                            )}
                            <div className="min-w-0">
                              <div className={cn('font-semibold leading-snug', card.concluido && 'text-muted line-through')}>{card.titulo}</div>
                              {(chk.length > 0 || nCom > 0) && (
                                <div className="mt-0.5 hstack gap-2 text-[11px] text-muted-2">
                                  {chk.length > 0 && (
                                    <span className={cn('hstack gap-1', feitos === chk.length && 'text-accent')}>
                                      <ListChecks size={11} /> {feitos}/{chk.length}
                                    </span>
                                  )}
                                  {nCom > 0 && (
                                    <span className="hstack gap-1">
                                      <MessageSquare size={11} /> {nCom}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="grid place-items-center">
                            {card.responsaveis?.length ? <PilhaAvatares membros={card.responsaveis} size={24} /> : <span className="text-muted-2">—</span>}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {etqs.length ? (
                            <div className="hstack flex-wrap gap-1">
                              {etqs.map((e) => (
                                <span key={e.id} className="rounded-pill px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: e.cor, color: corTexto(e.cor) }}>
                                  {e.nome}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-2">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {card.data_conclusao ? (
                            <span className={cn('inline-block rounded-pill px-2 py-0.5 text-[11px] font-semibold', vencido ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn')}>
                              {fmtPrazo(card.data_conclusao)}
                            </span>
                          ) : (
                            <span className="text-muted-2">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Visualização em Calendário ───────────────────────────────────────────────
const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function CalendarioView({ cards, etiquetaPorId, onAbrirCard }) {
  const [offset, setOffset] = useState(0)
  const agora = new Date()
  const base = new Date(agora.getFullYear(), agora.getMonth() + offset, 1)
  const ano = base.getFullYear()
  const mes = base.getMonth()
  const inicio = base.getDay()
  const dias = new Date(ano, mes + 1, 0).getDate()
  const hj = hojeISO()

  const porDia = {}
  const semData = []
  for (const c of cards) {
    if (!c.data_conclusao) {
      semData.push(c)
      continue
    }
    const [y, m, d] = c.data_conclusao.split('-').map(Number)
    if (y === ano && m - 1 === mes) (porDia[d] || (porDia[d] = [])).push(c)
  }
  const celulas = []
  for (let i = 0; i < inicio; i++) celulas.push(null)
  for (let d = 1; d <= dias; d++) celulas.push(d)
  const iso = (d) => `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const tituloRaw = base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const titulo = tituloRaw.charAt(0).toUpperCase() + tituloRaw.slice(1)

  function Chip({ c }) {
    const cor = (c.etiquetas || []).map((id) => etiquetaPorId[id]).filter(Boolean)[0]?.cor
    return (
      <button
        onClick={() => onAbrirCard(c.coluna_id, c)}
        className={cn('block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold leading-tight tap', !cor && 'bg-accent text-black')}
        style={cor ? { backgroundColor: cor, color: '#fff' } : undefined}
        title={c.titulo}
      >
        {c.titulo}
      </button>
    )
  }

  return (
    <div className="mt-3 px-5 pb-24">
      <div className="hstack justify-between">
        <button onClick={() => setOffset((o) => o - 1)} aria-label="Mês anterior" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <ChevronLeft size={16} />
        </button>
        <div className="hstack gap-2">
          <span className="font-display text-sm font-bold">{titulo}</span>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="rounded-pill border border-line px-2 py-0.5 text-[10px] font-semibold text-muted tap">
              hoje
            </button>
          )}
        </div>
        <button onClick={() => setOffset((o) => o + 1)} aria-label="Próximo mês" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <ChevronLeft size={16} className="rotate-180" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-2">
        {DOW.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((d, i) => {
          if (d == null) return <div key={`b${i}`} />
          const lista = porDia[d] || []
          const ehHoje = iso(d) === hj
          return (
            <div key={d} className={cn('flex min-h-[64px] flex-col gap-0.5 rounded-lg border p-1', ehHoje ? 'border-accent bg-accent-soft/40' : 'border-line')}>
              <div className={cn('text-[10px] font-bold', ehHoje ? 'text-accent' : 'text-muted')}>{d}</div>
              {lista.slice(0, 2).map((c) => (
                <Chip key={c.id} c={c} />
              ))}
              {lista.length > 2 && <div className="px-1 text-[9px] font-semibold text-muted-2">+{lista.length - 2}</div>}
            </div>
          )
        })}
      </div>

      {semData.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Sem data de entrega</div>
          <div className="flex flex-wrap gap-1.5">
            {semData.map((c) => (
              <button key={c.id} onClick={() => onAbrirCard(c.coluna_id, c)} className="rounded-pill border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-muted tap">
                {c.titulo}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Board com DnD ────────────────────────────────────────────────────────────
function colDoId(cs, id) {
  if (typeof id === 'string' && id.startsWith('col:')) return id.slice(4)
  const c = cs.find((c) => c.cards.some((k) => k.id === id))
  return c?.id ?? null
}

function CardDnD({ card, etiquetaPorId, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }
  return (
    <div ref={setNodeRef} style={style}>
      <CardFace
        card={card}
        etiquetaPorId={etiquetaPorId}
        onOpen={onOpen}
        handle={
          <button {...attributes} {...listeners} aria-label="Arrastar" className="mt-0.5 shrink-0 touch-none text-muted-2 tap">
            <GripVertical size={15} />
          </button>
        }
      />
    </div>
  )
}

function ColunaDnD({ col, etiquetaPorId, onAbrirCard, onNovoCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col.id}` })
  return (
    <ColunaFace col={col} isOver={isOver} bodyRef={setNodeRef} onNovoCard={onNovoCard} podeAdicionar>
      <SortableContext items={col.cards.map((k) => k.id)} strategy={verticalListSortingStrategy}>
        {col.cards.map((card) => (
          <CardDnD key={card.id} card={card} etiquetaPorId={etiquetaPorId} onOpen={() => onAbrirCard(col.id, card)} />
        ))}
      </SortableContext>
    </ColunaFace>
  )
}

function BoardDnD({ cols, setCols, quadroId, etiquetaPorId, onAbrirCard, onNovoCard }) {
  const [ativo, setAtivo] = useState(null)
  const colsRef = useRef(cols)
  useEffect(() => {
    colsRef.current = cols
  }, [cols])
  function aplicar(next) {
    colsRef.current = next
    setCols(next)
  }
  // Ponteiro cobre mouse e toque: começa a arrastar após um pequeno movimento
  // na alça (que tem touch-action:none) — sem precisar segurar. O corpo do
  // cartão continua rolando a coluna normalmente.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const cardById = (id) => {
    for (const c of colsRef.current) {
      const k = c.cards.find((k) => k.id === id)
      if (k) return k
    }
    return null
  }
  function onDragOver({ active, over }) {
    if (!over) return
    const cs = colsRef.current
    const de = colDoId(cs, active.id)
    const para = colDoId(cs, over.id)
    if (!de || !para || de === para) return
    const origem = cs.find((c) => c.id === de)
    const card = origem.cards.find((k) => k.id === active.id)
    if (!card) return
    let idx = cs.find((c) => c.id === para).cards.findIndex((k) => k.id === over.id)
    if (String(over.id).startsWith('col:') || idx < 0) idx = cs.find((c) => c.id === para).cards.length
    const next = cs.map((c) => {
      if (c.id === de) return { ...c, cards: c.cards.filter((k) => k.id !== active.id) }
      if (c.id === para) {
        const nc = [...c.cards]
        nc.splice(idx, 0, { ...card, coluna_id: para })
        return { ...c, cards: nc }
      }
      return c
    })
    aplicar(next)
  }
  async function persistDest(colId, ids) {
    try {
      await call('kanban_cards_reordenar', { p_quadro: quadroId, p_coluna: colId, p_ids: ids })
    } catch (e) {
      avisarErro(e)
    }
  }
  function onDragEnd({ active, over }) {
    setAtivo(null)
    if (!over) return
    let cs = colsRef.current
    const de = colDoId(cs, active.id)
    const para = colDoId(cs, over.id)
    if (!de || !para) return
    if (de === para) {
      const col = cs.find((c) => c.id === de)
      const oi = col.cards.findIndex((k) => k.id === active.id)
      let ni = col.cards.findIndex((k) => k.id === over.id)
      if (String(over.id).startsWith('col:') || ni < 0) ni = col.cards.length - 1
      if (oi >= 0 && oi !== ni) {
        cs = cs.map((c) => (c.id === de ? { ...c, cards: arrayMove(c.cards, oi, ni) } : c))
        aplicar(cs)
      }
    }
    const destCol = cs.find((c) => c.id === para)
    if (destCol) persistDest(para, destCol.cards.map((k) => k.id))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={({ active }) => setAtivo(cardById(active.id))} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setAtivo(null)}>
      <div className="mt-3 flex items-start gap-3 overflow-x-auto px-5 pb-24 no-scrollbar snap-x">
        {cols.map((col) => (
          <ColunaDnD key={col.id} col={col} etiquetaPorId={etiquetaPorId} onAbrirCard={onAbrirCard} onNovoCard={() => onNovoCard(col.id)} />
        ))}
      </div>
      <DragOverlay>
        {ativo ? (
          <div className="rotate-2 shadow-lg">
            <CardFace card={ativo} etiquetaPorId={etiquetaPorId} onOpen={() => {}} semAcoes />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Menu flutuante: abre uma listinha ancorada abaixo do gatilho, por cima do
// conteúdo (não empurra os itens pra baixo). Fecha ao clicar fora. O container
// pai precisa ser `relative`.
function MenuFlutuante({ aberto, onClose, children }) {
  if (!aberto) return null
  return (
    <>
      <button aria-hidden tabIndex={-1} onClick={onClose} className="fixed inset-0 z-[60] cursor-default" />
      <div className="absolute left-0 right-0 top-full z-[61] mt-1 max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface py-1 shadow-xl">
        {children}
      </div>
    </>
  )
}

// ── Modal do cartão ──────────────────────────────────────────────────────────
function CardModal({ estado, card, board, admin, minhaMat, onClose, onFeito, onRefresh }) {
  const existe = estado.modo !== 'criar' && !!card
  const editavel = estado.modo === 'criar' || (estado.modo === 'editar' && admin)
  const base = card || {}
  const [titulo, setTitulo] = useState(base.titulo || '')
  const [descricao, setDescricao] = useState(base.descricao || '')
  const [prazo, setPrazo] = useState(base.data_conclusao || '')
  const [resp, setResp] = useState(() => new Set((base.responsaveis || []).map((r) => r.matricula)))
  const [etqs, setEtqs] = useState(() => new Set(base.etiquetas || []))
  const [salvando, setSalvando] = useState(false)
  const [novoItem, setNovoItem] = useState('')
  const [busy, setBusy] = useState(false)

  // comentário + @menção
  const [novoComent, setNovoComent] = useState('')
  const [frag, setFrag] = useState(null) // fragmento após @ (ou null)

  // anexos
  const [anexando, setAnexando] = useState(false)

  // modelos de checklist + outros quadros (mover)
  const [modelos, setModelos] = useState([])
  const [modelosAbertos, setModelosAbertos] = useState(false)
  const [etqAberto, setEtqAberto] = useState(false)
  const [outrosQuadros, setOutrosQuadros] = useState([])

  // histórico do cartão
  const [hist, setHist] = useState(null)
  const recarregarHist = useCallback(() => {
    if (!card?.id) return
    call('kanban_card_atividade', { p_card: card.id })
      .then((d) => setHist(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [card?.id])
  useEffect(() => {
    recarregarHist()
  }, [recarregarHist])
  useEffect(() => {
    if (!existe) return
    call('kanban_modelos_checklist', { p_quadro: board.id })
      .then((d) => setModelos(Array.isArray(d) ? d : []))
      .catch(() => {})
    call('kanban_meus_quadros')
      .then((d) => setOutrosQuadros((Array.isArray(d) ? d : []).filter((q) => q.id !== board.id)))
      .catch(() => {})
  }, [existe, board.id])

  function toggle(setState, valor) {
    setState((s) => {
      const n = new Set(s)
      n.has(valor) ? n.delete(valor) : n.add(valor)
      return n
    })
  }

  async function salvar() {
    if (!titulo.trim()) return
    setSalvando(true)
    try {
      const args = {
        p_quadro: board.id,
        p_coluna: estado.modo === 'editar' && card?.coluna_id ? card.coluna_id : estado.colunaId,
        p_titulo: titulo.trim(),
        p_descricao: descricao.trim() || null,
        p_data_conclusao: prazo || null,
        p_responsaveis: Array.from(resp),
        p_etiquetas: Array.from(etqs),
      }
      if (estado.modo === 'editar' && card?.id) args.p_id = card.id
      await call('kanban_card_salvar', args)
      await onFeito()
    } catch (e) {
      avisarErro(e)
      setSalvando(false)
    }
  }
  async function acaoCard(fn, args) {
    setSalvando(true)
    try {
      await call(fn, args)
      await onFeito()
    } catch (e) {
      avisarErro(e)
      setSalvando(false)
    }
  }
  async function sub(fn, args) {
    setBusy(true)
    try {
      await call(fn, args)
      await onRefresh()
      recarregarHist()
    } catch (e) {
      avisarErro(e)
    } finally {
      setBusy(false)
    }
  }
  async function moverParaQuadro(quadroId) {
    if (!quadroId) return
    setBusy(true)
    try {
      const cols = await call('kanban_quadro_colunas', { p_quadro: quadroId })
      const destCol = cols?.[0]?.id
      if (!destCol) throw new Error('O quadro de destino não tem listas.')
      await call('kanban_card_mover_quadro', { p_id: card.id, p_quadro_dest: quadroId, p_coluna_dest: destCol })
      await onFeito()
    } catch (e) {
      avisarErro(e)
      setBusy(false)
    }
  }

  // anexos — sobe pro bucket kanban (<quadro>/<card>/<uuid>) e grava metadado
  async function enviarAnexo(file) {
    if (!file || !card?.id) return
    if (file.size > 15 * 1024 * 1024) {
      avisarErro(new Error('Arquivo muito grande (máx. 15 MB).'))
      return
    }
    setAnexando(true)
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
      const caminho = `${board.id}/${card.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('kanban')
        .upload(caminho, file, { contentType: file.type || undefined, cacheControl: '3600' })
      if (upErr) throw upErr
      const url = supabase.storage.from('kanban').getPublicUrl(caminho).data.publicUrl
      await call('kanban_anexo_add', {
        p_card: card.id,
        p_nome: file.name,
        p_url: url,
        p_mime: file.type || null,
        p_tamanho: file.size,
      })
      await onRefresh()
      recarregarHist()
    } catch (e) {
      avisarErro(e)
    } finally {
      setAnexando(false)
    }
  }
  async function removerAnexo(a) {
    setBusy(true)
    try {
      // Apaga o arquivo no storage ANTES do registro: a policy de exclusão do
      // bucket confere a linha em card_anexos pra saber se é o dono (ou admin).
      const path = a.url.split('/kanban/')[1]?.split('?')[0]
      if (path) {
        const { error: rmErr } = await supabase.storage.from('kanban').remove([decodeURIComponent(path)])
        if (rmErr) throw rmErr
      }
      await call('kanban_anexo_excluir', { p_id: a.id })
      await onRefresh()
      recarregarHist()
    } catch (e) {
      avisarErro(e)
    } finally {
      setBusy(false)
    }
  }

  // @menção: detecta o fragmento após "@" até o cursor
  function onComentChange(e) {
    const v = e.target.value
    setNovoComent(v)
    const caret = e.target.selectionStart ?? v.length
    const m = v.slice(0, caret).match(/@([\p{L}\p{N}._-]*)$/u)
    setFrag(m ? m[1] : null)
  }
  function escolherMencao(p) {
    setNovoComent((v) => v.replace(/@([\p{L}\p{N}._-]*)$/u, '@' + primeiro(p.nome) + ' '))
    setFrag(null)
  }
  function enviarComentario() {
    const texto = novoComent.trim()
    if (!texto) return
    // Extrai os @tokens do texto e casa com os membros pelo primeiro nome —
    // robusto: funciona escolhendo na lista OU digitando o nome à mão.
    const tokens = (texto.match(/@([\p{L}\p{N}._-]+)/gu) || []).map((t) => t.slice(1).toLowerCase())
    const alvo = tokens.length ? board.membros.filter((m) => tokens.includes(primeiro(m.nome).toLowerCase())).map((m) => m.matricula) : []
    sub('kanban_comentario_add', { p_card: card.id, p_texto: texto, p_mencoes: alvo })
    setNovoComent('')
    setFrag(null)
  }
  const sugestoes =
    frag == null
      ? []
      : board.membros.filter((p) => frag === '' || p.nome.toLowerCase().includes(frag.toLowerCase())).slice(0, 6)

  const checklist = card?.checklist || []
  const feitos = checklist.filter((c) => c.feito).length
  const comentarios = card?.comentarios || []
  const anexos = card?.anexos || []
  const ehImagem = (a) =>
    /^image\//.test(a.mime || '') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(a.nome || '')
  const etqSel = board.etiquetas.find((e) => etqs.has(e.id)) // categoria é única (uma por vez)
  const lbl = 'font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted'
  const chipSel = 'border-[#35383F] bg-[#35383F] text-white'
  const ctaEscuro = 'bg-[#35383F] text-[#CFFF00]'
  const selCls = 'mt-2 w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-xs font-semibold outline-none'

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
        <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-xl sm:max-w-[580px] sm:rounded-2xl">
          <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line sm:hidden" />

          {/* Cabeçalho: [concluir] sobrancelha+título [arquivar] [excluir] [fechar] */}
          <div className="flex shrink-0 items-start gap-2.5 border-b border-line px-5 py-3">
            {existe && (!board.pontua || admin) && (
              <button
                onClick={() => sub('kanban_card_concluir', { p_id: card.id, p_concluido: !card.concluido })}
                disabled={busy}
                aria-label={card.concluido ? 'Reabrir cartão' : 'Concluir cartão'}
                title={board.pontua ? (card.concluido ? 'Entrega confirmada (+5)' : 'Confirmar entrega (+5)') : card.concluido ? 'Concluído' : 'Concluir'}
                className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border tap', card.concluido ? 'border-[#35383F] ' + ctaEscuro : 'border-line text-muted-2')}
              >
                {card.concluido && <Check size={14} />}
              </button>
            )}
            <div className="min-w-0 flex-1">
              {editavel ? (
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do cartão" aria-label="Título do cartão"
                  className="w-full bg-transparent text-[18px] font-bold leading-tight tracking-[-0.3px] text-carbon outline-none placeholder:text-muted-2 dark:text-text" />
              ) : (
                <div className={cn('text-[18px] font-bold leading-tight tracking-[-0.3px] text-carbon dark:text-text', card?.concluido && 'text-muted line-through')}>{base.titulo}</div>
              )}
            </div>
            <div className="hstack shrink-0 gap-0.5">
              {estado.modo === 'editar' && admin && card?.id && (
                <>
                  <button onClick={() => acaoCard('kanban_card_arquivar', { p_id: card.id, p_arquivar: true })} disabled={salvando} aria-label="Arquivar" title="Arquivar" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-fill tap disabled:opacity-40">
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Excluir este cartão? Esta ação não pode ser desfeita.')) acaoCard('kanban_card_excluir', { p_id: card.id })
                    }}
                    disabled={salvando}
                    aria-label="Excluir"
                    title="Excluir"
                    className="grid h-8 w-8 place-items-center rounded-full text-danger hover:bg-fill tap disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              <button onClick={onClose} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-fill tap">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Corpo rolável */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            {existe && (
              <div className="grid grid-cols-2 items-start gap-4">
                <div>
                  <div className={lbl}>Mover para lista</div>
                  <select
                    value={card.coluna_id}
                    disabled={busy}
                    onChange={(e) => {
                      if (e.target.value !== card.coluna_id) sub('kanban_card_mover_lista', { p_id: card.id, p_coluna: e.target.value })
                    }}
                    className={selCls}
                  >
                    {board.colunas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className={lbl}>Mover para outro quadro</div>
                  <select value="" disabled={busy || outrosQuadros.length === 0} onChange={(e) => moverParaQuadro(e.target.value)} className={cn(selCls, 'disabled:opacity-50')}>
                    <option value="">{outrosQuadros.length ? 'Selecionar…' : 'Sem outros quadros'}</option>
                    {outrosQuadros.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Categoria (etiquetas) | Responsáveis */}
            <div className={cn(board.etiquetas.length > 0 && 'grid grid-cols-2 items-start gap-4')}>
              {board.etiquetas.length > 0 && (
                <div>
                  <div className={lbl}>Categoria</div>
                  <div className="relative mt-2">
                    <button
                      disabled={!editavel}
                      onClick={() => setEtqAberto((v) => !v)}
                      className={cn('hstack gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold tap disabled:opacity-100', etqSel ? 'border-transparent' : 'border-line text-muted')}
                      style={etqSel ? { backgroundColor: etqSel.cor, color: corTexto(etqSel.cor) } : undefined}
                    >
                      {etqSel ? etqSel.nome : 'Etiqueta'}
                    </button>
                    <MenuFlutuante aberto={etqAberto && editavel} onClose={() => setEtqAberto(false)}>
                      {board.etiquetas.map((e) => {
                        const on = etqs.has(e.id)
                        return (
                          <button key={e.id} onClick={() => { setEtqs(new Set(on ? [] : [e.id])); setEtqAberto(false) }} className="hstack w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold tap hover:bg-fill">
                            <span className="rounded-pill px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: e.cor, color: corTexto(e.cor) }}>
                              {e.nome}
                            </span>
                            <span className="flex-1" />
                            {on && <Check size={13} className="shrink-0 text-carbon dark:text-text" />}
                          </button>
                        )
                      })}
                    </MenuFlutuante>
                  </div>
                </div>
              )}
              <div>
                <div className={lbl}>Responsáveis</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {board.membros.map((p) => {
                    const on = resp.has(p.matricula)
                    return (
                      <button key={p.matricula} disabled={!editavel} onClick={() => toggle(setResp, p.matricula)} className={cn('hstack gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold tap', on ? chipSel : 'border-line text-muted')}>
                        <Avatar name={p.nome} src={p.avatar} size={18} />
                        {primeiro(p.nome)}
                        {on && <Check size={13} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <div className={lbl}>Descrição</div>
              {editavel ? (
                <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhe a tarefa…" className="mt-2 w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted-2" />
              ) : (
                <div className="mt-1.5 whitespace-pre-wrap text-sm text-muted">{base.descricao || '—'}</div>
              )}
            </div>

            {/* Checklist | Prazo de conclusão */}
            <div className={cn(existe && 'grid grid-cols-2 items-start gap-4')}>
              {existe && (
                <div>
                  <div className="relative">
                    <div className="hstack justify-between">
                      <div className={lbl}>Checklist</div>
                      <div className="hstack gap-2">
                        {modelos.length > 0 && (
                          <button onClick={() => setModelosAbertos((v) => !v)} className="hstack gap-1 font-mono text-[9px] font-medium uppercase tracking-[0.4px] text-carbon tap">
                            <ListChecks size={11} /> Usar pronto
                          </button>
                        )}
                        {checklist.length > 0 && <div className="font-mono text-[10px] text-muted">{feitos}/{checklist.length}</div>}
                      </div>
                    </div>
                    <MenuFlutuante aberto={modelosAbertos && modelos.length > 0} onClose={() => setModelosAbertos(false)}>
                      {modelos.map((m) => (
                        <button key={m.id} onClick={() => { sub('kanban_checklist_aplicar', { p_card: card.id, p_modelo: m.id }); setModelosAbertos(false) }} className="hstack w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-muted tap hover:bg-fill">
                          <span className="min-w-0 flex-1 truncate">{m.nome}</span>
                          <span className="shrink-0 text-muted-2">({(m.itens || []).length})</span>
                        </button>
                      ))}
                    </MenuFlutuante>
                  </div>
                  <div className="mt-2 hstack gap-2">
                    <input value={novoItem} onChange={(e) => setNovoItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && novoItem.trim()) { sub('kanban_checklist_add', { p_card: card.id, p_texto: novoItem.trim() }); setNovoItem('') } }} placeholder="Adicionar item…" className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted-2" />
                    <button onClick={() => { if (novoItem.trim()) { sub('kanban_checklist_add', { p_card: card.id, p_texto: novoItem.trim() }); setNovoItem('') } }} disabled={busy || !novoItem.trim()} className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg tap disabled:opacity-40', ctaEscuro)}>
                      <Plus size={15} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {checklist.map((it) => (
                      <div key={it.id} className="hstack gap-2">
                        <button onClick={() => sub('kanban_checklist_toggle', { p_item: it.id, p_feito: !it.feito })} disabled={busy} aria-label={it.feito ? 'Desmarcar' : 'Marcar'} className={cn('grid h-5 w-5 shrink-0 place-items-center rounded border tap', it.feito ? 'border-[#35383F] ' + ctaEscuro : 'border-line')}>
                          {it.feito && <Check size={13} />}
                        </button>
                        <span className={cn('min-w-0 flex-1 text-sm', it.feito && 'text-muted line-through')}>{it.texto}</span>
                        <button onClick={() => sub('kanban_checklist_excluir', { p_item: it.id })} disabled={busy} aria-label="Remover item" className="shrink-0 text-muted-2 tap">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className={lbl}>Prazo de conclusão</div>
                {editavel ? (
                  <input type="date" value={prazo || ''} onChange={(e) => setPrazo(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
                ) : (
                  <div className="mt-1.5 text-sm">{prazo ? fmtPrazo(prazo) : '—'}</div>
                )}
              </div>
            </div>

            {/* Anexos */}
            {existe && (
              <div>
                <div className={lbl}>Anexos</div>
                <label
                  className={cn(
                    'mt-2 hstack w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-2.5 text-xs font-semibold text-muted tap',
                    (anexando || busy) && 'pointer-events-none opacity-50',
                  )}
                >
                  {anexando ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  {anexando ? 'Enviando…' : 'Anexar arquivo'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={anexando || busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) enviarAnexo(f)
                      e.target.value = ''
                    }}
                  />
                </label>
                {anexos.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {anexos.map((a) => (
                      <div key={a.id} className="relative overflow-hidden rounded-lg border border-line bg-bg">
                        {ehImagem(a) ? (
                          <a href={a.url} target="_blank" rel="noreferrer" title={a.nome}>
                            <img src={a.url} alt={a.nome} loading="lazy" className="h-24 w-full object-cover" />
                          </a>
                        ) : (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            title={a.nome}
                            className="hstack h-24 items-center gap-2 px-3"
                          >
                            <FileText size={20} className="shrink-0 text-muted" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">{a.nome}</span>
                          </a>
                        )}
                        {(admin || a.matricula === minhaMat) && (
                          <button
                            onClick={() => removerAnexo(a)}
                            disabled={busy}
                            aria-label="Remover anexo"
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white tap disabled:opacity-40"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comentários — campo de escrever fica em cima da lista */}
            {existe && (
              <div>
                <div className={lbl}>Comentários</div>
                {sugestoes.length > 0 && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
                    <div className={cn('hstack gap-1 border-b border-line px-3 py-1.5', lbl)}>
                      <AtSign size={11} /> Marcar alguém
                    </div>
                    {sugestoes.map((p) => (
                      <button key={p.matricula} onClick={() => escolherMencao(p)} className="hstack w-full gap-2 px-3 py-2 text-left tap hover:bg-fill">
                        <Avatar name={p.nome} src={p.avatar} size={22} />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          <span className="font-semibold">@{primeiro(p.nome)}</span> <span className="text-muted">· {p.nome}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 hstack gap-2">
                  <input value={novoComent} onChange={onComentChange} onKeyDown={(e) => { if (e.key === 'Enter' && frag == null) enviarComentario() }} placeholder="Comente e use @ para marcar…" className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted-2" />
                  <button onClick={enviarComentario} disabled={busy || !novoComent.trim()} className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg tap disabled:opacity-40', ctaEscuro)}>
                    <Send size={15} />
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {comentarios.map((c) => (
                    <div key={c.id} className="hstack items-start gap-2">
                      <Avatar name={c.nome} src={c.avatar} size={24} />
                      <div className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2">
                        <div className="hstack justify-between gap-2">
                          <div className="truncate font-mono text-[10px] uppercase tracking-[0.4px] text-muted">{c.nome}</div>
                          <div className="shrink-0 font-mono text-[9px] text-muted-2">{fmtQuando(c.created_at)}</div>
                        </div>
                        <div className="mt-0.5 text-sm">{c.texto}</div>
                      </div>
                    </div>
                  ))}
                  {comentarios.length === 0 && <div className="text-xs text-muted-2">Sem comentários ainda.</div>}
                </div>
              </div>
            )}

            {existe && (
              <div>
                <div className={cn('hstack gap-1.5', lbl)}>
                  <History size={11} /> Histórico
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {hist == null ? (
                    <div className="text-xs text-muted-2">Carregando…</div>
                  ) : hist.length === 0 ? (
                    <div className="text-xs text-muted-2">Sem histórico.</div>
                  ) : (
                    hist.map((a) => (
                      <div key={a.id} className="hstack items-start gap-2 text-[12px]">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-2" />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{primeiro(a.nome)}</span> <span className="text-muted">{ACOES[a.acao] || a.acao}</span>
                          <span className="ml-1 font-mono text-[9px] text-muted-2">{fmtQuando(a.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Rodapé: só Salvar (fechar = cancelar) */}
          {editavel && (
            <div className="flex shrink-0 border-t border-line bg-surface px-5 py-3 pb-6">
              <button onClick={salvar} disabled={salvando || !titulo.trim()} className={cn('hstack h-10 w-full items-center justify-center gap-2 rounded-lg font-mono text-[10px] font-medium uppercase tracking-[0.6px] tap disabled:opacity-40', ctaEscuro)}>
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {estado.modo === 'criar' ? 'Criar' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

// ── Filtros ──────────────────────────────────────────────────────────────────
function FiltrosSheet({ board, filtros, setFiltros, onClose }) {
  function toggleSet(chave, val) {
    setFiltros((f) => {
      const n = new Set(f[chave])
      n.has(val) ? n.delete(val) : n.add(val)
      return { ...f, [chave]: n }
    })
  }
  const chip = (on) => cn('rounded-pill border px-3 py-1.5 text-xs font-semibold tap', on ? 'border-accent bg-accent-soft text-carbon dark:text-accent' : 'border-line text-muted')
  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Filtros</div>
      <div className="mt-3 hstack flex-wrap gap-2">
        <button onClick={() => setFiltros((f) => ({ ...f, soMeus: !f.soMeus }))} className={chip(filtros.soMeus)}>Meus cartões</button>
        <button onClick={() => setFiltros((f) => ({ ...f, soVencidos: !f.soVencidos }))} className={chip(filtros.soVencidos)}>Vencidos</button>
      </div>
      {board.etiquetas.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Etiquetas</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {board.etiquetas.map((e) => {
              const on = filtros.filtroEtq.has(e.id)
              return (
                <button key={e.id} onClick={() => toggleSet('filtroEtq', e.id)} className={cn('hstack gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold tap', on ? 'text-white' : 'border-line text-muted')} style={on ? { backgroundColor: e.cor, borderColor: e.cor } : undefined}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? '#fff' : e.cor }} />
                  {e.nome}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Responsáveis</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {board.membros.map((p) => {
            const on = filtros.filtroResp.has(p.matricula)
            return (
              <button key={p.matricula} onClick={() => toggleSet('filtroResp', p.matricula)} className={cn('hstack gap-1.5', chip(on))}>
                <Avatar name={p.nome} src={p.avatar} size={18} />
                {primeiro(p.nome)}
              </button>
            )
          })}
        </div>
      </div>
      <button onClick={() => setFiltros({ filtroEtq: new Set(), filtroResp: new Set(), soVencidos: false, soMeus: false })} className="mt-6 hstack w-full justify-center gap-2 rounded-card bg-surface p-3 text-sm font-semibold text-muted tap">
        Limpar filtros
      </button>
    </Sheet>
  )
}

// ── Menu de gerenciamento (admin) ────────────────────────────────────────────
function MenuGerenciar({ board, admin, vista, setVista, onClose, onEscolher, onArquivou, onFeito }) {
  const [busy, setBusy] = useState(false)
  const [pontua, setPontua] = useState(!!board.pontua)
  async function togglePontua() {
    const novo = !pontua
    setPontua(novo)
    try {
      await call('kanban_quadro_pontua_set', { p_quadro: board.id, p_pontua: novo })
      onFeito && onFeito()
    } catch (e) {
      setPontua(!novo)
      avisarErro(e)
    }
  }
  async function arquivarQuadro() {
    if (!window.confirm('Arquivar o quadro inteiro? Ele sai da sua lista.')) return
    setBusy(true)
    try {
      await call('kanban_quadro_arquivar', { p_quadro: board.id, p_arquivar: true })
      onArquivou()
    } catch (e) {
      avisarErro(e)
      setBusy(false)
    }
  }
  const item = 'hstack w-full gap-3 rounded-card border border-line px-4 py-3 text-sm font-semibold tap'
  const VISUALIZACOES = [
    ['kanban', 'Kanban', Columns3],
    ['lista', 'Lista', List],
    ['calendario', 'Calendário', CalendarDays],
  ]
  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Opções do quadro</div>

      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Visualização</div>
      <div className="mt-2 flex flex-col gap-2">
        {VISUALIZACOES.map(([v, label, Ic]) => (
          <button key={v} onClick={() => { setVista(v); onClose() }} className={cn(item, vista === v && 'border-accent bg-accent-soft text-accent')}>
            <Ic size={17} className={vista === v ? 'text-accent' : 'text-muted'} /> {label}
            {vista === v && <Check size={16} className="ml-auto" />}
          </button>
        ))}
      </div>

      {admin && (
        <>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Gerenciar quadro</div>
          <div className="mt-2 flex flex-col gap-2">
            <button className={item} onClick={() => onEscolher('editar')}>
              <Pencil size={17} className="text-accent" /> Editar nome e ícone do quadro
            </button>
            <button className={item} onClick={() => onEscolher('membros')}>
              <Users size={17} className="text-accent" /> Membros
            </button>
            <button className={item} onClick={() => onEscolher('etiquetas')}>
              <Tag size={17} className="text-accent" /> Etiquetas
            </button>
            <button className={item} onClick={() => onEscolher('colunas')}>
              <Columns3 size={17} className="text-accent" /> Colunas
            </button>
            <button className={item} onClick={() => onEscolher('modelos')}>
              <ListChecks size={17} className="text-accent" /> Checklists prontos
            </button>
            <div className="hstack w-full gap-3 rounded-card border border-line px-4 py-3">
              <Star size={17} className="shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Pontuação</div>
                <div className="text-[11px] text-muted">+5 pontos para cada tarefa concluída (por responsável)</div>
              </div>
              <button
                onClick={togglePontua}
                aria-label={pontua ? 'Desativar pontuação' : 'Ativar pontuação'}
                className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors tap', pontua ? 'bg-accent' : 'bg-surface-2')}
              >
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', pontua ? 'left-[18px]' : 'left-0.5')} />
              </button>
            </div>
            <button onClick={arquivarQuadro} disabled={busy} className={cn(item, 'text-danger disabled:opacity-40')}>
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Archive size={17} />} Arquivar quadro
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}

// ── Cartões arquivados ───────────────────────────────────────────────────────
function ArquivadosSheet({ board, admin, onClose, onFeito }) {
  const [itens, setItens] = useState(null)
  const [busca, setBusca] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    call('kanban_arquivados', { p_quadro: board.id })
      .then((d) => setItens(d || []))
      .catch(() => setItens([]))
  }, [board.id])
  async function restaurar(id) {
    setBusy(true)
    try {
      await call('kanban_card_arquivar', { p_id: id, p_arquivar: false })
      setItens((l) => l.filter((c) => c.id !== id))
      onFeito()
    } catch (e) {
      avisarErro(e)
    } finally {
      setBusy(false)
    }
  }
  const q = busca.trim().toLowerCase()
  const filtrados = (itens || []).filter((c) => !q || (c.titulo || '').toLowerCase().includes(q))
  return (
    <Sheet onClose={onClose}>
      <div className="hstack gap-2">
        <Archive size={18} className="text-accent" />
        <div className="font-display text-lg font-bold">Cartões arquivados</div>
        {itens && <span className="rounded-pill bg-fill px-2 py-0.5 text-[11px] font-semibold text-muted">{itens.length}</span>}
      </div>
      {itens && itens.length > 0 && (
        <div className="mt-3 hstack gap-2 rounded-pill border border-line bg-surface px-3 py-1.5">
          <Search size={14} className="shrink-0 text-muted-2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar arquivado…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2" />
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {itens == null ? (
          <div className="hstack justify-center py-8 text-muted-2"><Loader2 size={20} className="animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">{itens.length === 0 ? 'Nenhum cartão arquivado.' : 'Nada encontrado.'}</div>
        ) : (
          filtrados.slice(0, 300).map((c) => (
            <div key={c.id} className="rounded-card border border-line p-3">
              <div className="hstack items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.titulo}</div>
                  <div className="mt-1 hstack flex-wrap items-center gap-1.5 text-[11px] text-muted">
                    <span>{c.coluna}</span>
                    <span>· {fmtQuando(c.created_at)}</span>
                    {c.ncom > 0 && <span className="hstack gap-0.5"><MessageSquare size={11} /> {c.ncom}</span>}
                    {c.nchk > 0 && <span className="hstack gap-0.5"><ListChecks size={11} /> {c.nchk}</span>}
                  </div>
                  {(c.etiquetas || []).length > 0 && (
                    <div className="mt-1.5 hstack flex-wrap gap-1">
                      {c.etiquetas.map((e, i) => (
                        <span key={i} className="rounded-pill px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: e.cor, color: corTexto(e.cor) }}>{e.nome}</span>
                      ))}
                    </div>
                  )}
                </div>
                {admin && (
                  <button onClick={() => restaurar(c.id)} disabled={busy} className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-accent tap disabled:opacity-40">
                    Restaurar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {filtrados.length > 300 && (
          <div className="py-2 text-center text-[11px] text-muted-2">Mostrando 300 de {filtrados.length} — refine a busca.</div>
        )}
      </div>
    </Sheet>
  )
}

// ── Membros ──────────────────────────────────────────────────────────────────
function MembrosSheet({ board, admin, onClose, onFeito }) {
  const adminMats = useMemo(() => (board.membros || []).filter((m) => m.papel === 'admin').map((m) => m.matricula), [board])
  const [sel, setSel] = useState(() => new Set((board.membros || []).filter((m) => m.papel !== 'admin').map((m) => m.matricula)))
  const [nomes, setNomes] = useState(() => {
    const m = {}
    for (const p of board.membros || []) m[p.matricula] = p.nome
    return m
  })
  const [avatares, setAvatares] = useState(() => {
    const m = {}
    for (const p of board.membros || []) m[p.matricula] = p.avatar
    return m
  })
  const [q, setQ] = useState('')
  const [res, setRes] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!admin) return
    let ativo = true
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const data = await call('kanban_buscar_pessoas', { p_q: q.trim() })
        if (ativo) setRes(Array.isArray(data) ? data : [])
      } catch {
        /* silencioso */
      } finally {
        if (ativo) setBuscando(false)
      }
    }, 280)
    return () => {
      ativo = false
      clearTimeout(t)
    }
  }, [q, admin])

  const total = adminMats.length + sel.size
  function toggle(mat, nome, avatar) {
    if (adminMats.includes(mat)) return
    setNomes((n) => ({ ...n, [mat]: nome || n[mat] }))
    setAvatares((a) => ({ ...a, [mat]: avatar ?? a[mat] }))
    setSel((s) => {
      const n = new Set(s)
      if (n.has(mat)) n.delete(mat)
      else {
        if (adminMats.length + n.size >= 10) return n
        n.add(mat)
      }
      return n
    })
  }
  async function salvar() {
    setSalvando(true)
    try {
      await call('kanban_membros_set', { p_quadro: board.id, p_matriculas: Array.from(sel) })
      await onFeito()
      onClose()
    } catch (e) {
      avisarErro(e)
      setSalvando(false)
    }
  }
  const selecionados = Array.from(sel)

  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Membros do quadro</div>
      <div className="mt-1 text-xs text-muted">
        {admin ? 'Convide até 10 pessoas para o time.' : 'Quem participa deste quadro.'} · {total}/10
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {(board.membros || [])
          .filter((m) => m.papel === 'admin')
          .map((m) => (
            <div key={m.matricula} className="hstack gap-3 rounded-card border border-line px-3 py-2">
              <Avatar name={m.nome} src={m.avatar} size={30} />
              <span className="flex-1 text-sm font-semibold">{m.nome}</span>
              <span className="text-[11px] font-semibold text-accent">admin</span>
            </div>
          ))}
        {selecionados.map((mt) => (
          <div key={mt} className="hstack gap-3 rounded-card border border-accent bg-accent-soft px-3 py-2">
            <Avatar name={nomes[mt] || mt} src={avatares[mt]} size={30} />
            <span className="flex-1 text-sm font-semibold">{nomes[mt] || `Matrícula ${mt}`}</span>
            {admin && (
              <button onClick={() => toggle(mt)} aria-label="Remover" className="text-muted-2 tap">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {admin && (
        <>
          <div className="mt-4 hstack gap-2 rounded-card border border-line bg-surface px-3 py-2">
            <Search size={15} className="text-muted-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoa pelo nome…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2" />
            {buscando && <Loader2 size={14} className="animate-spin text-muted-2" />}
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {res
              .filter((p) => !adminMats.includes(p.matricula) && !sel.has(p.matricula))
              .map((p) => (
                <button key={p.matricula} onClick={() => toggle(p.matricula, p.nome, p.avatar)} className="hstack gap-3 rounded-card px-3 py-2 text-left tap hover:bg-surface">
                  <Avatar name={p.nome} src={p.avatar} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.nome}</span>
                    {p.cargo && <span className="block truncate text-[11px] text-muted">{p.cargo}</span>}
                  </span>
                  <Plus size={16} className="text-muted-2" />
                </button>
              ))}
          </div>
          <button onClick={salvar} disabled={salvando} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar membros
          </button>
        </>
      )}
    </Sheet>
  )
}

// ── Etiquetas ────────────────────────────────────────────────────────────────
function EtiquetasSheet({ board, onClose, onFeito }) {
  const [draft, setDraft] = useState(() => (board.etiquetas || []).map((e) => ({ id: e.id, nome: e.nome, cor: e.cor })))
  const [salvando, setSalvando] = useState(false)
  function up(i, patch) {
    setDraft((d) => d.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  }
  function add() {
    if (draft.length >= 5) return
    setDraft((d) => [...d, { nome: 'Nova etiqueta', cor: CORES[d.length % CORES.length] }])
  }
  function remover(i) {
    setDraft((d) => d.filter((_, j) => j !== i))
  }
  async function salvar() {
    setSalvando(true)
    try {
      await call('kanban_etiquetas_set', { p_quadro: board.id, p_etiquetas: draft.map((e, i) => ({ id: e.id || null, nome: e.nome, cor: e.cor, ordem: i })) })
      await onFeito()
      onClose()
    } catch (e) {
      avisarErro(e)
      setSalvando(false)
    }
  }
  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Etiquetas</div>
      <div className="mt-1 text-xs text-muted">Até 5 etiquetas por quadro.</div>
      <div className="mt-3 flex flex-col gap-2">
        {draft.map((e, i) => (
          <div key={e.id || `n${i}`} className="hstack gap-2 rounded-card border border-line bg-surface px-2.5 py-2">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} />
            <input value={e.nome} onChange={(ev) => up(i, { nome: ev.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" aria-label="Nome da etiqueta" />
            <div className="hstack gap-1">
              {CORES.map((c) => (
                <button key={c} onClick={() => up(i, { cor: c })} aria-label={`Cor ${c}`} className={cn('h-5 w-5 rounded-full tap', e.cor === c && 'ring-2 ring-offset-1 ring-carbon')} style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={() => remover(i)} aria-label="Remover etiqueta" className="shrink-0 text-muted-2 tap">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      {draft.length < 5 && (
        <button onClick={add} className="mt-2 hstack gap-1 rounded-card border border-dashed border-line px-3 py-2 text-xs font-semibold text-muted tap">
          <Plus size={14} /> Adicionar etiqueta
        </button>
      )}
      <button onClick={salvar} disabled={salvando} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar etiquetas
      </button>
    </Sheet>
  )
}

// ── Colunas ──────────────────────────────────────────────────────────────────
const ehConcluido = (nome) => /^\s*conclu/i.test(nome || '')
function ColunasSheet({ board, onClose, onFeito }) {
  const [draft, setDraft] = useState(() => (board.colunas || []).map((c) => ({ id: c.id, nome: c.nome })))
  const [salvando, setSalvando] = useState(false)
  const nConcluido = draft.filter((c) => ehConcluido(c.nome)).length
  const temConcluido = nConcluido > 0
  function up(i, nome) {
    setDraft((d) => d.map((c, j) => (j === i ? { ...c, nome } : c)))
  }
  function add() {
    if (draft.length >= 5) return
    setDraft((d) => [...d, { nome: 'Nova coluna' }])
  }
  function remover(i) {
    if (draft.length <= 1) return
    setDraft((d) => d.filter((_, j) => j !== i))
  }
  async function salvar() {
    setSalvando(true)
    try {
      await call('kanban_colunas_set', { p_quadro: board.id, p_colunas: draft.map((c, i) => ({ id: c.id || null, nome: c.nome, ordem: i })) })
      await onFeito()
      onClose()
    } catch (e) {
      avisarErro(e)
      setSalvando(false)
    }
  }
  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Colunas</div>
      <div className="mt-1 text-xs text-muted">
        Até 5 colunas. É obrigatório manter uma coluna <b>“Concluídos”</b> — é onde o responsável joga a tarefa feita.
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {draft.map((c, i) => {
          const fixa = ehConcluido(c.nome) && nConcluido === 1 // não deixa remover a única "Concluído"
          return (
            <div key={c.id || `n${i}`} className="hstack gap-2 rounded-card border border-line bg-surface px-2.5 py-2">
              <Columns3 size={15} className="shrink-0 text-muted-2" />
              <input value={c.nome} onChange={(ev) => up(i, ev.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" aria-label="Nome da coluna" />
              {draft.length > 1 && !fixa && (
                <button onClick={() => remover(i)} aria-label="Remover coluna" className="shrink-0 text-muted-2 tap">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      {draft.length < 5 && (
        <button onClick={add} className="mt-2 hstack gap-1 rounded-card border border-dashed border-line px-3 py-2 text-xs font-semibold text-muted tap">
          <Plus size={14} /> Adicionar coluna
        </button>
      )}
      {!temConcluido && (
        <p className="mt-2 text-[11px] font-medium text-danger">O quadro precisa de uma coluna “Concluídos”.</p>
      )}
      <button onClick={salvar} disabled={salvando || !temConcluido} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar colunas
      </button>
    </Sheet>
  )
}

// ── Editar quadro (nome + ícone) ─────────────────────────────────────────────
function EditarQuadroSheet({ board, onClose, onFeito }) {
  const [nome, setNome] = useState(board.nome)
  const [icone, setIcone] = useState(board.icone || 'quadro')
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    if (!nome.trim()) return
    setSalvando(true)
    try {
      await call('kanban_quadro_set', { p_quadro: board.id, p_nome: nome.trim(), p_icone: icone })
      await onFeito()
      onClose()
    } catch (e) {
      avisarErro(e)
      setSalvando(false)
    }
  }
  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Editar quadro</div>
      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Nome</div>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-2 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none" aria-label="Nome do quadro" />
      </div>
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ícone</div>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {Object.entries(ICONES_QUADRO).map(([chave, Ic]) => (
            <button
              key={chave}
              onClick={() => setIcone(chave)}
              aria-label={chave}
              className={cn('grid aspect-square place-items-center rounded-card border tap', icone === chave ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted')}
            >
              <Ic size={20} />
            </button>
          ))}
        </div>
      </div>
      <button onClick={salvar} disabled={salvando || !nome.trim()} className="btn-primary mt-5 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
      </button>
    </Sheet>
  )
}

// ── Checklists prontos (modelos) ─────────────────────────────────────────────
function ModelosSheet({ board, onClose }) {
  const [draft, setDraft] = useState(null)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    call('kanban_modelos_checklist', { p_quadro: board.id })
      .then((d) => setDraft((Array.isArray(d) ? d : []).map((m) => ({ id: m.id, nome: m.nome, itens: (m.itens || []).join('\n') }))))
      .catch(() => setDraft([]))
  }, [board.id])
  function up(i, patch) {
    setDraft((d) => d.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  }
  function add() {
    setDraft((d) => (d.length >= 3 ? d : [...d, { nome: 'Novo checklist', itens: '' }]))
  }
  function remover(i) {
    setDraft((d) => d.filter((_, j) => j !== i))
  }
  async function salvar() {
    setSalvando(true)
    try {
      await call('kanban_modelo_checklist_set', {
        p_quadro: board.id,
        p_modelos: draft.map((m, i) => ({ id: m.id || null, nome: m.nome, itens: m.itens.split('\n').map((t) => t.trim()).filter(Boolean), ordem: i })),
      })
      onClose()
    } catch (e) {
      avisarErro(e)
      setSalvando(false)
    }
  }
  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Checklists prontos</div>
      <div className="mt-1 text-xs text-muted">Até 3 modelos por quadro, um item por linha. Aplique num cartão pelo botão “Usar pronto”.</div>
      {draft == null ? (
        <div className="grid place-items-center py-8 text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-3">
            {draft.map((m, i) => (
              <div key={m.id || `n${i}`} className="rounded-card border border-line bg-surface p-3">
                <div className="hstack gap-2">
                  <input value={m.nome} onChange={(e) => up(i, { nome: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" aria-label="Nome do checklist" />
                  <button onClick={() => remover(i)} aria-label="Remover" className="text-muted-2 tap">
                    <Trash2 size={15} />
                  </button>
                </div>
                <textarea rows={4} value={m.itens} onChange={(e) => up(i, { itens: e.target.value })} placeholder={'Documentos\nExame admissional\nAssinar contrato'} className="mt-2 w-full resize-none rounded-card border border-line bg-bg px-3 py-2 text-sm outline-none placeholder:text-muted-2" />
              </div>
            ))}
          </div>
          {draft.length < 3 && (
            <button onClick={add} className="mt-2 hstack gap-1 rounded-card border border-dashed border-line px-3 py-2 text-xs font-semibold text-muted tap">
              <Plus size={14} /> Adicionar checklist
            </button>
          )}
          <button onClick={salvar} disabled={salvando} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
          </button>
        </>
      )}
    </Sheet>
  )
}

// ── Bottom-sheet genérico ────────────────────────────────────────────────────
// Bottom-sheet no mobile, card centralizado no desktop — mesmo formato de
// abertura do modal do card (largura, cantos, sombra e alça só no mobile).
function Sheet({ children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-bg px-5 pb-8 pt-4 shadow-xl sm:max-w-[580px] sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line sm:hidden" />
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function PilhaAvatares({ membros, size = 20 }) {
  const list = (membros || []).filter(Boolean)
  if (!list.length) return null
  return (
    <span className="hstack">
      {list.slice(0, 3).map((p, i) => (
        <span key={p.matricula} className={cn('rounded-full ring-2 ring-bg', i > 0 && '-ml-1.5')}>
          <Avatar name={p.nome} src={p.avatar} size={size} />
        </span>
      ))}
      {list.length > 3 && (
        <span className="-ml-1.5 grid place-items-center rounded-full bg-fill text-[10px] font-bold text-muted ring-2 ring-bg" style={{ height: size, width: size }}>
          +{list.length - 3}
        </span>
      )}
    </span>
  )
}

export { Quadros }
export default Quadros

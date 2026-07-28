import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
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
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

// ── Painel Kanban (Quadros) — ligado ao backend (schema tata_kanban via RPCs) ──
// Acesso liberado pelo portal de admin (governanca-app-quadros → kanban_pode_criar).
// Membros criam cartões; o resto (editar, mover, arquivar, excluir, gerir quadro)
// é só do admin do quadro (quem criou).

const CORES = ['#2f7d4f', '#d98a2b', '#c2453f', '#3b6fb3', '#7a4fb3', '#0f766e', '#64748b']

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

// ── Entrada / gate ───────────────────────────────────────────────────────────
function Quadros() {
  const { usuario } = useAuth()
  // Aguarda o perfil e a verificação de permissão (podeQuadros: null = verificando).
  if (!usuario || usuario.perfilPendente || usuario.podeQuadros == null) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }
  // Só quem tem permissão (concedida no painel de admin) enxerga os quadros.
  if (!usuario.podeQuadros) return <Navigate to="/" replace />
  return <Painel />
}

// ── Casca: lista de quadros ↔ visão de um quadro ─────────────────────────────
function Painel() {
  const [quadros, setQuadros] = useState(null) // null = carregando
  const [quadroId, setQuadroId] = useState(null)

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

  if (quadroId) {
    return (
      <VisaoQuadro
        quadroId={quadroId}
        onVoltar={() => {
          setQuadroId(null)
          recarregarLista()
        }}
      />
    )
  }

  return <ListaQuadros quadros={quadros} onAbrir={setQuadroId} onMudou={recarregarLista} />
}

// ── Lista de quadros ─────────────────────────────────────────────────────────
function ListaQuadros({ quadros, onAbrir, onMudou }) {
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
      <Header title="Quadros" />
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
            {quadros.map((q) => (
              <button
                key={q.id}
                onClick={() => onAbrir(q.id)}
                className="card hstack gap-3 px-4 py-3.5 text-left tap"
              >
                <div className="grid h-10 w-10 place-items-center rounded-card bg-accent-soft text-accent">
                  <Columns3 size={19} />
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
            ))}
          </div>
        )}

        {quadros != null && (
          <button
            onClick={novoQuadro}
            disabled={!podeMais || criando}
            className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40"
          >
            {criando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Novo quadro
          </button>
        )}
        {quadros != null && !podeMais && (
          <div className="mt-2 text-center text-[11px] text-muted">Limite de 3 quadros por pessoa.</div>
        )}
      </div>
    </>
  )
}

// ── Visão de um quadro ───────────────────────────────────────────────────────
function VisaoQuadro({ quadroId, onVoltar }) {
  const [board, setBoard] = useState(null)
  const [cols, setCols] = useState([])
  const [cardAberto, setCardAberto] = useState(null) // { modo, card?, colunaId? }
  const [sheet, setSheet] = useState(null) // 'membros' | 'etiquetas' | 'colunas' | 'menu'

  const recarregar = useCallback(async () => {
    try {
      const b = await call('kanban_carregar', { p_quadro: quadroId })
      setBoard(b)
    } catch (e) {
      avisarErro(e)
      onVoltar()
    }
  }, [quadroId, onVoltar])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  // Deriva as colunas (com seus cartões) a partir do board bruto.
  useEffect(() => {
    if (!board) return
    const porColuna = (colId) =>
      (board.cards || [])
        .filter((k) => k.coluna_id === colId)
        .sort((a, b) => a.ordem - b.ordem || String(a.created_at).localeCompare(String(b.created_at)))
    setCols((board.colunas || []).map((c) => ({ ...c, cards: porColuna(c.id) })))
  }, [board])

  const admin = !!board?.sou_admin
  const etiquetaPorId = useMemo(() => {
    const m = {}
    for (const e of board?.etiquetas || []) m[e.id] = e
    return m
  }, [board])

  if (!board) {
    return (
      <>
        <Header title="Quadro" />
        <div className="grid place-items-center py-20 text-muted">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Quadros" />

      {/* Barra do quadro */}
      <div className="hstack gap-2 px-5 pt-1">
        <button onClick={onVoltar} aria-label="Voltar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-muted tap">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold leading-tight">{board.nome}</div>
        </div>
        <button
          onClick={() => setSheet('membros')}
          className="hstack shrink-0 gap-1.5 rounded-pill border border-line px-2.5 py-1.5 text-xs font-semibold text-muted tap"
        >
          <PilhaAvatares membros={board.membros} />
          <Users size={14} />
        </button>
        {admin && (
          <button
            onClick={() => setSheet('menu')}
            aria-label="Gerenciar quadro"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-muted tap"
          >
            <Settings2 size={16} />
          </button>
        )}
      </div>

      <Board
        cols={cols}
        setCols={setCols}
        board={board}
        admin={admin}
        etiquetaPorId={etiquetaPorId}
        onAbrirCard={(colunaId, card) =>
          setCardAberto({ modo: admin ? 'editar' : 'ver', card, colunaId })
        }
        onNovoCard={(colunaId) => setCardAberto({ modo: 'criar', colunaId })}
      />

      {cardAberto && (
        <CardModal
          key={cardAberto.card?.id || 'novo'}
          estado={cardAberto}
          board={board}
          admin={admin}
          onClose={() => setCardAberto(null)}
          onFeito={async () => {
            setCardAberto(null)
            await recarregar()
          }}
        />
      )}

      {sheet === 'membros' && (
        <MembrosSheet board={board} admin={admin} onClose={() => setSheet(null)} onFeito={recarregar} />
      )}
      {sheet === 'etiquetas' && <EtiquetasSheet board={board} onClose={() => setSheet(null)} onFeito={recarregar} />}
      {sheet === 'colunas' && <ColunasSheet board={board} onClose={() => setSheet(null)} onFeito={recarregar} />}
      {sheet === 'menu' && (
        <MenuGerenciar
          board={board}
          onClose={() => setSheet(null)}
          onEscolher={(s) => setSheet(s)}
          onArquivou={() => {
            setSheet(null)
            onVoltar()
          }}
        />
      )}
    </>
  )
}

// ── Board com DnD ────────────────────────────────────────────────────────────
function colDoId(cs, id) {
  if (typeof id === 'string' && id.startsWith('col:')) return id.slice(4)
  const c = cs.find((c) => c.cards.some((k) => k.id === id))
  return c?.id ?? null
}

function Board({ cols, setCols, board, admin, etiquetaPorId, onAbrirCard, onNovoCard }) {
  const [ativo, setAtivo] = useState(null)
  // Ref sempre com o estado mais fresco das colunas — evita persistir ordem
  // desatualizada (o setState não reflete no closure dentro do mesmo drag).
  const colsRef = useRef(cols)
  useEffect(() => {
    colsRef.current = cols
  }, [cols])
  function aplicar(next) {
    colsRef.current = next
    setCols(next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
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
      await call('kanban_cards_reordenar', { p_quadro: board.id, p_coluna: colId, p_ids: ids })
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
    // cross-column já foi aplicado no onDragOver; persiste a coluna de destino
    const destCol = cs.find((c) => c.id === para)
    if (destCol) persistDest(para, destCol.cards.map((k) => k.id))
  }

  return (
    <DndContext
      sensors={admin ? sensors : []}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setAtivo(cardById(active.id))}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setAtivo(null)}
    >
      <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-24 no-scrollbar snap-x">
        {cols.map((col) => (
          <Coluna
            key={col.id}
            col={col}
            admin={admin}
            etiquetaPorId={etiquetaPorId}
            onAbrirCard={onAbrirCard}
            onNovoCard={() => onNovoCard(col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {ativo ? <CardChip card={ativo} etiquetaPorId={etiquetaPorId} admin={admin} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Coluna({ col, admin, etiquetaPorId, onAbrirCard, onNovoCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col.id}` })
  return (
    <section className="flex w-[80vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl bg-surface/60 p-2">
      <div className="hstack gap-1 px-1 py-1">
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{col.nome}</span>
        <span className="rounded-pill bg-fill px-1.5 text-[11px] font-semibold text-muted">{col.cards.length}</span>
      </div>

      <div ref={setNodeRef} className={cn('flex min-h-[8px] flex-col gap-2 rounded-xl p-0.5', isOver && 'bg-accent-soft/40')}>
        <SortableContext items={col.cards.map((k) => k.id)} strategy={verticalListSortingStrategy}>
          {col.cards.map((card) => (
            <CardChip
              key={card.id}
              card={card}
              admin={admin}
              etiquetaPorId={etiquetaPorId}
              onOpen={() => onAbrirCard(col.id, card)}
            />
          ))}
        </SortableContext>
      </div>

      <button onClick={onNovoCard} className="mt-1 hstack gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-muted tap">
        <Plus size={14} /> Adicionar cartão
      </button>
    </section>
  )
}

function CardChip({ card, admin, etiquetaPorId, onOpen, overlay }) {
  const sortable = useSortable({ id: card.id, disabled: overlay || !admin })
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable
  const style = overlay ? undefined : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }
  const etqs = (card.etiquetas || []).map((id) => etiquetaPorId[id]).filter(Boolean)
  const resp = card.responsaveis || []
  const vencido = card.data_conclusao && card.data_conclusao < hojeISO()

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn('rounded-xl border border-line bg-surface p-2.5 shadow-sm', overlay && 'rotate-2 shadow-lg ring-1 ring-accent/40')}
    >
      <div className="hstack items-start gap-1.5">
        {admin && (
          <button {...attributes} {...listeners} aria-label="Arrastar" className="mt-0.5 shrink-0 touch-none text-muted-2 tap">
            <GripVertical size={15} />
          </button>
        )}
        <button onClick={onOpen} className="min-w-0 flex-1 text-left tap">
          {etqs.length > 0 && (
            <div className="mb-1.5 hstack flex-wrap gap-1">
              {etqs.map((e) => (
                <span key={e.id} className="h-1.5 w-6 rounded-pill" style={{ backgroundColor: e.cor }} title={e.nome} />
              ))}
            </div>
          )}
          <div className="text-sm font-semibold leading-snug">{card.titulo}</div>
          {(card.data_conclusao || resp.length > 0) && (
            <div className="mt-2 hstack flex-wrap items-center gap-2 text-[11px]">
              {card.data_conclusao && (
                <span
                  className={cn(
                    'hstack gap-1 rounded-pill px-1.5 py-0.5 font-semibold',
                    vencido ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn',
                  )}
                >
                  <CalendarDays size={11} /> {fmtPrazo(card.data_conclusao)}
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

// ── Modal do cartão (criar / editar / ver) ───────────────────────────────────
function CardModal({ estado, board, admin, onClose, onFeito }) {
  const editavel = estado.modo === 'criar' || (estado.modo === 'editar' && admin)
  const card = estado.card || {}
  const [titulo, setTitulo] = useState(card.titulo || '')
  const [descricao, setDescricao] = useState(card.descricao || '')
  const [prazo, setPrazo] = useState(card.data_conclusao || '')
  const [resp, setResp] = useState(() => new Set((card.responsaveis || []).map((r) => r.matricula)))
  const [etqs, setEtqs] = useState(() => new Set(card.etiquetas || []))
  const [salvando, setSalvando] = useState(false)

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
        p_coluna: estado.colunaId,
        p_titulo: titulo.trim(),
        p_descricao: descricao.trim() || null,
        p_data_conclusao: prazo || null,
        p_responsaveis: Array.from(resp),
        p_etiquetas: Array.from(etqs),
      }
      if (estado.modo === 'editar' && card.id) args.p_id = card.id
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

  return (
    <Sheet onClose={onClose}>
      {editavel ? (
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título do cartão"
          className="w-full bg-transparent pr-8 font-display text-lg font-bold outline-none placeholder:text-muted-2"
          aria-label="Título do cartão"
        />
      ) : (
        <div className="pr-8 font-display text-lg font-bold">{card.titulo}</div>
      )}

      {/* Etiquetas */}
      {board.etiquetas.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Etiquetas</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {board.etiquetas.map((e) => {
              const on = etqs.has(e.id)
              return (
                <button
                  key={e.id}
                  disabled={!editavel}
                  onClick={() => toggle(setEtqs, e.id)}
                  className={cn(
                    'hstack gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold tap',
                    on ? 'text-white' : 'border-line text-muted',
                    !editavel && 'opacity-90',
                  )}
                  style={on ? { backgroundColor: e.cor, borderColor: e.cor } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? '#fff' : e.cor }} />
                  {e.nome}
                  {on && <Check size={12} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Responsáveis */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Responsáveis</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {board.membros.map((p) => {
            const on = resp.has(p.matricula)
            return (
              <button
                key={p.matricula}
                disabled={!editavel}
                onClick={() => toggle(setResp, p.matricula)}
                className={cn(
                  'hstack gap-1.5 rounded-pill border px-2 py-1 text-xs font-semibold tap',
                  on ? 'border-accent bg-accent-soft text-carbon dark:text-accent' : 'border-line text-muted',
                )}
              >
                <Avatar name={p.nome} size={18} />
                {(p.nome || '').split(' ')[0]}
                {on && <Check size={13} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prazo */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Prazo de conclusão</div>
        {editavel ? (
          <input
            type="date"
            value={prazo || ''}
            onChange={(e) => setPrazo(e.target.value)}
            className="mt-2 rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none"
          />
        ) : (
          <div className="mt-2 text-sm">{prazo ? fmtPrazo(prazo) : '—'}</div>
        )}
      </div>

      {/* Descrição */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Descrição</div>
        {editavel ? (
          <textarea
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhe a tarefa…"
            className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-2"
          />
        ) : (
          <div className="mt-2 whitespace-pre-wrap text-sm text-muted">{card.descricao || '—'}</div>
        )}
      </div>

      {editavel && (
        <button
          onClick={salvar}
          disabled={salvando || !titulo.trim()}
          className="btn-primary mt-6 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {estado.modo === 'criar' ? 'Criar cartão' : 'Salvar'}
        </button>
      )}

      {estado.modo === 'editar' && admin && card.id && (
        <div className="mt-2 hstack gap-2">
          <button
            onClick={() => acaoCard('kanban_card_arquivar', { p_id: card.id, p_arquivar: true })}
            disabled={salvando}
            className="hstack flex-1 justify-center gap-2 rounded-card bg-surface p-3 text-sm font-semibold text-muted tap disabled:opacity-40"
          >
            <Archive size={16} /> Arquivar
          </button>
          <button
            onClick={() => {
              if (window.confirm('Excluir este cartão? Esta ação não pode ser desfeita.')) {
                acaoCard('kanban_card_excluir', { p_id: card.id })
              }
            }}
            disabled={salvando}
            className="hstack flex-1 justify-center gap-2 rounded-card bg-surface p-3 text-sm font-semibold text-danger tap disabled:opacity-40"
          >
            <Trash2 size={16} /> Excluir
          </button>
        </div>
      )}
    </Sheet>
  )
}

// ── Menu de gerenciamento (admin) ────────────────────────────────────────────
function MenuGerenciar({ board, onClose, onEscolher, onArquivou }) {
  const [busy, setBusy] = useState(false)
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
  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Gerenciar quadro</div>
      <div className="mt-3 flex flex-col gap-2">
        <button className={item} onClick={() => onEscolher('membros')}>
          <Users size={17} className="text-accent" /> Membros
        </button>
        <button className={item} onClick={() => onEscolher('etiquetas')}>
          <Tag size={17} className="text-accent" /> Etiquetas
        </button>
        <button className={item} onClick={() => onEscolher('colunas')}>
          <Columns3 size={17} className="text-accent" /> Colunas
        </button>
        <button onClick={arquivarQuadro} disabled={busy} className={cn(item, 'text-danger disabled:opacity-40')}>
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Archive size={17} />} Arquivar quadro
        </button>
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
  function toggle(mat, nome) {
    if (adminMats.includes(mat)) return
    setNomes((n) => ({ ...n, [mat]: nome || n[mat] }))
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

      {/* Selecionados */}
      <div className="mt-3 flex flex-col gap-1.5">
        {(board.membros || [])
          .filter((m) => m.papel === 'admin')
          .map((m) => (
            <div key={m.matricula} className="hstack gap-3 rounded-card border border-line px-3 py-2">
              <Avatar name={m.nome} size={30} />
              <span className="flex-1 text-sm font-semibold">{m.nome}</span>
              <span className="text-[11px] font-semibold text-accent">admin</span>
            </div>
          ))}
        {selecionados.map((mat) => (
          <div key={mat} className="hstack gap-3 rounded-card border border-accent bg-accent-soft px-3 py-2">
            <Avatar name={nomes[mat] || mat} size={30} />
            <span className="flex-1 text-sm font-semibold">{nomes[mat] || `Matrícula ${mat}`}</span>
            {admin && (
              <button onClick={() => toggle(mat)} aria-label="Remover" className="text-muted-2 tap">
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
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar pessoa pelo nome…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2"
            />
            {buscando && <Loader2 size={14} className="animate-spin text-muted-2" />}
          </div>
          <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
            {res
              .filter((p) => !adminMats.includes(p.matricula) && !sel.has(p.matricula))
              .map((p) => (
                <button
                  key={p.matricula}
                  onClick={() => toggle(p.matricula, p.nome)}
                  className="hstack gap-3 rounded-card px-3 py-2 text-left tap hover:bg-surface"
                >
                  <Avatar name={p.nome} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.nome}</span>
                    {p.cargo && <span className="block truncate text-[11px] text-muted">{p.cargo}</span>}
                  </span>
                  <Plus size={16} className="text-muted-2" />
                </button>
              ))}
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40"
          >
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
      await call('kanban_etiquetas_set', {
        p_quadro: board.id,
        p_etiquetas: draft.map((e, i) => ({ id: e.id || null, nome: e.nome, cor: e.cor, ordem: i })),
      })
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
            <input
              value={e.nome}
              onChange={(ev) => up(i, { nome: ev.target.value })}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
              aria-label="Nome da etiqueta"
            />
            <div className="hstack gap-1">
              {CORES.map((c) => (
                <button
                  key={c}
                  onClick={() => up(i, { cor: c })}
                  aria-label={`Cor ${c}`}
                  className={cn('h-5 w-5 rounded-full tap', e.cor === c && 'ring-2 ring-offset-1 ring-carbon')}
                  style={{ backgroundColor: c }}
                />
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
function ColunasSheet({ board, onClose, onFeito }) {
  const [draft, setDraft] = useState(() => (board.colunas || []).map((c) => ({ id: c.id, nome: c.nome })))
  const [salvando, setSalvando] = useState(false)

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
      await call('kanban_colunas_set', {
        p_quadro: board.id,
        p_colunas: draft.map((c, i) => ({ id: c.id || null, nome: c.nome, ordem: i })),
      })
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
      <div className="mt-1 text-xs text-muted">Até 5 colunas. Remova só colunas vazias.</div>

      <div className="mt-3 flex flex-col gap-2">
        {draft.map((c, i) => (
          <div key={c.id || `n${i}`} className="hstack gap-2 rounded-card border border-line bg-surface px-2.5 py-2">
            <Columns3 size={15} className="shrink-0 text-muted-2" />
            <input
              value={c.nome}
              onChange={(ev) => up(i, ev.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
              aria-label="Nome da coluna"
            />
            {draft.length > 1 && (
              <button onClick={() => remover(i)} aria-label="Remover coluna" className="shrink-0 text-muted-2 tap">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {draft.length < 5 && (
        <button onClick={add} className="mt-2 hstack gap-1 rounded-card border border-dashed border-line px-3 py-2 text-xs font-semibold text-muted tap">
          <Plus size={14} /> Adicionar coluna
        </button>
      )}

      <button onClick={salvar} disabled={salvando} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-40">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar colunas
      </button>
    </Sheet>
  )
}

// ── Bottom-sheet genérico ────────────────────────────────────────────────────
function Sheet({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-line bg-bg px-5 pb-8 pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-line" />
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

function PilhaAvatares({ membros, size = 20 }) {
  const list = (membros || []).filter(Boolean)
  if (!list.length) return null
  return (
    <span className="hstack">
      {list.slice(0, 3).map((p, i) => (
        <span key={p.matricula} className={cn('rounded-full ring-2 ring-bg', i > 0 && '-ml-1.5')}>
          <Avatar name={p.nome} size={size} />
        </span>
      ))}
      {list.length > 3 && (
        <span
          className="-ml-1.5 grid place-items-center rounded-full bg-fill text-[10px] font-bold text-muted ring-2 ring-bg"
          style={{ height: size, width: size }}
        >
          +{list.length - 3}
        </span>
      )}
    </span>
  )
}

export { Quadros }
export default Quadros

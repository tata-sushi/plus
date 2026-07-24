import { useEffect, useRef, useState } from 'react'
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
  MessageSquare,
  Paperclip,
  CalendarDays,
  Users,
  Check,
  GripVertical,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext.jsx'

// ── Esboço do painel Kanban (mini-Trello) — SÓ PRO VICTOR VER ─────────────
// Front-end puro: dados de exemplo, sem backend, salvos no localStorage do
// aparelho. Serve pra sentir na mão (arrastar, card, responsáveis, comentários,
// anexos, criar quadros) antes de a gente construir de verdade.

const EMAIL_DONO = 'victor.carvalho@tatasushi.com.br'
const MAT_DONO = '7'
const STORE = 'tata_kanban_esboco_v1'

const uid = () => (globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`)

// Equipe de exemplo (mock) para responsáveis / membros do quadro.
const EQUIPE = [
  { id: '7', nome: 'Victor Carvalho' },
  { id: 'a', nome: 'Cinthia Moreno' },
  { id: 'b', nome: 'Tito Capobianco' },
  { id: 'c', nome: 'Fábio Shiguematsu' },
  { id: 'd', nome: 'Ana Souza' },
  { id: 'e', nome: 'Bruno Lima' },
]
const pessoa = (id) => EQUIPE.find((p) => p.id === id)

function seed() {
  return [
    {
      id: uid(),
      nome: 'Operação — Itaim',
      emoji: '🍣',
      membros: ['7', 'a', 'b'],
      colunas: [
        {
          id: uid(),
          nome: 'A fazer',
          cards: [
            { id: uid(), titulo: 'Revisar cardápio da semana', descricao: '', resp: ['7'], comentarios: [], anexos: [], prazo: '' },
            {
              id: uid(),
              titulo: 'Pedido de hashi (reposição)',
              descricao: 'Cotar com 2 fornecedores.',
              resp: ['a'],
              comentarios: [{ id: uid(), autor: 'Cinthia Moreno', texto: 'Já pedi cotação, chega amanhã.' }],
              anexos: [],
              prazo: '',
            },
          ],
        },
        {
          id: uid(),
          nome: 'Fazendo',
          cards: [
            { id: uid(), titulo: 'Treinar equipe no app', descricao: '', resp: ['b', 'c'], comentarios: [], anexos: [{ id: uid(), nome: 'roteiro.pdf' }], prazo: '' },
          ],
        },
        {
          id: uid(),
          nome: 'Feito',
          cards: [{ id: uid(), titulo: 'Trocar banner da Início', descricao: '', resp: ['7'], comentarios: [], anexos: [], prazo: '' }],
        },
      ],
    },
  ]
}

function carregar() {
  try {
    const raw = localStorage.getItem(STORE)
    if (raw) {
      const v = JSON.parse(raw)
      if (Array.isArray(v) && v.length) return v
    }
  } catch {
    /* ignora */
  }
  return seed()
}

// ── Componente principal ──────────────────────────────────────────────────
function QuadrosEsboco() {
  const { usuario, session } = useAuth()
  const dono = usuario?.matricula === MAT_DONO || (session?.user?.email || '').toLowerCase() === EMAIL_DONO
  if (usuario && !dono) return <Navigate to="/" replace />

  return <Painel />
}

function Painel() {
  const [boards, setBoards] = useState(carregar)
  const [boardId, setBoardId] = useState(() => boards[0]?.id)
  const [cardAberto, setCardAberto] = useState(null) // { colId, cardId }
  const [membrosAberto, setMembrosAberto] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(boards))
    } catch {
      /* ignora (cota) */
    }
  }, [boards])

  const board = boards.find((b) => b.id === boardId) || boards[0]

  // Helpers de mutação ------------------------------------------------------
  const patchBoard = (fn) => setBoards((bs) => bs.map((b) => (b.id === board.id ? fn(b) : b)))
  const patchColunas = (fn) => patchBoard((b) => ({ ...b, colunas: fn(b.colunas) }))
  const patchCard = (colId, cardId, fn) =>
    patchColunas((cols) =>
      cols.map((c) => (c.id === colId ? { ...c, cards: c.cards.map((k) => (k.id === cardId ? fn(k) : k)) } : c)),
    )

  function novoQuadro() {
    const nb = {
      id: uid(),
      nome: 'Novo quadro',
      emoji: '📋',
      membros: ['7'],
      colunas: [
        { id: uid(), nome: 'A fazer', cards: [] },
        { id: uid(), nome: 'Fazendo', cards: [] },
        { id: uid(), nome: 'Feito', cards: [] },
      ],
    }
    setBoards((bs) => [...bs, nb])
    setBoardId(nb.id)
  }

  const cardAtual =
    cardAberto && board.colunas.find((c) => c.id === cardAberto.colId)?.cards.find((k) => k.id === cardAberto.cardId)

  return (
    <>
      <Header title="Quadros" />
      <Voltar />

      <div className="px-5 pt-1">
        <div className="rounded-card border border-dashed border-accent/40 bg-accent-soft/40 px-3 py-2 text-[11px] text-muted">
          <span className="font-semibold text-carbon dark:text-accent">Esboço</span> — só você vê isto. É um
          rascunho pra sentir na mão; os dados ficam salvos só neste aparelho.
        </div>
      </div>

      {/* Seletor de quadros */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar px-5">
        {boards.map((b) => (
          <button
            key={b.id}
            onClick={() => setBoardId(b.id)}
            className={cn(
              'shrink-0 rounded-pill border px-3 py-1.5 text-xs font-semibold tap',
              b.id === board.id ? 'border-accent bg-accent-soft text-carbon dark:text-accent' : 'border-line text-muted',
            )}
          >
            <span className="mr-1">{b.emoji}</span>
            {b.nome}
          </button>
        ))}
        <button
          onClick={novoQuadro}
          className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-xs font-semibold text-muted tap"
        >
          <Plus size={13} className="mr-0.5 inline" />
          Novo quadro
        </button>
      </div>

      {/* Cabeçalho do quadro: nome editável + membros */}
      <div className="mt-3 flex items-center gap-2 px-5">
        <input
          value={board.nome}
          onChange={(e) => patchBoard((b) => ({ ...b, nome: e.target.value }))}
          className="min-w-0 flex-1 bg-transparent font-display text-lg font-bold outline-none"
          aria-label="Nome do quadro"
        />
        <button
          onClick={() => setMembrosAberto(true)}
          className="hstack shrink-0 gap-1.5 rounded-pill border border-line px-2.5 py-1.5 text-xs font-semibold text-muted tap"
        >
          <PilhaAvatares ids={board.membros} />
          <Users size={14} />
        </button>
      </div>

      {/* Board */}
      <QuadroBoard
        board={board}
        patchColunas={patchColunas}
        onAbrirCard={(colId, cardId) => setCardAberto({ colId, cardId })}
      />

      {cardAtual && (
        <CardModal
          card={cardAtual}
          membros={board.membros}
          onClose={() => setCardAberto(null)}
          onPatch={(fn) => patchCard(cardAberto.colId, cardAberto.cardId, fn)}
          onExcluir={() => {
            patchColunas((cols) =>
              cols.map((c) => (c.id === cardAberto.colId ? { ...c, cards: c.cards.filter((k) => k.id !== cardAberto.cardId) } : c)),
            )
            setCardAberto(null)
          }}
        />
      )}

      {membrosAberto && (
        <MembrosSheet
          selecionados={board.membros}
          onToggle={(pid) =>
            patchBoard((b) => ({
              ...b,
              membros: b.membros.includes(pid) ? b.membros.filter((x) => x !== pid) : [...b.membros, pid],
            }))
          }
          onClose={() => setMembrosAberto(false)}
        />
      )}
    </>
  )
}

// ── Board com DnD (colunas + cards arrastáveis) ────────────────────────────
function QuadroBoard({ board, patchColunas, onAbrirCard }) {
  const [ativo, setAtivo] = useState(null) // card sendo arrastado (overlay)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const colunas = board.colunas

  const colDoId = (id) => {
    if (typeof id === 'string' && id.startsWith('col:')) return id.slice(4)
    const c = colunas.find((c) => c.cards.some((k) => k.id === id))
    return c?.id ?? null
  }
  const cardById = (id) => {
    for (const c of colunas) {
      const k = c.cards.find((k) => k.id === id)
      if (k) return k
    }
    return null
  }

  function onDragOver({ active, over }) {
    if (!over) return
    const de = colDoId(active.id)
    const para = colDoId(over.id)
    if (!de || !para || de === para) return
    patchColunas((cols) => {
      const origem = cols.find((c) => c.id === de)
      const card = origem.cards.find((k) => k.id === active.id)
      if (!card) return cols
      let idx = cols.find((c) => c.id === para).cards.findIndex((k) => k.id === over.id)
      if (String(over.id).startsWith('col:') || idx < 0) idx = cols.find((c) => c.id === para).cards.length
      return cols.map((c) => {
        if (c.id === de) return { ...c, cards: c.cards.filter((k) => k.id !== active.id) }
        if (c.id === para) {
          const nc = [...c.cards]
          nc.splice(idx, 0, card)
          return { ...c, cards: nc }
        }
        return c
      })
    })
  }

  function onDragEnd({ active, over }) {
    setAtivo(null)
    if (!over) return
    const de = colDoId(active.id)
    const para = colDoId(over.id)
    if (!de || !para || de !== para) return
    patchColunas((cols) =>
      cols.map((c) => {
        if (c.id !== de) return c
        const oi = c.cards.findIndex((k) => k.id === active.id)
        let ni = c.cards.findIndex((k) => k.id === over.id)
        if (String(over.id).startsWith('col:') || ni < 0) ni = c.cards.length - 1
        return { ...c, cards: arrayMove(c.cards, oi, ni) }
      }),
    )
  }

  function addColuna() {
    patchColunas((cols) => [...cols, { id: uid(), nome: 'Nova lista', cards: [] }])
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setAtivo(cardById(active.id))}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setAtivo(null)}
    >
      <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-24 no-scrollbar snap-x">
        {colunas.map((col) => (
          <Coluna
            key={col.id}
            col={col}
            onAbrirCard={onAbrirCard}
            onRenomear={(nome) => patchColunas((cols) => cols.map((c) => (c.id === col.id ? { ...c, nome } : c)))}
            onExcluir={() => patchColunas((cols) => cols.filter((c) => c.id !== col.id))}
            onAddCard={(titulo) =>
              patchColunas((cols) =>
                cols.map((c) =>
                  c.id === col.id
                    ? { ...c, cards: [...c.cards, { id: uid(), titulo, descricao: '', resp: [], comentarios: [], anexos: [], prazo: '' }] }
                    : c,
                ),
              )
            }
          />
        ))}
        <button
          onClick={addColuna}
          className="grid h-11 w-[64vw] max-w-[240px] shrink-0 snap-start place-items-center rounded-2xl border border-dashed border-line text-sm font-semibold text-muted tap"
        >
          <span className="hstack gap-1">
            <Plus size={16} /> Adicionar lista
          </span>
        </button>
      </div>

      <DragOverlay>{ativo ? <CardChip card={ativo} overlay /> : null}</DragOverlay>
    </DndContext>
  )
}

function Coluna({ col, onAbrirCard, onRenomear, onExcluir, onAddCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col.id}` })
  const [addTexto, setAddTexto] = useState(null) // null = fechado; string = digitando

  function confirmarAdd() {
    const t = (addTexto || '').trim()
    if (t) onAddCard(t)
    setAddTexto('')
  }

  return (
    <section className="flex w-[80vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl bg-surface/60 p-2">
      <div className="hstack gap-1 px-1 py-1">
        <input
          value={col.nome}
          onChange={(e) => onRenomear(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
          aria-label="Nome da lista"
        />
        <span className="rounded-pill bg-fill px-1.5 text-[11px] font-semibold text-muted">{col.cards.length}</span>
        <button onClick={onExcluir} aria-label="Excluir lista" className="grid h-6 w-6 place-items-center text-muted-2 tap">
          <Trash2 size={13} />
        </button>
      </div>

      <div ref={setNodeRef} className={cn('flex min-h-[8px] flex-col gap-2 rounded-xl p-0.5', isOver && 'bg-accent-soft/40')}>
        <SortableContext items={col.cards.map((k) => k.id)} strategy={verticalListSortingStrategy}>
          {col.cards.map((card) => (
            <CardChip key={card.id} card={card} onOpen={() => onAbrirCard(col.id, card.id)} />
          ))}
        </SortableContext>
      </div>

      {addTexto == null ? (
        <button onClick={() => setAddTexto('')} className="mt-1 hstack gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-muted tap">
          <Plus size={14} /> Adicionar cartão
        </button>
      ) : (
        <div className="mt-1">
          <textarea
            autoFocus
            rows={2}
            value={addTexto}
            onChange={(e) => setAddTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                confirmarAdd()
              }
            }}
            placeholder="Título do cartão…"
            className="w-full resize-none rounded-lg border border-line bg-surface px-2.5 py-2 text-sm outline-none placeholder:text-muted-2"
          />
          <div className="mt-1 hstack gap-2">
            <button onClick={confirmarAdd} className="btn-primary px-3 py-1.5 text-xs">
              Adicionar
            </button>
            <button onClick={() => setAddTexto(null)} className="text-muted tap" aria-label="Cancelar">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// Card arrastável (e clicável pra abrir). Em overlay, sem sortable.
function CardChip({ card, onOpen, overlay }) {
  const sortable = useSortable({ id: card.id, disabled: overlay })
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable
  const style = overlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }
  const nComent = card.comentarios?.length || 0
  const nAnexo = card.anexos?.length || 0
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border border-line bg-surface p-2.5 shadow-sm',
        overlay && 'rotate-2 shadow-lg ring-1 ring-accent/40',
      )}
    >
      <div className="hstack items-start gap-1.5">
        <button
          {...attributes}
          {...listeners}
          aria-label="Arrastar"
          className="mt-0.5 shrink-0 touch-none text-muted-2 tap"
        >
          <GripVertical size={15} />
        </button>
        <button onClick={onOpen} className="min-w-0 flex-1 text-left tap">
          <div className="text-sm font-semibold leading-snug">{card.titulo}</div>
          {(card.prazo || nComent > 0 || nAnexo > 0 || (card.resp?.length ?? 0) > 0) && (
            <div className="mt-2 hstack flex-wrap gap-2 text-[11px] text-muted">
              {card.prazo && (
                <span className="hstack gap-1">
                  <CalendarDays size={12} /> {fmtPrazo(card.prazo)}
                </span>
              )}
              {nComent > 0 && (
                <span className="hstack gap-1">
                  <MessageSquare size={12} /> {nComent}
                </span>
              )}
              {nAnexo > 0 && (
                <span className="hstack gap-1">
                  <Paperclip size={12} /> {nAnexo}
                </span>
              )}
              <span className="ml-auto">
                <PilhaAvatares ids={card.resp} size={22} />
              </span>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Modal do card ──────────────────────────────────────────────────────────
function CardModal({ card, membros, onClose, onPatch, onExcluir }) {
  const [coment, setComent] = useState('')
  const fileRef = useRef(null)

  function addComentario() {
    const t = coment.trim()
    if (!t) return
    onPatch((k) => ({ ...k, comentarios: [...k.comentarios, { id: uid(), autor: 'Victor Carvalho', texto: t }] }))
    setComent('')
  }
  function addAnexo(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    onPatch((k) => ({ ...k, anexos: [...k.anexos, { id: uid(), nome: f.name }] }))
  }
  function toggleResp(pid) {
    onPatch((k) => ({ ...k, resp: k.resp.includes(pid) ? k.resp.filter((x) => x !== pid) : [...k.resp, pid] }))
  }

  const time = membros.length ? EQUIPE.filter((p) => membros.includes(p.id)) : EQUIPE

  return (
    <Sheet onClose={onClose}>
      <input
        value={card.titulo}
        onChange={(e) => onPatch((k) => ({ ...k, titulo: e.target.value }))}
        className="w-full bg-transparent pr-8 font-display text-lg font-bold outline-none"
        aria-label="Título do cartão"
      />

      {/* Responsáveis */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Responsáveis</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {time.map((p) => {
            const on = card.resp.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggleResp(p.id)}
                className={cn(
                  'hstack gap-1.5 rounded-pill border px-2 py-1 text-xs font-semibold tap',
                  on ? 'border-accent bg-accent-soft text-carbon dark:text-accent' : 'border-line text-muted',
                )}
              >
                <Avatar name={p.nome} size={18} />
                {p.nome.split(' ')[0]}
                {on && <Check size={13} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prazo */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Prazo</div>
        <input
          type="date"
          value={card.prazo || ''}
          onChange={(e) => onPatch((k) => ({ ...k, prazo: e.target.value }))}
          className="mt-2 rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none"
        />
      </div>

      {/* Descrição */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Descrição</div>
        <textarea
          rows={3}
          value={card.descricao}
          onChange={(e) => onPatch((k) => ({ ...k, descricao: e.target.value }))}
          placeholder="Detalhe a tarefa…"
          className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-2"
        />
      </div>

      {/* Anexos */}
      <div className="mt-4">
        <div className="hstack justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Anexos</div>
          <button onClick={() => fileRef.current?.click()} className="hstack gap-1 text-xs font-semibold text-accent tap">
            <Paperclip size={13} /> Anexar
          </button>
          <input ref={fileRef} type="file" onChange={addAnexo} className="hidden" />
        </div>
        {card.anexos.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {card.anexos.map((a) => (
              <div key={a.id} className="hstack gap-2 rounded-card border border-line bg-surface px-2.5 py-1.5 text-xs">
                <Paperclip size={13} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                <button
                  onClick={() => onPatch((k) => ({ ...k, anexos: k.anexos.filter((x) => x.id !== a.id) }))}
                  aria-label="Remover anexo"
                  className="text-muted-2 tap"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comentários */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Comentários</div>
        <div className="mt-2 flex flex-col gap-2">
          {card.comentarios.map((c) => (
            <div key={c.id} className="hstack items-start gap-2">
              <Avatar name={c.autor} size={24} />
              <div className="min-w-0 flex-1 rounded-card bg-surface px-3 py-2">
                <div className="text-[11px] font-semibold text-muted">{c.autor}</div>
                <div className="text-sm">{c.texto}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 hstack gap-2">
          <input
            value={coment}
            onChange={(e) => setComent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addComentario()}
            placeholder="Escreva um comentário…"
            className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-2"
          />
          <button onClick={addComentario} disabled={!coment.trim()} className="btn-primary px-3 py-2 text-xs disabled:opacity-40">
            Enviar
          </button>
        </div>
      </div>

      <button onClick={onExcluir} className="mt-6 hstack w-full justify-center gap-2 rounded-card bg-surface p-3 text-sm font-semibold text-danger tap">
        <Trash2 size={16} /> Excluir cartão
      </button>
    </Sheet>
  )
}

function MembrosSheet({ selecionados, onToggle, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <div className="font-display text-lg font-bold">Membros do quadro</div>
      <div className="mt-1 text-xs text-muted">Quem participa deste quadro (esboço).</div>
      <div className="mt-3 flex flex-col gap-1.5">
        {EQUIPE.map((p) => {
          const on = selecionados.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={cn(
                'hstack gap-3 rounded-card border px-3 py-2 tap',
                on ? 'border-accent bg-accent-soft' : 'border-line',
              )}
            >
              <Avatar name={p.nome} size={30} />
              <span className="flex-1 text-left text-sm font-semibold">{p.nome}</span>
              {on ? <Check size={18} className="text-accent" /> : <Plus size={18} className="text-muted-2" />}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

// ── Bottom-sheet genérico ───────────────────────────────────────────────────
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

// ── Auxiliares visuais ──────────────────────────────────────────────────────
function PilhaAvatares({ ids, size = 20 }) {
  const list = (ids || []).map(pessoa).filter(Boolean)
  if (!list.length) return null
  return (
    <span className="hstack">
      {list.slice(0, 3).map((p, i) => (
        <span key={p.id} className={cn('rounded-full ring-2 ring-bg', i > 0 && '-ml-1.5')}>
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

function fmtPrazo(iso) {
  const p = String(iso).split('-')
  if (p.length !== 3) return iso
  return `${p[2]}/${p[1]}`
}

export { QuadrosEsboco }
export default QuadrosEsboco

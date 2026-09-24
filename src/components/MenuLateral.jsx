import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  X,
  LogOut,
  ChevronRight,
  Home,
  Newspaper,
  Trophy,
  KanbanSquare,
  CircleAlert,
  ShieldCheck,
  Ear,
  UserRound,
  Search,
  Megaphone,
  ShoppingBag,
  HeartHandshake,
  UtensilsCrossed,
  CalendarClock,
  Lightbulb,
  FileSignature,
  ReceiptText,
  Network,
  QrCode,
  Puzzle,
  Pin,
  Wrench,
} from 'lucide-react'
import { Avatar } from './Avatar.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// Menu de navegação lateral (drawer) — desliza da esquerda com um fundo escuro.
// Reúne as telas principais + as do "Mais" respeitando os mesmos acessos.
// É montado no rodapé (portal) e controlado por `aberto`/`onClose` de fora.
export function MenuLateral({ aberto, onClose }) {
  const { usuario, signOut } = useAuth()
  const navigate = useNavigate()
  // render = está no DOM (segura durante a animação de saída); show = estado visível
  const [render, setRender] = useState(aberto)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (aberto) {
      setRender(true)
      const r = requestAnimationFrame(() => setShow(true))
      return () => cancelAnimationFrame(r)
    }
    setShow(false)
    const t = setTimeout(() => setRender(false), 300)
    return () => clearTimeout(t)
  }, [aberto])

  // Trava a rolagem do fundo enquanto o menu está aberto.
  useEffect(() => {
    if (!render) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [render])

  // Esc fecha (útil no desktop).
  useEffect(() => {
    if (!render) return
    const aoTeclar = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [render, onClose])

  if (!render) return null

  const nome = usuario?.nome || 'Colaborador'
  const cargo = usuario?.cargo || ''
  const loja = usuario?.loja || ''

  // Slots que revezam igual à barra de baixo.
  const slotRanking = usuario?.podeQuadros
    ? { to: '/quadros', label: 'Kanban', icon: KanbanSquare }
    : (usuario?.pendencias ?? 0) > 0
      ? { to: '/pendencias', label: 'Pendências', icon: CircleAlert }
      : { to: '/ranking', label: 'Ranking', icon: Trophy }
  const slotCanal = usuario?.governanca?.tem
    ? { to: '/governanca', label: 'Governança', icon: ShieldCheck }
    : { to: '/ouvidoria', label: 'Ouvidoria', icon: Ear }

  const principal = [
    { to: '/', label: 'Início', icon: Home, end: true },
    { to: '/comunidade', label: 'Feed', icon: Newspaper },
    slotRanking,
    slotCanal,
  ]

  const navegacao = [
    { to: '/buscar', label: 'Buscar colaborador', icon: Search },
    { to: '/comunicados', label: 'Comunicados', icon: Megaphone },
    usuario?.podeLojinha && { to: '/lojinha', label: 'Lojinha', icon: ShoppingBag },
    { to: '/minha-experiencia', label: 'Avaliações e Reconhecimentos', icon: HeartHandshake },
    { to: '/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
    usuario?.podeEscala && { to: '/escala', label: 'Agenda', icon: CalendarClock },
    usuario?.podeBrainstorm && { to: '/brainstorm', label: 'Brainstorm', icon: Lightbulb },
    { to: '/documentos', label: 'Documentos', icon: FileSignature },
    { to: '/holerites', label: 'Holerite', icon: ReceiptText },
    { to: '/organograma-aneis', label: 'Organograma', icon: Network },
    usuario?.podeCheckin && { to: '/check-in', label: 'Check-in', icon: QrCode },
    { to: '/passatempos', label: 'Passatempos', icon: Puzzle },
    usuario?.governanca?.tem && { to: '/atalhos-governanca', label: 'Atalhos', icon: Pin },
  ].filter(Boolean)

  const conta = [
    { to: '/manutencao', label: 'Painel de Ajustes', icon: Wrench },
    usuario?.podePublicar && { to: '/admin', label: 'Painel de administração', icon: ShieldCheck },
  ].filter(Boolean)

  const aoTocar = () => {
    tapHaptic()
    onClose()
  }

  async function sair() {
    tapHaptic()
    onClose()
    await signOut()
    navigate('/login', { replace: true })
  }

  const linkCls = ({ isActive }) =>
    cn(
      'hstack gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold tap',
      isActive ? 'bg-accent-soft text-accent' : 'text-text active:bg-surface-2',
    )

  const renderItem = (i) => {
    const Icon = i.icon
    return (
      <NavLink key={i.to} to={i.to} end={i.end} onClick={aoTocar} className={linkCls}>
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                isActive ? 'bg-accent text-black' : 'bg-surface-2 text-carbon',
              )}
            >
              <Icon size={18} />
            </span>
            <span className="flex-1">{i.label}</span>
          </>
        )}
      </NavLink>
    )
  }

  const Secao = ({ titulo, itens }) => (
    <div className="mb-1.5">
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-muted-2">
        {titulo}
      </div>
      <div className="flex flex-col gap-0.5">{itens.map(renderItem)}</div>
    </div>
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
        className={cn(
          'absolute left-0 top-0 flex h-full w-[84vw] max-w-[320px] flex-col bg-bg shadow-2xl transition-transform duration-300 ease-out',
          show ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-label="Menu de navegação"
      >
        {/* Topo: identificação */}
        <div className="safe-top border-b border-line px-4 pb-4 pt-3">
          <div className="hstack justify-between">
            <span className="font-display text-base font-bold">Menu</span>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-carbon tap"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <NavLink
            to="/carteira"
            onClick={aoTocar}
            className="mt-3 hstack gap-3 rounded-2xl bg-surface-2 p-3 tap"
          >
            <Avatar name={nome} src={usuario?.avatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{nome}</div>
              <div className="truncate text-xs text-muted">
                {cargo}
                {loja ? ` · ${loja}` : ''}
              </div>
            </div>
            <ChevronRight size={16} className="shrink-0 text-muted-2" />
          </NavLink>
        </div>

        {/* Corpo: navegação */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <Secao titulo="Principal" itens={principal} />
          <Secao titulo="Navegação" itens={navegacao} />
          <Secao titulo="Conta" itens={conta} />
        </div>

        {/* Rodapé: sair */}
        <div className="safe-bottom border-t border-line p-3">
          <button
            onClick={sair}
            className="hstack w-full justify-center gap-2 rounded-xl bg-surface-2 py-3 text-sm font-semibold text-danger tap"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

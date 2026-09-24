import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import {
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  ShieldCheck,
  BookOpen,
  Landmark,
  Network,
  LayoutDashboard,
  Plug,
  Wrench,
  Smartphone,
  Folder,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// Ícone por seção da Governança de Processos (o resto cai no Folder).
const ICONE_SECAO = {
  'Governança de Processos': ShieldCheck,
  'Conceitos & Informações': BookOpen,
  Institucional: Landmark,
  'Áreas & Cargos': Network,
  Dashboards: LayoutDashboard,
  'Parceiros & Sistemas': Plug,
  Admin: Wrench,
  App: Smartphone,
}

// Destino de cada página: as do portal abrem no visualizador in-app (/painel/:id);
// as marcadas como app:// apontam pra uma rota do próprio app.
function alvo(p) {
  if (p.url?.startsWith('app://')) return '/' + p.url.slice('app://'.length)
  return `/painel/${p.pagina_id}`
}

// Agrupa a lista achatada (secao/sub/ordem) numa árvore ordenada:
// secao → { páginas sem sub } + { subgrupos → páginas }. A lista já vem
// ordenada por `ordem`, então basta preservar a ordem de inserção.
function agrupar(paginas) {
  const map = new Map() // secao -> { ordem, semSub[], subs: Map(sub -> {ordem, itens[]}) }
  for (const p of paginas || []) {
    const s = p.secao || 'Outros'
    if (!map.has(s)) map.set(s, { ordem: p.ordem, semSub: [], subs: new Map() })
    const g = map.get(s)
    g.ordem = Math.min(g.ordem, p.ordem)
    const sub = (p.sub || '').trim()
    if (!sub) {
      g.semSub.push(p)
    } else {
      if (!g.subs.has(sub)) g.subs.set(sub, { ordem: p.ordem, itens: [] })
      const sg = g.subs.get(sub)
      sg.ordem = Math.min(sg.ordem, p.ordem)
      sg.itens.push(p)
    }
  }
  return [...map.entries()]
    .map(([secao, g]) => ({
      secao,
      ordem: g.ordem,
      semSub: g.semSub,
      subs: [...g.subs.entries()]
        .map(([nome, sg]) => ({ nome, ordem: sg.ordem, itens: sg.itens }))
        .sort((a, b) => a.ordem - b.ordem),
    }))
    .sort((a, b) => a.ordem - b.ordem)
}

// Menu de navegação lateral (drawer) da Governança de Processos. Desliza da
// esquerda, lista as seções do portal de líderes em cascata (acordeão) e cada
// seção/subgrupo abre e recolhe. Montado no rodapé (portal), controlado por
// `aberto`/`onClose` de fora.
export function MenuLateral({ aberto, onClose }) {
  // render = está no DOM (segura durante a saída); show = estado visível (anima)
  const [render, setRender] = useState(aberto)
  const [show, setShow] = useState(false)
  const [paginas, setPaginas] = useState(null) // null = carregando
  const [abertos, setAbertos] = useState(() => new Set()) // seções/subgrupos abertos
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
    supabase.rpc('gov_meus_acessos').then(({ data }) => setPaginas(data || []))
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

  const secoes = useMemo(() => agrupar(paginas), [paginas])

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

  // Uma página (folha do acordeão). `dentro` = está sob um subgrupo (recuo maior).
  const linhaPagina = (p, dentro) => (
    <NavLink
      key={p.pagina_id}
      to={alvo(p)}
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
              isActive ? 'bg-accent' : 'bg-muted-2',
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
          <div className="hstack justify-between">
            <div className="min-w-0">
              <div className="font-display text-base font-bold leading-tight">Governança</div>
              <div className="text-[11px] text-muted-2">Processos &amp; páginas</div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-carbon tap"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo: acordeão das seções */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-1">
          {paginas === null ? (
            <div className="grid place-items-center py-16 text-muted-2">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : secoes.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted">
              Nenhuma página da Governança liberada pra você.
            </div>
          ) : (
            secoes.map((sec) => {
              const Icon = ICONE_SECAO[sec.secao] || Folder
              const kSec = 'sec:' + sec.secao
              const open = abertos.has(kSec)
              const total =
                sec.semSub.length + sec.subs.reduce((n, s) => n + s.itens.length, 0)
              return (
                <div key={sec.secao} className="border-b border-line/60 last:border-0">
                  <button
                    onClick={() => toggle(kSec)}
                    className="hstack w-full gap-3 px-2 py-3 text-left tap"
                    aria-expanded={open}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors',
                        open ? 'bg-accent text-black' : 'bg-surface-2 text-carbon',
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{sec.secao}</span>
                      <span className="block text-[11px] text-muted-2">
                        {total} {total === 1 ? 'página' : 'páginas'}
                      </span>
                    </span>
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
                        {sec.semSub.map((p) => linhaPagina(p, false))}

                        {sec.subs.map((sub) => {
                          const kSub = 'sub:' + sec.secao + '|' + sub.nome
                          const openSub = abertos.has(kSub)
                          return (
                            <div key={sub.nome} className="mt-0.5">
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
                                  {sub.nome}
                                </span>
                                <span className="shrink-0 text-[11px] text-muted-2">
                                  {sub.itens.length}
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
                                    {sub.itens.map((p) => linhaPagina(p, true))}
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
        </div>

        {/* Rodapé: abre o portal completo */}
        <div className="safe-bottom border-t border-line p-3">
          <NavLink
            to="/governanca"
            onClick={aoTocar}
            className="hstack w-full justify-center gap-2 rounded-xl bg-accent-soft py-3 text-sm font-semibold text-accent tap"
          >
            <ExternalLink size={16} /> Abrir portal completo
          </NavLink>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

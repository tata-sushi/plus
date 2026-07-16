import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings2, Plus, Check, Pin } from 'lucide-react'
import { Section } from './Section.jsx'
import { resolveIcon } from '../lib/icons.js'
import { tapHaptic } from '../lib/haptics.js'
import { governancaCatalogo, MAX_PAGINAS_FIXADAS } from '../lib/mockData.js'
import { cn } from '../lib/cn'

const STORAGE_KEY = 'tata_gov_pinned'

function loadPinned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Seção "Atalhos" (só para quem tem acesso à Governança): o líder fixa até
// MAX_PAGINAS_FIXADAS páginas do portal como pills finas de acesso rápido.
// A seleção fica salva neste aparelho (localStorage). Os links reais das páginas
// entram depois — por enquanto os atalhos abrem o portal (/governanca).
export function AtalhosGovernanca() {
  const [pinned, setPinned] = useState(loadPinned)
  const [managing, setManaging] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned))
    } catch {
      /* ignore */
    }
  }, [pinned])

  const atingiuLimite = pinned.length >= MAX_PAGINAS_FIXADAS

  function toggle(id) {
    tapHaptic()
    setPinned((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= MAX_PAGINAS_FIXADAS) return prev
      return [...prev, id]
    })
  }

  const fixadas = pinned.map((id) => governancaCatalogo.find((c) => c.id === id)).filter(Boolean)

  return (
    <Section
      className="mt-5"
      title="Atalhos"
      action={
        <button
          onClick={() => {
            tapHaptic()
            setManaging((m) => !m)
          }}
          className="hstack gap-1 text-xs font-semibold text-accent tap"
        >
          <Settings2 size={14} /> {managing ? 'Concluir' : 'Gerenciar'}
        </button>
      }
    >
      {fixadas.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {fixadas.map((p) => {
            const Icon = resolveIcon(p.icon)
            return (
              <Link
                key={p.id}
                to={p.to || '/governanca'}
                onClick={tapHaptic}
                className="hstack gap-2 rounded-pill border border-line bg-fill px-3.5 py-2.5 tap"
              >
                <Icon size={14} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{p.label}</span>
              </Link>
            )
          })}
        </div>
      ) : (
        <button
          onClick={() => {
            tapHaptic()
            setManaging(true)
          }}
          className="flex w-full flex-col items-center gap-2 rounded-card border border-dashed border-line bg-surface/60 p-5 text-center tap"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
            <Pin size={18} />
          </span>
          <span className="text-sm text-muted">
            Fixe até {MAX_PAGINAS_FIXADAS} páginas do portal para acesso rápido.
          </span>
          <span className="hstack gap-1 text-xs font-semibold text-accent">
            <Plus size={14} /> Adicionar atalhos
          </span>
        </button>
      )}

      {managing && (
        <div className="card mt-3 overflow-hidden">
          <div className="border-b border-line px-4 py-2.5 text-[11px] font-semibold text-muted-2">
            Escolha suas páginas · {pinned.length}/{MAX_PAGINAS_FIXADAS}
          </div>
          {governancaCatalogo.map((item, idx) => {
            const Icon = resolveIcon(item.icon)
            const ativo = pinned.includes(item.id)
            const bloqueado = !ativo && atingiuLimite
            return (
              <button
                key={item.id}
                onClick={() => !bloqueado && toggle(item.id)}
                disabled={bloqueado}
                className={cn(
                  'hstack w-full gap-3 px-4 py-2.5 text-left tap',
                  idx > 0 && 'border-t border-line',
                  bloqueado && 'opacity-40',
                )}
              >
                <Icon size={15} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                    ativo ? 'border-accent bg-accent text-black' : 'border-line text-muted',
                  )}
                >
                  {ativo ? <Check size={12} /> : <Plus size={12} />}
                </span>
              </button>
            )
          })}
          <p className="px-4 py-2 text-[11px] text-muted-2">
            Lista de exemplo — as páginas oficiais entram quando os links chegarem. Sua seleção fica
            salva neste aparelho.
          </p>
        </div>
      )}
    </Section>
  )
}

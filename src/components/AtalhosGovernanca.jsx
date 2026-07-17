import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pin } from 'lucide-react'
import { Section } from './Section.jsx'
import { resolveIcon } from '../lib/icons.js'
import { tapHaptic } from '../lib/haptics.js'
import { governancaCatalogo, MAX_PAGINAS_FIXADAS } from '../lib/mockData.js'

export const ATALHOS_KEY = 'tata_gov_pinned'

export function loadPinned() {
  try {
    const raw = localStorage.getItem(ATALHOS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Seção "Atalhos" (só para quem tem acesso à Governança): mostra as páginas do
// portal que o líder fixou, como pills de acesso rápido. O gerenciar (fixar/
// desafixar) fica em Mais › Gerenciar atalhos (rota /atalhos-governanca). Como o
// <main> remonta a cada troca de rota, ao voltar para a Início a seleção é relida.
export function AtalhosGovernanca() {
  const [pinned] = useState(loadPinned)
  const fixadas = pinned.map((id) => governancaCatalogo.find((c) => c.id === id)).filter(Boolean)

  return (
    <Section className="mt-5" title="Atalhos">
      {fixadas.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
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
        <Link
          to="/atalhos-governanca"
          onClick={tapHaptic}
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
        </Link>
      )}
    </Section>
  )
}

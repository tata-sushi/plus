import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pin } from 'lucide-react'
import { Section } from './Section.jsx'
import { resolveIcon } from '../lib/icons.js'
import { tapHaptic } from '../lib/haptics.js'
import { useDesktop } from '../lib/useDesktop.js'
import { useDesktopCanvas } from '../lib/desktopCanvas.js'
import { governancaCatalogo, MAX_PAGINAS_FIXADAS } from '../lib/mockData.js'

export const ATALHOS_KEY = 'tata_gov_pinned'

export function loadPinned() {
  try {
    const raw = localStorage.getItem(ATALHOS_KEY)
    const ids = raw ? JSON.parse(raw) : []
    if (!Array.isArray(ids)) return []
    // Descarta ids que não existem mais no catálogo (ex.: catálogo de exemplo
    // antigo) — senão ocupam vaga no limite sem aparecer em lugar nenhum.
    const validos = new Set(governancaCatalogo.map((c) => c.id))
    return ids.filter((id) => validos.has(id))
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
  const desktop = useDesktop()
  const { setCanvas } = useDesktopCanvas()

  return (
    <Section className="mt-5" title="Atalhos">
      {fixadas.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {fixadas.map((p) => {
            const Icon = resolveIcon(p.icon)
            const cls = 'hstack gap-2 rounded-pill border border-line bg-fill px-3.5 py-2.5 tap'
            const inner = (
              <>
                <Icon size={14} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{p.label}</span>
              </>
            )
            // No desktop o atalho abre no quadrante central; no celular navega.
            return desktop ? (
              <button
                key={p.id}
                onClick={() => {
                  tapHaptic()
                  setCanvas({ tipo: 'painel', url: p.url, titulo: p.label })
                }}
                className={`w-full text-left ${cls}`}
              >
                {inner}
              </button>
            ) : (
              <Link key={p.id} to={`/painel/${p.id}`} onClick={tapHaptic} className={cls}>
                {inner}
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

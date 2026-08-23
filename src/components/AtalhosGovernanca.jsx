import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pin } from 'lucide-react'
import { Section } from './Section.jsx'
import { resolveIcon } from '../lib/icons.js'
import { tapHaptic } from '../lib/haptics.js'
import { useDesktop } from '../lib/useDesktop.js'
import { useDesktopCanvas } from '../lib/desktopCanvas.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { MAX_PAGINAS_FIXADAS } from '../lib/mockData.js'
import { loadPins, subscribePins, PINS_KEY } from '../lib/govPins.js'

// Compat: alguns módulos ainda importam estes nomes daqui.
export const ATALHOS_KEY = PINS_KEY
export const loadPinned = loadPins

// Seção "Atalhos" (só para quem tem acesso à Governança): mostra as páginas do
// portal que o líder fixou, como pills de acesso rápido. Fixar/desafixar acontece
// em Mais › Gerenciar atalhos e também pelo alfinete no header de cada página.
export function AtalhosGovernanca() {
  const { usuario } = useAuth()
  const isAdmin = (usuario?.perfil || '').toLowerCase() === 'admin'
  const [pinned, setPinned] = useState(loadPins)
  // Reage a mudanças (ex.: fixou pelo alfinete numa página aberta).
  useEffect(() => subscribePins(setPinned), [])
  // Páginas marcadas admin só aparecem pra quem é admin (mesmo se ficaram fixadas).
  const fixadas = pinned.filter(
    (p) => (isAdmin || !p.admin) && (!p.need || usuario?.[p.need]),
  )
  const desktop = useDesktop()
  const { abrirAba } = useDesktopCanvas()

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
            // No desktop o atalho abre como ABA (rail lateral, estilo navegador);
            // no celular navega pra tela cheia.
            return desktop ? (
              <button
                key={p.id}
                onClick={() => {
                  tapHaptic()
                  abrirAba({ id: p.id, url: p.url, titulo: p.label, icon: p.icon })
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

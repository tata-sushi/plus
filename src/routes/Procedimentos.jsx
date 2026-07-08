import { Search, Sparkles } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { IconTile } from '../components/IconTile.jsx'
import { procedimentos, procedimentoDoDia } from '../lib/mockData.js'

export function Procedimentos() {
  return (
    <>
      <Header title="Procedimentos" />

      <div className="px-5">
        <div className="hstack gap-2 rounded-pill bg-surface px-4 py-2.5">
          <Search size={16} className="text-muted" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            placeholder="Buscar procedimento…"
          />
        </div>
      </div>

      <Section className="mt-5" title="Setores">
        <div className="grid grid-cols-3 gap-2">
          {procedimentos.map((p) => (
            <IconTile key={p.id} icon={p.icon} label={p.label} />
          ))}
        </div>
      </Section>

      <Section className="mt-5" title="Procedimento do dia">
        <div className="rounded-card border border-accent/30 bg-accent-soft p-4">
          <div className="hstack gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-black">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{procedimentoDoDia.titulo}</div>
              <div className="text-xs text-muted">{procedimentoDoDia.descricao}</div>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}

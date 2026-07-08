import { Search, Eye } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Tabs } from '../components/Tabs.jsx'
import { Card } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'
import { comunicados } from '../lib/mockData.js'

const abas = [
  { value: 'todos', label: 'Todos' },
  { value: 'urgentes', label: 'Urgentes' },
  { value: 'loja', label: 'Loja' },
  { value: 'corporativo', label: 'Corporativo' },
]

export function Comunicados() {
  return (
    <>
      <Header
        title="Comunicados"
        right={
          <button className="grid h-9 w-9 place-items-center rounded-full bg-surface tap" aria-label="Buscar">
            <Search size={18} />
          </button>
        }
      />
      <Tabs tabs={abas} defaultValue="todos" />

      <div className="mt-2 flex flex-col gap-3 px-5">
        {comunicados.map((c) => (
          <Card key={c.id} highlight={c.urgente}>
            {c.tag && (
              <div className="mb-2">
                <Badge variant="urgente">{c.tag}</Badge>
              </div>
            )}
            <h3 className="font-display text-base font-bold leading-snug">{c.titulo}</h3>
            <p className="mt-1 text-sm text-muted">{c.resumo}</p>
            <div className="mt-3 hstack justify-between text-[11px] text-muted">
              <span>
                {c.data} · {c.categoria}
              </span>
              <span className="hstack gap-1">
                <Eye size={12} /> {c.views}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

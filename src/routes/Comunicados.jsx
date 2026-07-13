import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, Inbox } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Tabs } from '../components/Tabs.jsx'
import { Card } from '../components/Card.jsx'
import { Badge } from '../components/Badge.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { comunicados, getColaborador } from '../lib/mockData.js'

const abas = [
  { value: 'todos', label: 'Todos' },
  { value: 'urgentes', label: 'Urgentes' },
  { value: 'loja', label: 'Loja' },
  { value: 'corporativo', label: 'Corporativo' },
]

export function Comunicados() {
  const [tab, setTab] = useState('todos')

  const filtrados = comunicados.filter((c) => {
    if (tab === 'todos') return true
    if (tab === 'urgentes') return c.urgente
    return c.escopo === tab
  })

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
      <Tabs tabs={abas} value={tab} onChange={setTab} />

      <div className="mt-2 flex flex-col gap-3 px-5">
        {filtrados.map((c) => {
          const autor = c.autorId ? getColaborador(c.autorId) : null
          return (
            <Card key={c.id} highlight={c.urgente} className="reveal">
              {c.tag && (
                <div className="mb-2">
                  <Badge variant="urgente">{c.tag}</Badge>
                </div>
              )}
              {autor && (
                <Link to={`/perfil/${autor.id}`} className="hstack mb-2 gap-2 tap">
                  <Avatar name={autor.nome} size={28} />
                  <div className="min-w-0 leading-tight">
                    <div className="text-xs font-semibold">{autor.nome}</div>
                    <div className="text-[11px] text-muted">{autor.cargo}</div>
                  </div>
                </Link>
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
          )
        })}

        {filtrados.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted">
              <Inbox size={24} />
            </div>
            <p className="text-sm text-muted">Nenhum comunicado nessa categoria.</p>
          </div>
        )}
      </div>
    </>
  )
}

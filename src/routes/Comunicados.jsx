import { Eye } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { comunicados } from '../lib/mockData.js'

export function Comunicados() {
  return (
    <>
      <Header />

      <div className="mt-2 flex flex-col gap-3 px-5">
        {comunicados.map((c) => (
          <Card key={c.id} className="reveal">
            <h3 className="font-display text-base font-bold leading-snug">{c.titulo}</h3>
            <p className="mt-1 text-sm text-muted">{c.resumo}</p>
            <div className="mt-3 hstack justify-between text-[11px] text-muted">
              <span>{c.data}</span>
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

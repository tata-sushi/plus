import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Tabs } from '../components/Tabs.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { colaboradores, currentUser } from '../lib/mockData.js'

const abas = [
  { value: 'geral', label: 'Geral' },
  { value: 'loja', label: 'Minha loja' },
]

const fmt = (n) => n.toLocaleString('pt-BR')

function PodiumItem({ pos, c }) {
  const isFirst = pos === 1
  return (
    <Link
      to={`/perfil/${c.id}`}
      className={`flex min-w-0 flex-1 flex-col items-center tap ${isFirst ? '' : 'mt-5'}`}
    >
      {isFirst && <Crown size={20} className="mb-1 text-accent" />}
      <div className="relative">
        <Avatar
          name={c.nome}
          size={isFirst ? 72 : 56}
          className={isFirst ? 'ring-2 ring-accent shadow-glow' : 'ring-1 ring-white/15'}
        />
        <span
          className={`absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-[11px] font-bold ${
            isFirst ? 'bg-accent text-black' : 'border border-white/10 bg-surface-2 text-text'
          }`}
        >
          {pos}
        </span>
      </div>
      <div className="mt-3 w-full truncate text-center text-xs font-semibold">
        {c.nome.split(' ')[0]}
      </div>
      <div className="text-[11px] font-bold text-accent">{fmt(c.pontosCarteira)}</div>
    </Link>
  )
}

export function Ranking() {
  const [tab, setTab] = useState('geral')

  const lista = [...colaboradores]
    .filter((c) => tab === 'geral' || c.loja === currentUser.loja)
    .sort((a, b) => b.pontosCarteira - a.pontosCarteira)

  const [p1, p2, p3] = lista

  return (
    <>
      <Header title="Ranking" />
      <Tabs tabs={abas} value={tab} onChange={setTab} />

      {/* Pódio */}
      {lista.length > 0 && (
        <div className="px-5">
          <div className="hero-card flex items-end justify-center gap-3 px-4 pb-4 pt-6">
            {p2 && <PodiumItem pos={2} c={p2} />}
            {p1 && <PodiumItem pos={1} c={p1} />}
            {p3 && <PodiumItem pos={3} c={p3} />}
          </div>
        </div>
      )}

      {/* Classificação completa */}
      <Section className="mt-5" title="Classificação">
        <div className="card overflow-hidden">
          {lista.map((c, i) => {
            const isSelf = c.id === currentUser.id
            return (
              <Link
                key={c.id}
                to={`/perfil/${c.id}`}
                className={`hstack gap-3 px-4 py-3 tap ${i > 0 ? 'border-t border-white/5' : ''} ${
                  isSelf ? 'bg-accent-soft' : ''
                }`}
              >
                <span className="w-5 shrink-0 text-center text-sm font-bold text-muted">
                  {i + 1}
                </span>
                <Avatar name={c.nome} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {c.nome}
                    {isSelf && <span className="text-accent"> · você</span>}
                  </div>
                  <div className="truncate text-[11px] text-muted">
                    {c.cargo} · {c.loja}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-accent">
                  {fmt(c.pontosCarteira)}
                  <span className="ml-0.5 text-[10px] font-medium text-muted">pts</span>
                </span>
              </Link>
            )
          })}
        </div>
      </Section>
    </>
  )
}

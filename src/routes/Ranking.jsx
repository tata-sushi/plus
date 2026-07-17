import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Loader2 } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Tabs } from '../components/Tabs.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const abas = [
  { value: 'geral', label: 'Geral' },
  { value: 'unidade', label: 'Unidade' },
  { value: 'departamento', label: 'Departamento' },
]

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR')

function PodiumItem({ pos, c, onClick }) {
  const isFirst = pos === 1
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center tap ${isFirst ? '' : 'mt-5'}`}
    >
      {isFirst && <Crown size={20} className="mb-1 text-accent" />}
      <div className="relative">
        <Avatar
          name={c.nome}
          src={c.avatar_url}
          size={isFirst ? 72 : 56}
          className={isFirst ? 'ring-2 ring-accent shadow-glow' : 'ring-1 ring-line'}
        />
        <span
          className={`absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-[11px] font-bold ${
            isFirst ? 'bg-accent text-black' : 'border border-line bg-surface-2 text-text'
          }`}
        >
          {pos}
        </span>
      </div>
      <div className="mt-3 w-full truncate text-center text-xs font-semibold">
        {(c.nome || '').split(' ')[0]}
      </div>
      <div className="text-[11px] font-bold text-accent">{fmt(c.pontos)}</div>
    </button>
  )
}

export function Ranking() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('geral')
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('ranking')
    setDados(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const lista = useMemo(() => {
    const l = dados.filter((c) => {
      if (tab === 'unidade') return c.unidade === usuario?.unidade
      if (tab === 'departamento') return c.departamento === usuario?.departamento
      return true
    })
    // já vem ordenado por pontos; reindexa a posição no filtro
    return l
  }, [dados, tab, usuario])

  const subtitulo =
    tab === 'unidade'
      ? usuario?.unidade || 'Sua unidade'
      : tab === 'departamento'
        ? `Departamento · ${usuario?.departamento || '—'}`
        : 'Todas as unidades'

  const [p1, p2, p3] = lista

  return (
    <>
      <Header title="Ranking" />
      <Tabs tabs={abas} value={tab} onChange={setTab} />

      <div className="px-5 pb-3 -mt-1 text-xs font-medium text-muted">{subtitulo}</div>

      {carregando ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">Sem pontuação por aqui ainda.</div>
      ) : (
        <>
          {/* Pódio */}
          <div className="px-5">
            <div className="hero-card flex items-end justify-center gap-3 px-4 pb-4 pt-6">
              {p2 && <PodiumItem pos={2} c={p2} onClick={() => navigate(`/perfil/${p2.matricula}`)} />}
              {p1 && <PodiumItem pos={1} c={p1} onClick={() => navigate(`/perfil/${p1.matricula}`)} />}
              {p3 && <PodiumItem pos={3} c={p3} onClick={() => navigate(`/perfil/${p3.matricula}`)} />}
            </div>
          </div>

          {/* Classificação completa */}
          <Section className="mt-5" title="Classificação">
            <div className="card overflow-hidden">
              {lista.map((c, i) => {
                const isSelf = c.matricula === usuario?.matricula
                return (
                  <button
                    key={c.matricula}
                    onClick={() => navigate(`/perfil/${c.matricula}`)}
                    className={`hstack w-full gap-3 px-4 py-3 text-left tap ${
                      i > 0 ? 'border-t border-line' : ''
                    } ${isSelf ? 'bg-accent-soft' : ''}`}
                  >
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-muted">
                      {i + 1}
                    </span>
                    <Avatar name={c.nome} src={c.avatar_url} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {c.nome}
                        {isSelf && <span className="text-accent"> · você</span>}
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {c.departamento}
                        {c.departamento && c.unidade ? ' · ' : ''}
                        {c.unidade}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-accent">
                      {fmt(c.pontos)}
                      <span className="ml-0.5 text-[10px] font-medium text-muted">pts</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>
        </>
      )}
    </>
  )
}

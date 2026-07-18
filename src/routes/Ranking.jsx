import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Loader2 } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Tabs } from '../components/Tabs.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const tipos = [
  { value: 'geral', label: 'Geral' },
  { value: 'lideres', label: 'Líderes' },
]

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR')
const selectCls =
  'min-w-0 flex-1 rounded-pill border border-line bg-surface px-3.5 py-2 text-xs font-medium text-text outline-none focus:border-accent'

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
  const [tipo, setTipo] = useState('geral') // geral | lideres
  const [uni, setUni] = useState('')
  const [dep, setDep] = useState('')
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

  const unidades = useMemo(
    () => [...new Set(dados.map((c) => c.unidade).filter(Boolean))].sort(),
    [dados],
  )
  const departamentos = useMemo(
    () => [...new Set(dados.map((c) => c.departamento).filter(Boolean))].sort(),
    [dados],
  )

  // já vem ordenado por pontos; filtra por tipo + unidade + departamento
  const lista = useMemo(
    () =>
      dados.filter(
        (c) =>
          (tipo === 'geral' || c.lider) &&
          (!uni || c.unidade === uni) &&
          (!dep || c.departamento === dep),
      ),
    [dados, tipo, uni, dep],
  )

  const [p1, p2, p3] = lista

  return (
    <>
      <Header title="Ranking" />
      <Tabs tabs={tipos} value={tipo} onChange={setTipo} />

      <div className="hstack gap-2 px-5 pb-1 pt-2">
        <select value={uni} onChange={(e) => setUni(e.target.value)} className={selectCls}>
          <option value="">Todas as unidades</option>
          {unidades.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select value={dep} onChange={(e) => setDep(e.target.value)} className={selectCls}>
          <option value="">Todos os departamentos</option>
          {departamentos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {carregando ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">Ninguém por aqui ainda.</div>
      ) : (
        <>
          {/* Pódio */}
          <div className="px-5 pt-3">
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

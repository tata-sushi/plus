import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown,
  Loader2,
  Users,
  Fish,
  Wine,
  ChefHat,
  Soup,
  ConciergeBell,
  Banknote,
  Bike,
  ShoppingCart,
  Boxes,
  SprayCan,
  BadgeCheck,
  Cog,
  Megaphone,
  Wallet,
  Briefcase,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Tabs } from '../components/Tabs.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const tipos = [
  { value: 'geral', label: 'Colaboradores' },
  { value: 'equipes', label: 'Equipes' },
  { value: 'lideres', label: 'Líderes' },
]

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR')
const selectCls =
  'min-w-0 flex-1 rounded-pill border border-line bg-surface px-3.5 py-2 text-xs font-medium text-text outline-none focus:border-accent'

// Ícone que combina com a área/departamento da equipe.
function iconeArea(nome) {
  const n = (nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  if (n.includes('sushi') || n.includes('peix')) return Fish
  if (n.includes('refeit')) return Soup
  if (n.includes('cozinha')) return ChefHat
  if (n.includes('bar')) return Wine
  if (n.includes('salao') || n.includes('atend') || n.includes('garcom')) return ConciergeBell
  if (n.includes('caixa')) return Banknote
  if (n.includes('deliver') || n.includes('entrega')) return Bike
  if (n.includes('compra')) return ShoppingCart
  if (n.includes('estoque') || n.includes('almox')) return Boxes
  if (n.includes('limpez')) return SprayCan
  if (n.includes('qualidad')) return BadgeCheck
  if (n.includes('manuten') || n.includes('opera')) return Cog
  if (n.includes('market')) return Megaphone
  if (n.includes('financ')) return Wallet
  if (n.includes('admin') || n.includes('escrit')) return Briefcase
  return Users
}

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

// Pódio de equipe — mesmo formato do PodiumItem, mas com ícone da área.
function PodiumEquipe({ pos, e, metrica }) {
  const isFirst = pos === 1
  const Icon = iconeArea(e.departamento)
  const size = isFirst ? 72 : 56
  const valor = metrica === 'media' ? e.media : e.pontos
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center ${isFirst ? '' : 'mt-5'}`}>
      {isFirst && <Crown size={20} className="mb-1 text-accent" />}
      <div className="relative">
        <span
          className={`grid place-items-center rounded-full bg-accent-soft text-accent ${
            isFirst ? 'ring-2 ring-accent shadow-glow' : 'ring-1 ring-line'
          }`}
          style={{ width: size, height: size }}
        >
          <Icon size={isFirst ? 30 : 24} />
        </span>
        <span
          className={`absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-[11px] font-bold ${
            isFirst ? 'bg-accent text-black' : 'border border-line bg-surface-2 text-text'
          }`}
        >
          {pos}
        </span>
      </div>
      <div className="mt-3 w-full truncate text-center text-xs font-semibold">{e.departamento}</div>
      <div className="text-[11px] font-bold text-accent">{fmt(valor)}</div>
    </div>
  )
}

export function Ranking() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [tipo, setTipo] = useState('geral') // geral | lideres | equipes
  const [uni, setUni] = useState('')
  const [dep, setDep] = useState('')
  const [metricaEquipe, setMetricaEquipe] = useState('total') // total | media
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

  const emEquipes = tipo === 'equipes'

  // já vem ordenado por pontos; Colaboradores = não-líderes · Líderes = líderes
  const lista = useMemo(
    () =>
      dados.filter(
        (c) =>
          (tipo === 'lideres' ? c.lider : !c.lider) &&
          (!uni || c.unidade === uni) &&
          (!dep || c.departamento === dep),
      ),
    [dados, tipo, uni, dep],
  )

  // Equipes: soma dos pontos por departamento (respeita o filtro de unidade),
  // ordenado por total ou por média conforme a lista suspensa.
  const equipes = useMemo(() => {
    const mapa = new Map()
    dados
      .filter((c) => c.departamento && (!uni || c.unidade === uni))
      .forEach((c) => {
        const cur = mapa.get(c.departamento) || {
          departamento: c.departamento,
          pontos: 0,
          membros: 0,
        }
        cur.pontos += Number(c.pontos) || 0
        cur.membros += 1
        mapa.set(c.departamento, cur)
      })
    return [...mapa.values()]
      .map((e) => ({ ...e, media: e.membros ? Math.round(e.pontos / e.membros) : 0 }))
      .sort((a, b) => (metricaEquipe === 'media' ? b.media - a.media : b.pontos - a.pontos))
  }, [dados, uni, metricaEquipe])

  const [p1, p2, p3] = lista
  const [e1, e2, e3] = equipes

  return (
    <>
      <Header title="Ranking" />
      <Tabs tabs={tipos} value={tipo} onChange={setTipo} className="pt-3" />

      <div className="hstack gap-2 px-5 pb-1 pt-2">
        <select value={uni} onChange={(e) => setUni(e.target.value)} className={selectCls}>
          <option value="">Todas as unidades</option>
          {unidades.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        {emEquipes ? (
          <select
            value={metricaEquipe}
            onChange={(e) => setMetricaEquipe(e.target.value)}
            className={selectCls}
          >
            <option value="total">Por total</option>
            <option value="media">Por média</option>
          </select>
        ) : (
          <select value={dep} onChange={(e) => setDep(e.target.value)} className={selectCls}>
            <option value="">Todos os departamentos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      {carregando ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : emEquipes ? (
        equipes.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">Sem equipes por aqui ainda.</div>
        ) : (
          <>
            {/* Pódio */}
            <div className="px-5 pt-3">
              <div className="hero-card flex items-end justify-center gap-3 px-4 pb-4 pt-6">
                {e2 && <PodiumEquipe pos={2} e={e2} metrica={metricaEquipe} />}
                {e1 && <PodiumEquipe pos={1} e={e1} metrica={metricaEquipe} />}
                {e3 && <PodiumEquipe pos={3} e={e3} metrica={metricaEquipe} />}
              </div>
            </div>

            {/* Classificação completa */}
            <Section className="mt-5" title="Classificação">
              <div className="card overflow-hidden">
                {equipes.map((e, i) => {
                  const AreaIcon = iconeArea(e.departamento)
                  return (
                    <div
                      key={e.departamento}
                      className={`hstack gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
                    >
                      <span className="w-5 shrink-0 text-center text-sm font-bold text-muted">
                        {i + 1}
                      </span>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                        <AreaIcon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{e.departamento}</div>
                        <div className="truncate text-[11px] text-muted">
                          {e.membros} pessoa{e.membros === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-accent">
                          {fmt(e.pontos)}
                          <span className="ml-0.5 text-[10px] font-medium text-muted">pts</span>
                        </div>
                        <div className="text-[10px] font-medium text-accent">
                          {fmt(e.media)}
                          <span className="text-carbon"> med/pessoa</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          </>
        )
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

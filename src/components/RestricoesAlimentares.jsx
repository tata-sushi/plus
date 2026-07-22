import { useEffect, useState } from 'react'
import {
  Plus, ChevronDown, EggFried, Utensils,
  Shell, Fish, Nut, Milk, Wheat, Egg, Bean, Ham, Beef, Drumstick,
  Salad, Vegan, Sprout, Leaf, Flame, CandyOff, Soup,
} from 'lucide-react'
import { Section } from './Section.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

// Ícones de contorno (padrão do app). Fallback: Utensils.
const ICONES = {
  Shell, Fish, Nut, Milk, Wheat, Egg, Bean, Ham, Beef, Drumstick,
  Salad, Vegan, Sprout, Leaf, Flame, CandyOff, Soup, EggFried,
}
function Ico({ name, ...p }) {
  const C = ICONES[name] || Utensils
  return <C {...p} />
}

// Toggle no padrão do app.
function Toggle({ on, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        on ? 'bg-accent' : 'bg-surface-3',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 block h-5 w-5 rounded-full bg-white transition-transform',
          on ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

// "Restrições alimentares" do Meu perfil: fileirinha de ícones (contorno,
// como as conquistas). A substituição padrão (ovo frito) aparece como um
// ícone no mesmo nível. Alimenta o catálogo base.
export function RestricoesAlimentares() {
  const [minhas, setMinhas] = useState(null) // null = carregando
  const [catalogo, setCatalogo] = useState([])
  const [sel, setSel] = useState(null)
  const [abrindo, setAbrindo] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('alergia')
  const [subst, setSubst] = useState(false)
  const [lista, setLista] = useState(false) // dropdown do catálogo aberto
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.rpc('minhas_restricoes'),
      supabase.rpc('restricoes_catalogo'),
    ])
    setMinhas(m || [])
    setCatalogo(c || [])
  }
  useEffect(() => {
    carregar()
  }, [])

  async function upsert(n, t, s) {
    await supabase.rpc('restricao_add', { p_nome: n, p_tipo: t, p_substituicao: s })
  }

  async function adicionar(e) {
    e?.preventDefault()
    const n = nome.trim()
    if (!n || salvando) return
    setSalvando(true)
    await upsert(n, tipo, subst)
    setSalvando(false)
    setNome('')
    setSubst(false)
    setAbrindo(false)
    setLista(false)
    carregar()
  }

  async function alternarSubst(r) {
    const novo = !r.quer_substituicao
    setMinhas((xs) =>
      xs.map((x) => (x.restricao_id === r.restricao_id ? { ...x, quer_substituicao: novo } : x)),
    )
    await upsert(r.nome, r.tipo, novo)
  }

  async function remover(id) {
    setMinhas((xs) => xs.filter((x) => x.restricao_id !== id))
    setSel(null)
    await supabase.rpc('restricao_del', { p_restricao_id: id })
    carregar()
  }

  if (minhas === null) return null
  const selR = minhas.find((x) => x.restricao_id === sel)

  // Células da fileirinha: cada restrição + (se pedir) o ovo no mesmo nível.
  const cells = []
  minhas.forEach((r) => {
    cells.push({ k: `r${r.restricao_id}`, tipo: 'rest', r })
    if (r.quer_substituicao) cells.push({ k: `s${r.restricao_id}`, tipo: 'sub', r })
  })

  const filtrados = catalogo.filter((c) =>
    c.nome.toLowerCase().includes(nome.trim().toLowerCase()),
  )

  return (
    <Section
      className="reveal reveal-3 mt-5"
      title="Restrições alimentares"
      action={
        minhas.length ? (
          <span className="text-xs font-semibold text-muted">{minhas.length}</span>
        ) : null
      }
    >
      <div className="card p-4">
        {/* Fileirinha de ícones */}
        {minhas.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma cadastrada. Toque em adicionar abaixo.</p>
        ) : (
          <div className="grid grid-cols-5 gap-x-2 gap-y-3">
            {cells.map((cell) => {
              const on = cell.r.restricao_id === sel
              const sub = cell.tipo === 'sub'
              return (
                <button
                  key={cell.k}
                  type="button"
                  title={sub ? 'Substituição: ovo frito' : cell.r.nome}
                  onClick={() => setSel(on ? null : cell.r.restricao_id)}
                  className="flex flex-col items-center gap-1 text-center tap"
                >
                  <span
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-xl',
                      sub
                        ? 'border border-dashed border-accent/50 text-accent'
                        : 'bg-accent-soft text-accent',
                      on && 'ring-2 ring-accent',
                    )}
                  >
                    {sub ? <EggFried size={18} /> : <Ico name={cell.r.icone} size={18} />}
                  </span>
                  <span
                    className={cn(
                      'w-full truncate text-[10px] font-semibold leading-tight',
                      sub && 'text-muted',
                    )}
                  >
                    {sub ? 'Ovo frito' : cell.r.nome}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Detalhe do selecionado */}
        {selR && (
          <div className="mt-3 rounded-card bg-surface-2 px-3 py-2.5">
            <div className="hstack justify-between gap-2">
              <span className="hstack min-w-0 gap-2 text-sm font-semibold">
                <Ico name={selR.icone} size={16} className="shrink-0 text-accent" />
                <span className="truncate">{selR.nome}</span>
                <span className="pill shrink-0 bg-surface-3 text-[10px] uppercase text-muted">
                  {selR.tipo === 'alergia' ? 'Alergia' : 'Preferência'}
                </span>
              </span>
              <button
                onClick={() => remover(selR.restricao_id)}
                className="shrink-0 text-xs font-semibold text-red-400 tap"
              >
                Remover
              </button>
            </div>
            <div className="mt-2 hstack justify-between border-t border-line pt-2">
              <span className="hstack gap-1.5 text-xs text-muted">
                <EggFried size={13} /> Substituição padrão (ovo frito)
              </span>
              <Toggle
                on={selR.quer_substituicao}
                onClick={() => alternarSubst(selR)}
                label="Substituição padrão"
              />
            </div>
          </div>
        )}

        {/* Adicionar (colapsável) */}
        {!abrindo ? (
          <button
            type="button"
            onClick={() => setAbrindo(true)}
            className="mt-3 hstack w-full justify-center gap-2 rounded-card border border-dashed border-line py-2 text-xs font-semibold text-muted tap"
          >
            <Plus size={14} /> Adicionar restrição
          </button>
        ) : (
          <form onSubmit={adicionar} className="mt-3 border-t border-line pt-3">
            {/* Combobox: lista suspensa própria (sem sugestão do teclado) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLista((v) => !v)}
                className="hstack w-full justify-between rounded-card border border-line bg-surface px-3 py-2 text-left text-sm"
              >
                <span className={cn('truncate', !nome && 'text-muted-2')}>
                  {nome || 'Escolha ou digite a restrição'}
                </span>
                <ChevronDown size={16} className="shrink-0 text-muted-2" />
              </button>

              {lista && (
                <>
                  <button
                    type="button"
                    aria-label="Fechar lista"
                    onClick={() => setLista(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-card border border-line bg-surface shadow-lg">
                    <div className="border-b border-line p-2">
                      <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        autoFocus
                        placeholder="Buscar ou digitar…"
                        className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-2"
                      />
                    </div>
                    {filtrados.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setNome(c.nome)
                          setTipo(c.tipo)
                          setLista(false)
                        }}
                        className="hstack w-full gap-2.5 px-3 py-2 text-left text-sm tap active:bg-surface-2"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                          <Ico name={c.icone} size={15} />
                        </span>
                        <span className="truncate">{c.nome}</span>
                      </button>
                    ))}
                    {nome.trim() && !catalogo.some((c) => c.nome.toLowerCase() === nome.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => setLista(false)}
                        className="hstack w-full gap-2.5 border-t border-line px-3 py-2 text-left text-sm text-accent tap active:bg-surface-2"
                      >
                        <Plus size={15} className="shrink-0" /> Criar “{nome.trim()}”
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Tipo — selecionado sempre verde */}
            <div className="mt-2 hstack gap-2">
              {[
                ['alergia', 'Alergia'],
                ['preferencia', 'Preferência'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTipo(v)}
                  className={cn(
                    'flex-1 rounded-card border py-1.5 text-xs font-semibold',
                    tipo === v
                      ? 'border-accent/40 bg-accent-soft text-accent'
                      : 'border-line text-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-2 hstack justify-between rounded-card border border-line px-3 py-2">
              <span className="hstack gap-1.5 text-xs text-muted">
                <EggFried size={13} /> Substituição (ovo frito)
              </span>
              <Toggle on={subst} onClick={() => setSubst((v) => !v)} label="Substituição" />
            </div>

            <div className="mt-3 hstack gap-2">
              <button
                type="button"
                onClick={() => {
                  setAbrindo(false)
                  setNome('')
                  setSubst(false)
                  setLista(false)
                }}
                className="flex-1 rounded-card border border-line py-2 text-sm font-semibold text-muted tap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!nome.trim() || salvando}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {salvando ? 'Salvando…' : 'Adicionar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Section>
  )
}

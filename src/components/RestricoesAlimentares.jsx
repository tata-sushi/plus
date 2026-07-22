import { useEffect, useState } from 'react'
import {
  Plus, ChevronDown, EggFried, Utensils, Check, X,
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

// "Restrições alimentares" do Meu perfil. Um toggle "Tenho restrição
// alimentar" (sim/não); ligando, abre os campos pra cadastrar (grade de
// ícones + adicionar + ovo frito). A substituição (ovo frito) é global.
export function RestricoesAlimentares() {
  const [minhas, setMinhas] = useState(null) // null = carregando
  const [catalogo, setCatalogo] = useState([])
  const [substituicao, setSubstituicao] = useState(false)
  const [tem, setTem] = useState(false) // toggle "tenho restrição"
  const [sel, setSel] = useState(null)
  const [abrindo, setAbrindo] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('alergia')
  const [lista, setLista] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const [{ data: m }, { data: c }, { data: s }, { data: tr }] = await Promise.all([
      supabase.rpc('minhas_restricoes'),
      supabase.rpc('restricoes_catalogo'),
      supabase.rpc('minha_substituicao'),
      supabase.rpc('minha_tem_restricao'),
    ])
    setMinhas(m || [])
    setCatalogo(c || [])
    setSubstituicao(s === true)
    setTem((m || []).length > 0 || tr === true)
  }
  useEffect(() => {
    carregar()
  }, [])

  // tem restrições cadastradas ⇒ o toggle fica ligado (não dá pra dizer "não tenho")
  const temR = (minhas?.length || 0) > 0 || tem

  async function escolherTem(valor) {
    // Já tem restrições cadastradas ⇒ não dá pra dizer "não tenho".
    if (valor === false && (minhas?.length || 0) > 0) return
    setTem(valor)
    setAbrindo(valor) // "Sim" → já abre o campo de cadastrar
    await supabase.rpc('tem_restricao_set', { p_on: valor })
  }

  async function toggleSub() {
    const novo = !substituicao
    setSubstituicao(novo)
    await supabase.rpc('substituicao_set', { p_on: novo })
  }

  async function adicionar(e) {
    e?.preventDefault()
    const n = nome.trim()
    if (!n || salvando) return
    setSalvando(true)
    await supabase.rpc('restricao_add', { p_nome: n, p_tipo: tipo })
    if (!tem) {
      setTem(true)
      await supabase.rpc('tem_restricao_set', { p_on: true })
    }
    setSalvando(false)
    setNome('')
    setAbrindo(false)
    setLista(false)
    carregar()
  }

  async function remover(id) {
    setMinhas((xs) => xs.filter((x) => x.restricao_id !== id))
    setSel(null)
    await supabase.rpc('restricao_del', { p_restricao_id: id })
    carregar()
  }

  if (minhas === null) return null
  const selR = minhas.find((x) => x.restricao_id === sel)
  const filtrados = catalogo.filter((c) => c.nome.toLowerCase().includes(nome.trim().toLowerCase()))

  return (
    <Section className="reveal reveal-3 mt-5" title="Restrições alimentares">
      <div className="card p-4">
        {/* Cabeçalho — ícone + "Restrição Alimentar" + toggle Não/Sim (padrão DISC/Signo) */}
        <div className="hstack gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Utensils size={20} />
          </span>
          <div className="min-w-0 flex-1 font-display text-sm font-bold">Restrição alimentar</div>
          <div className="hstack shrink-0 gap-1 rounded-pill bg-surface-2 p-1">
            {[
              { on: false, label: 'Não', Icon: X },
              { on: true, label: 'Sim', Icon: Check },
            ].map(({ on, label, Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => escolherTem(on)}
                aria-label={label}
                aria-pressed={temR === on}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full tap',
                  temR === on ? 'bg-accent text-black' : 'text-muted',
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {temR && (
          <div className="mt-3 flex flex-col gap-3">
            {/* Grade de ícones */}
            {minhas.length > 0 && (
              <div className="flex items-start gap-3">
                <div
                  className={cn('grid flex-1 gap-x-2 gap-y-3', substituicao ? 'grid-cols-4' : 'grid-cols-5')}
                >
                  {minhas.map((r) => {
                    const on = r.restricao_id === sel
                    return (
                      <button
                        key={r.restricao_id}
                        type="button"
                        title={r.nome}
                        onClick={() => setSel(on ? null : r.restricao_id)}
                        className="flex flex-col items-center gap-1 text-center tap"
                      >
                        <span
                          className={cn(
                            'grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent',
                            on && 'ring-2 ring-accent',
                          )}
                        >
                          <Ico name={r.icone} size={18} />
                        </span>
                        <span className="w-full truncate text-[10px] font-semibold leading-tight">
                          {r.nome}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Ovo frito — único, global, à direita */}
                {substituicao && (
                  <div className="shrink-0 self-stretch border-l border-line pl-3">
                    <button
                      type="button"
                      title="Substituição padrão: ovo frito (toque para desligar)"
                      onClick={toggleSub}
                      className="flex w-14 flex-col items-center gap-1 text-center tap"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl border border-dashed border-accent/50 text-accent">
                        <EggFried size={18} />
                      </span>
                      <span className="w-full text-[10px] font-semibold leading-tight text-muted">
                        Ovo frito
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Detalhe do selecionado */}
            {selR && (
              <div className="hstack justify-between gap-2 rounded-card bg-surface-2 px-3 py-2.5">
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
            )}

            {/* Adicionar (colapsável) */}
            {!abrindo ? (
              <button
                type="button"
                onClick={() => setAbrindo(true)}
                className="hstack w-full justify-center gap-2 rounded-card border border-dashed border-line py-2 text-xs font-semibold text-muted tap"
              >
                <Plus size={14} /> Adicionar restrição
              </button>
            ) : (
              <form onSubmit={adicionar}>
                {/* lista suspensa própria */}
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
                        {nome.trim() &&
                          !catalogo.some((c) => c.nome.toLowerCase() === nome.trim().toLowerCase()) && (
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
                        tipo === v ? 'border-accent/40 bg-accent-soft text-accent' : 'border-line text-muted',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Ovo frito (global) */}
                <div className="mt-2 hstack justify-between rounded-card border border-line px-3 py-2">
                  <span className="hstack gap-1.5 text-xs text-muted">
                    <EggFried size={13} /> Ovo frito
                  </span>
                  <Toggle on={substituicao} onClick={toggleSub} label="Ovo frito" />
                </div>

                <div className="mt-3 hstack gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAbrindo(false)
                      setNome('')
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
        )}
      </div>
    </Section>
  )
}

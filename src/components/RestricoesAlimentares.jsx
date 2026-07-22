import { useEffect, useState } from 'react'
import { Plus, Egg } from 'lucide-react'
import { Section } from './Section.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

// Toggle no padrão do app (liga/desliga com knob).
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

// "Restrições alimentares" do Meu perfil: fileirinha de ícones (como as
// conquistas). Cadastra o que não come e, por restrição, pode pedir a
// substituição padrão (ovo frito). Alimenta o catálogo base.
export function RestricoesAlimentares() {
  const [minhas, setMinhas] = useState(null) // null = carregando
  const [catalogo, setCatalogo] = useState([])
  const [sel, setSel] = useState(null) // restricao_id em detalhe
  const [abrindo, setAbrindo] = useState(false) // form de adicionar
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('alergia')
  const [subst, setSubst] = useState(false)
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

  // add_ faz upsert (acha/cria no catálogo e vincula), então serve pra
  // adicionar e pra atualizar a substituição.
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
                      'relative grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-lg leading-none',
                      on && 'ring-2 ring-accent',
                    )}
                  >
                    {r.icone || '🍽️'}
                    {r.quer_substituicao && (
                      <span className="absolute -right-1.5 -top-1.5 text-[12px] leading-none">🍳</span>
                    )}
                  </span>
                  <span className="w-full truncate text-[10px] font-semibold leading-tight">
                    {r.nome}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Detalhe do ícone selecionado */}
        {selR && (
          <div className="mt-3 rounded-card bg-surface-2 px-3 py-2.5">
            <div className="hstack justify-between gap-2">
              <span className="hstack min-w-0 gap-2 text-sm font-semibold">
                <span className="text-base leading-none">{selR.icone || '🍽️'}</span>
                <span className="truncate">{selR.nome}</span>
                <span
                  className={cn(
                    'pill shrink-0 text-[10px] uppercase',
                    selR.tipo === 'alergia'
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-surface-3 text-muted',
                  )}
                >
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
                <Egg size={13} /> Substituição padrão (ovo frito)
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
            <input
              list="restr-catalogo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              placeholder="Ex.: Camarão, Lactose, Frango…"
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-2"
            />
            <datalist id="restr-catalogo">
              {catalogo.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>

            <div className="mt-2 hstack gap-2">
              <button
                type="button"
                onClick={() => setTipo('alergia')}
                className={cn(
                  'flex-1 rounded-card border py-1.5 text-xs font-semibold',
                  tipo === 'alergia'
                    ? 'border-red-500/40 bg-red-500/15 text-red-400'
                    : 'border-line text-muted',
                )}
              >
                Alergia
              </button>
              <button
                type="button"
                onClick={() => setTipo('preferencia')}
                className={cn(
                  'flex-1 rounded-card border py-1.5 text-xs font-semibold',
                  tipo === 'preferencia'
                    ? 'border-accent/40 bg-accent-soft text-accent'
                    : 'border-line text-muted',
                )}
              >
                Preferência
              </button>
            </div>

            <div className="mt-2 hstack justify-between rounded-card border border-line px-3 py-2">
              <span className="hstack gap-1.5 text-xs text-muted">
                <Egg size={13} /> Substituição (ovo frito)
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

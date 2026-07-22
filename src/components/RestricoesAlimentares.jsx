import { useEffect, useState } from 'react'
import { Plus, X, Check, Egg } from 'lucide-react'
import { Section } from './Section.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

// "Restrições alimentares" do Meu perfil: a pessoa cadastra o que não come.
// Alimenta o catálogo base (tata_refeicoes) e, por restrição, pode pedir a
// substituição padrão (ovo frito).
export function RestricoesAlimentares() {
  const [minhas, setMinhas] = useState(null) // null = carregando
  const [catalogo, setCatalogo] = useState([])
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('alergia')
  const [subst, setSubst] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

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

  async function adicionar(e) {
    e?.preventDefault()
    const n = nome.trim()
    if (!n || salvando) return
    setSalvando(true)
    setErro('')
    const { error } = await supabase.rpc('restricao_add', {
      p_nome: n,
      p_tipo: tipo,
      p_substituicao: subst,
    })
    setSalvando(false)
    if (error) {
      setErro('Não foi possível salvar. Tente de novo.')
      return
    }
    setNome('')
    setSubst(false)
    carregar()
  }

  async function remover(id) {
    setMinhas((xs) => xs.filter((x) => x.restricao_id !== id))
    await supabase.rpc('restricao_del', { p_restricao_id: id })
    carregar()
  }

  if (minhas === null) return null

  return (
    <Section className="reveal reveal-3 mt-5" title="Restrições alimentares">
      <div className="card p-4">
        {/* Minhas restrições */}
        {minhas.length === 0 ? (
          <p className="text-xs text-muted">
            Você ainda não cadastrou restrições. Adicione abaixo o que não pode comer.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {minhas.map((r) => (
              <div
                key={r.restricao_id}
                className="hstack justify-between gap-2 rounded-card border border-line bg-surface px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="hstack gap-2">
                    <span className="truncate text-sm font-semibold">{r.nome}</span>
                    <span
                      className={cn(
                        'pill shrink-0 text-[10px] uppercase',
                        r.tipo === 'alergia'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-surface-2 text-muted',
                      )}
                    >
                      {r.tipo === 'alergia' ? 'Alergia' : 'Preferência'}
                    </span>
                  </div>
                  {r.quer_substituicao && (
                    <div className="mt-0.5 hstack gap-1 text-[11px] text-muted">
                      <Egg size={12} /> Substituição padrão (ovo frito)
                    </div>
                  )}
                </div>
                <button
                  onClick={() => remover(r.restricao_id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted-2 tap"
                  aria-label={`Remover ${r.nome}`}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar restrição */}
        <form onSubmit={adicionar} className="mt-3 border-t border-line pt-3">
          <input
            list="restr-catalogo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
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
                  : 'border-line bg-surface text-muted',
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
                  : 'border-line bg-surface text-muted',
              )}
            >
              Preferência
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSubst((v) => !v)}
            className={cn(
              'mt-2 hstack w-full gap-3 rounded-card border px-3 py-2.5 text-left',
              subst ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface',
            )}
          >
            <span
              className={cn(
                'grid h-5 w-5 shrink-0 place-items-center rounded-md border',
                subst ? 'border-accent bg-accent text-black' : 'border-line',
              )}
            >
              {subst && <Check size={13} strokeWidth={3} />}
            </span>
            <span className="hstack gap-1 text-xs text-muted">
              <Egg size={13} /> Solicitar substituição padrão (ovo frito)
            </span>
          </button>

          {erro && <p className="mt-2 text-xs text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={!nome.trim() || salvando}
            className="btn-primary mt-3 w-full disabled:opacity-50"
          >
            <Plus size={15} /> {salvando ? 'Salvando…' : 'Adicionar restrição'}
          </button>
        </form>
      </div>
    </Section>
  )
}

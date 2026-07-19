import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, ChevronRight, Check, ShieldCheck, X, Layers } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { Avatar } from './Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// Agrupa o catálogo em Seção › Subseção, preservando a ordem do banco.
function agrupar(catalogo) {
  const grupos = []
  const idx = {}
  for (const p of catalogo) {
    const chave = `${p.secao}›${p.sub || ''}`
    if (!(chave in idx)) {
      idx[chave] = grupos.length
      grupos.push({ secao: p.secao, sub: p.sub || '', itens: [] })
    }
    grupos[idx[chave]].itens.push(p)
  }
  return grupos
}

// Editor de acesso de uma pessoa: catálogo com checkboxes por página e por pasta.
function EditorPessoa({ pessoa, catalogo, onFechar, onSalvo }) {
  const grupos = useMemo(() => agrupar(catalogo), [catalogo])
  const [ids, setIds] = useState(null) // Set | null (carregando)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    supabase.rpc('gov_admin_acessos', { p_matricula: pessoa.matricula }).then(({ data }) => {
      if (ativo) setIds(new Set((data || []).map((r) => r.pagina_id)))
    })
    return () => {
      ativo = false
    }
  }, [pessoa.matricula])

  function toggle(id) {
    tapHaptic()
    setIds((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleGrupo(itens, todosMarcados) {
    tapHaptic()
    setIds((prev) => {
      const n = new Set(prev)
      itens.forEach((p) => (todosMarcados ? n.delete(p.pagina_id) : n.add(p.pagina_id)))
      return n
    })
  }

  async function salvar() {
    setSalvando(true)
    const { error } = await supabase.rpc('gov_admin_set', {
      p_matricula: pessoa.matricula,
      p_pagina_ids: [...ids],
    })
    setSalvando(false)
    if (!error) onSalvo(ids.size)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Cabeçalho */}
      <div className="safe-top shrink-0 border-b border-line bg-surface">
        <div className="hstack gap-3 px-5 py-3">
          <button onClick={onFechar} className="shrink-0 text-muted tap" aria-label="Fechar">
            <X size={22} />
          </button>
          <Avatar name={pessoa.nome} size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-bold">{pessoa.nome}</div>
            <div className="truncate text-xs text-muted">
              {pessoa.cargo}
              {pessoa.unidade ? ` · ${pessoa.unidade}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {pessoa.is_admin ? (
          <Card className="hstack gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <ShieldCheck size={20} />
            </span>
            <div className="text-sm text-muted">
              <b className="text-text">Administrador.</b> Enxerga todas as páginas da governança
              automaticamente — não precisa liberar página por página.
            </div>
          </Card>
        ) : ids === null ? (
          <div className="hstack justify-center py-16 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grupos.map((g) => {
              const marcados = g.itens.filter((p) => ids.has(p.pagina_id)).length
              const todos = marcados === g.itens.length
              return (
                <div key={`${g.secao}-${g.sub}`}>
                  {/* Cabeçalho da pasta com "marcar tudo" */}
                  <button
                    onClick={() => toggleGrupo(g.itens, todos)}
                    className="hstack w-full gap-2 px-1 pb-2 text-left tap"
                  >
                    <Layers size={13} className="shrink-0 text-muted-2" />
                    <span className="flex-1 text-[11px] font-bold uppercase tracking-widest text-muted">
                      {g.secao}
                      {g.sub ? ` · ${g.sub}` : ''}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-semibold',
                        marcados > 0 ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted-2',
                      )}
                    >
                      {marcados}/{g.itens.length}
                    </span>
                  </button>

                  <Card className="!p-0">
                    {g.itens.map((p, i) => {
                      const on = ids.has(p.pagina_id)
                      return (
                        <button
                          key={p.pagina_id}
                          onClick={() => toggle(p.pagina_id)}
                          className={cn(
                            'hstack w-full gap-3 px-4 py-3 text-left tap',
                            i > 0 && 'border-t border-line',
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                              on ? 'border-accent bg-accent text-black' : 'border-line text-transparent',
                            )}
                          >
                            <Check size={15} strokeWidth={3} />
                          </span>
                          <span className="flex-1 text-sm font-medium">{p.label}</span>
                        </button>
                      )
                    })}
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rodapé */}
      {!pessoa.is_admin && ids !== null && (
        <div className="safe-bottom shrink-0 border-t border-line bg-surface px-5 py-3">
          <button
            onClick={salvar}
            disabled={salvando}
            className={cn('btn-primary w-full !py-3.5', salvando && 'opacity-60')}
          >
            {salvando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              `Salvar acesso (${ids.size} ${ids.size === 1 ? 'página' : 'páginas'})`
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// Aba "Governança" do painel admin: libera, por colaborador, quais páginas do
// portal de líderes ele enxerga (o portal puxa isso no login).
export function AdminGovernanca() {
  const [pessoas, setPessoas] = useState(null)
  const [catalogo, setCatalogo] = useState([])
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(null)

  function carregar() {
    Promise.all([supabase.rpc('gov_admin_pessoas'), supabase.rpc('gov_catalogo')]).then(
      ([p, c]) => {
        setPessoas(p.data || [])
        setCatalogo(c.data || [])
      },
    )
  }
  useEffect(carregar, [])

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return pessoas || []
    return (pessoas || []).filter((p) =>
      [p.nome, p.cargo, p.unidade, p.matricula].some((v) =>
        String(v || '').toLowerCase().includes(t),
      ),
    )
  }, [pessoas, busca])

  const comAcesso = (pessoas || []).filter((p) => p.is_admin || p.qtd > 0).length

  function aoSalvar(matricula, qtd) {
    setPessoas((prev) => prev.map((p) => (p.matricula === matricula ? { ...p, qtd } : p)))
    setSel(null)
  }

  if (pessoas === null) {
    return (
      <div className="hstack justify-center py-16 text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="px-5 pt-4">
        <Card className="!p-3">
          <div className="hstack gap-2 rounded-card bg-surface-2 px-3 py-2">
            <Search size={16} className="shrink-0 text-muted-2" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cargo, loja…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            />
          </div>
        </Card>
        <p className="mt-2 px-1 text-xs text-muted">
          {comAcesso} com acesso · {catalogo.length} páginas no catálogo
        </p>
      </div>

      <Section className="mt-2" title={`Colaboradores (${filtradas.length})`}>
        <div className="flex flex-col gap-2">
          {filtradas.map((p) => (
            <button
              key={p.matricula}
              onClick={() => {
                tapHaptic()
                setSel(p)
              }}
              className="tap text-left"
            >
              <Card className="hstack gap-3 !py-3">
                <Avatar name={p.nome} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.nome}</div>
                  <div className="truncate text-xs text-muted">
                    {p.cargo}
                    {p.unidade ? ` · ${p.unidade}` : ''}
                  </div>
                </div>
                {p.is_admin ? (
                  <span className="pill shrink-0 bg-accent-soft text-[10px] uppercase text-accent">
                    <ShieldCheck size={11} /> Vê tudo
                  </span>
                ) : p.qtd > 0 ? (
                  <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
                    {p.qtd}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-medium text-muted-2">sem acesso</span>
                )}
                <ChevronRight size={16} className="shrink-0 text-muted-2" />
              </Card>
            </button>
          ))}
          {filtradas.length === 0 && (
            <div className="card p-8 text-center text-sm text-muted">
              Ninguém encontrado com “{busca}”.
            </div>
          )}
        </div>
      </Section>

      {sel && (
        <EditorPessoa
          pessoa={sel}
          catalogo={catalogo}
          onFechar={() => setSel(null)}
          onSalvo={(qtd) => aoSalvar(sel.matricula, qtd)}
        />
      )}
    </>
  )
}

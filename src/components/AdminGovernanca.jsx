import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Search, ChevronRight, ChevronDown, Check, ShieldCheck, X, Layers } from 'lucide-react'
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

// Editor de acesso de uma pessoa: páginas (checkbox) e, por página, as abas
// (liberadas por padrão; toque pra bloquear pra esta pessoa).
function EditorPessoa({ pessoa, catalogo, catalogoAbas, onFechar, onSalvo }) {
  const grupos = useMemo(() => agrupar(catalogo), [catalogo])
  const abasPorPagina = useMemo(() => {
    const m = {}
    for (const a of catalogoAbas || []) (m[a.pagina_id] || (m[a.pagina_id] = [])).push(a)
    return m
  }, [catalogoAbas])

  const [ids, setIds] = useState(null) // Set de pagina_id · null = carregando
  const [bloqueadas, setBloqueadas] = useState(new Set()) // Set de aba_id bloqueada
  const [abasAbertas, setAbasAbertas] = useState(new Set()) // pagina_id com abas expandidas
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.rpc('gov_admin_acessos', { p_matricula: pessoa.matricula }),
      supabase.rpc('gov_admin_abas_bloqueios', { p_matricula: pessoa.matricula }),
    ]).then(([ac, bl]) => {
      if (!ativo) return
      setIds(new Set((ac.data || []).map((r) => r.pagina_id)))
      setBloqueadas(new Set((bl.data || []).map((r) => r.aba_id)))
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

  function toggleAba(abaId) {
    tapHaptic()
    setBloqueadas((prev) => {
      const n = new Set(prev)
      n.has(abaId) ? n.delete(abaId) : n.add(abaId)
      return n
    })
  }

  function toggleAbasAbertas(paginaId) {
    tapHaptic()
    setAbasAbertas((prev) => {
      const n = new Set(prev)
      n.has(paginaId) ? n.delete(paginaId) : n.add(paginaId)
      return n
    })
  }

  async function salvar() {
    setSalvando(true)
    const [r1, r2] = await Promise.all([
      supabase.rpc('gov_admin_set', { p_matricula: pessoa.matricula, p_pagina_ids: [...ids] }),
      supabase.rpc('gov_admin_abas_set', {
        p_matricula: pessoa.matricula,
        p_aba_ids: [...bloqueadas],
      }),
    ])
    setSalvando(false)
    if (!r1.error && !r2.error) onSalvo(ids.size)
  }

  return createPortal(
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
              <b className="text-text">Administrador.</b> Enxerga todas as páginas e abas da
              governança automaticamente — não precisa liberar nada.
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
                      const abas = abasPorPagina[p.pagina_id] || []
                      const abasAberto = abasAbertas.has(p.pagina_id)
                      const qtdOff = abas.filter((a) => bloqueadas.has(a.aba_id)).length
                      return (
                        <div key={p.pagina_id} className={cn(i > 0 && 'border-t border-line')}>
                          <button
                            onClick={() => toggle(p.pagina_id)}
                            className="hstack w-full gap-3 px-4 py-3 text-left tap"
                          >
                            <span
                              className={cn(
                                'grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                                on
                                  ? 'border-accent bg-accent text-black'
                                  : 'border-line text-transparent',
                              )}
                            >
                              <Check size={15} strokeWidth={3} />
                            </span>
                            <span className="flex-1 text-sm font-medium">{p.label}</span>
                            {abas.length > 0 && (
                              <span className="shrink-0 text-[10px] font-semibold text-muted-2">
                                {abas.length} abas
                              </span>
                            )}
                          </button>

                          {/* Abas: só quando a página está liberada. Recolhível
                              (começa guardado); liga/desliga o acesso por aba
                              (ligada = pode ver; desligada = bloqueada). */}
                          {on && abas.length > 0 && (
                            <div className="px-4 pb-3 pl-12">
                              <button
                                onClick={() => toggleAbasAbertas(p.pagina_id)}
                                className="hstack w-full gap-2 py-1 text-left tap [&>*]:pointer-events-none"
                              >
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                                  Abas
                                </span>
                                {qtdOff > 0 && (
                                  <span className="rounded-pill bg-danger/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">
                                    {qtdOff} desligada{qtdOff > 1 ? 's' : ''}
                                  </span>
                                )}
                                <span className="flex-1" />
                                <ChevronDown
                                  size={14}
                                  className={cn(
                                    'shrink-0 text-muted-2 transition-transform',
                                    abasAberto && 'rotate-180',
                                  )}
                                />
                              </button>
                              {abasAberto && (
                                <div className="mt-1 flex flex-col divide-y divide-line rounded-card border border-line">
                                  {abas.map((a) => {
                                    const liberada = !bloqueadas.has(a.aba_id)
                                    return (
                                      <div key={a.aba_id} className="hstack gap-3 px-3 py-2">
                                        <span
                                          className={cn(
                                            'flex-1 text-[13px] font-medium',
                                            !liberada && 'text-muted-2',
                                          )}
                                        >
                                          {a.label}
                                        </span>
                                        <button
                                          onClick={() => toggleAba(a.aba_id)}
                                          className={cn(
                                            'relative h-6 w-10 shrink-0 rounded-full transition-colors tap',
                                            liberada ? 'bg-accent' : 'bg-surface-2',
                                          )}
                                          aria-label={
                                            liberada
                                              ? `Desligar acesso à aba ${a.label}`
                                              : `Ligar acesso à aba ${a.label}`
                                          }
                                        >
                                          <span
                                            className={cn(
                                              'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                                              liberada ? 'left-[18px]' : 'left-0.5',
                                            )}
                                          />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
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
              `Salvar acesso (${ids.size} ${ids.size === 1 ? 'página' : 'páginas'}${
                bloqueadas.size ? ` · ${bloqueadas.size} aba(s) desligada(s)` : ''
              })`
            )}
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

// Aba "Governança" do painel admin: libera, por colaborador, quais páginas do
// portal de líderes ele enxerga — e, por página, quais abas ficam bloqueadas.
export function AdminGovernanca() {
  const [pessoas, setPessoas] = useState(null)
  const [catalogo, setCatalogo] = useState([])
  const [catalogoAbas, setCatalogoAbas] = useState([])
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(null)

  function carregar() {
    Promise.all([
      supabase.rpc('gov_admin_pessoas'),
      supabase.rpc('gov_catalogo'),
      supabase.rpc('gov_catalogo_abas'),
    ]).then(([p, c, a]) => {
      setPessoas(p.data || [])
      setCatalogo(c.data || [])
      setCatalogoAbas(a.data || [])
    })
  }
  useEffect(carregar, [])

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return pessoas || []
    return (pessoas || []).filter((p) =>
      [p.nome, p.cargo, p.unidade, p.matricula].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(t),
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
          catalogoAbas={catalogoAbas}
          onFechar={() => setSel(null)}
          onSalvo={(qtd) => aoSalvar(sel.matricula, qtd)}
        />
      )}
    </>
  )
}

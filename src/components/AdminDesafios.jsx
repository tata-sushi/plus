import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Search, ChevronRight, Check, X, Users, Info } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { Avatar } from './Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// Painel admin → "Desafios": por treinamento, escolhe quais pessoas têm acesso.
// Regra do sistema: desafio SEM ninguém marcado (e sem outras regras) = todo mundo vê.
// Marcar pessoas restringe a visão só a elas (liberação individual).
export function AdminDesafios() {
  const [treinos, setTreinos] = useState(null)
  const [pessoas, setPessoas] = useState([])
  const [sel, setSel] = useState(null)

  function carregar() {
    Promise.all([supabase.rpc('desafios_admin_lista'), supabase.rpc('gov_admin_pessoas')]).then(
      ([t, p]) => {
        setTreinos(t.data || [])
        setPessoas(p.data || [])
      },
    )
  }
  useEffect(carregar, [])

  const grupos = useMemo(() => {
    const m = new Map()
    for (const t of treinos || []) {
      if (!m.has(t.trilha)) m.set(t.trilha, [])
      m.get(t.trilha).push(t)
    }
    return [...m.entries()]
  }, [treinos])

  function aoSalvar(id, pessoasQtd) {
    setTreinos((prev) => prev.map((t) => (t.id === id ? { ...t, pessoas: pessoasQtd } : t)))
    setSel(null)
  }

  if (treinos === null) {
    return (
      <div className="hstack justify-center py-16 text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="px-5 pt-4">
        <div className="hstack items-start gap-2 rounded-card border border-line bg-surface px-3.5 py-3 text-xs text-muted">
          <Info size={15} className="mt-0.5 shrink-0 text-muted-2" />
          <span>
            Escolha quem enxerga cada desafio. Sem ninguém marcado, ele fica visível para{' '}
            <b className="text-text">todos</b>. Marcar pessoas restringe só a elas.
          </span>
        </div>
      </div>

      {grupos.map(([trilha, itens]) => (
        <Section key={trilha} className="mt-3" title={trilha}>
          <div className="card overflow-hidden">
            {itens.map((t, i) => (
              <button
                key={t.id}
                onClick={() => {
                  tapHaptic()
                  setSel(t)
                }}
                className={cn(
                  'hstack w-full items-center gap-3 px-4 py-3 text-left tap',
                  i > 0 && 'border-t border-line',
                  !t.ativo && 'opacity-55',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.titulo}</span>
                  {!t.ativo && <span className="text-[11px] text-muted-2">inativo</span>}
                </span>
                {t.pessoas > 0 ? (
                  <span className="hstack shrink-0 gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
                    <Users size={11} /> {t.pessoas}
                  </span>
                ) : t.outras_regras ? (
                  <span className="shrink-0 text-[11px] font-medium text-muted-2">por regra</span>
                ) : (
                  <span className="shrink-0 text-[11px] font-medium text-muted-2">todos</span>
                )}
                <ChevronRight size={16} className="shrink-0 text-muted-2" />
              </button>
            ))}
          </div>
        </Section>
      ))}

      {sel && (
        <EditorDesafio
          treino={sel}
          pessoas={pessoas}
          onFechar={() => setSel(null)}
          onSalvo={(qtd) => aoSalvar(sel.id, qtd)}
        />
      )}
    </>
  )
}

function EditorDesafio({ treino, pessoas, onFechar, onSalvo }) {
  const [ids, setIds] = useState(null) // Set de matrículas liberadas · null = carregando
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    supabase.rpc('desafios_admin_pessoas_do', { p_treino: treino.id }).then(({ data }) => {
      if (ativo) setIds(new Set(data || []))
    })
    return () => {
      ativo = false
    }
  }, [treino.id])

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const base = !t
      ? pessoas
      : pessoas.filter((p) =>
          [p.nome, p.cargo, p.unidade, p.matricula].some((v) =>
            String(v || '').toLowerCase().includes(t),
          ),
        )
    return [...base].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
  }, [pessoas, busca])

  function toggle(mat) {
    tapHaptic()
    setIds((prev) => {
      const n = new Set(prev)
      n.has(mat) ? n.delete(mat) : n.add(mat)
      return n
    })
  }

  async function salvar() {
    setSalvando(true)
    const { error } = await supabase.rpc('desafios_admin_set_pessoas', {
      p_treino: treino.id,
      p_matriculas: [...ids],
    })
    setSalvando(false)
    if (!error) onSalvo(ids.size)
  }

  const n = ids?.size ?? 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Cabeçalho */}
      <div className="safe-top shrink-0 border-b border-line bg-surface">
        <div className="hstack gap-3 px-5 py-3">
          <button onClick={onFechar} className="shrink-0 text-muted tap" aria-label="Fechar">
            <X size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-bold">{treino.titulo}</div>
            <div className="truncate text-xs text-muted">{treino.trilha}</div>
          </div>
        </div>
      </div>

      {/* Corpo */}
      {ids === null ? (
        <div className="hstack flex-1 justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="shrink-0 px-5 pt-4">
            <div
              className={cn(
                'rounded-card border px-3.5 py-3 text-xs',
                n > 0 ? 'border-accent/30 bg-accent-soft text-accent' : 'border-line bg-surface text-muted',
              )}
            >
              {n > 0 ? (
                <span>
                  <b>{n}</b> {n === 1 ? 'pessoa liberada' : 'pessoas liberadas'} — só {n === 1 ? 'ela' : 'elas'}{' '}
                  {n === 1 ? 'vê' : 'veem'} este desafio.
                </span>
              ) : (
                <span>
                  Ninguém marcado — <b className="text-text">todos os colaboradores</b> veem este desafio.
                </span>
              )}
            </div>
            {treino.outras_regras && (
              <p className="mt-2 px-1 text-[11px] text-muted-2">
                Este desafio também tem regras por unidade/departamento — elas continuam valendo além
                das pessoas marcadas aqui.
              </p>
            )}
            <div className="mt-3">
              <div className="hstack gap-2 rounded-card bg-surface-2 px-3 py-2">
                <Search size={16} className="shrink-0 text-muted-2" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, cargo, loja…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            <div className="flex flex-col gap-2">
              {filtradas.map((p) => {
                const on = ids.has(p.matricula)
                return (
                  <button key={p.matricula} onClick={() => toggle(p.matricula)} className="tap text-left">
                    <Card className="hstack items-center gap-3 !py-2.5">
                      <Avatar name={p.nome} src={p.avatar_url} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{p.nome}</div>
                        <div className="truncate text-xs text-muted">
                          {p.cargo}
                          {p.unidade ? ` · ${p.unidade}` : ''}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                          on ? 'border-accent bg-accent text-black' : 'border-line text-transparent',
                        )}
                      >
                        <Check size={15} strokeWidth={3} />
                      </span>
                    </Card>
                  </button>
                )
              })}
              {filtradas.length === 0 && (
                <div className="card p-8 text-center text-sm text-muted">
                  Ninguém encontrado com “{busca}”.
                </div>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="safe-bottom shrink-0 border-t border-line bg-surface px-5 py-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className={cn('btn-primary w-full !py-3.5', salvando && 'opacity-60')}
            >
              {salvando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : n > 0 ? (
                `Salvar (${n} ${n === 1 ? 'pessoa' : 'pessoas'})`
              ) : (
                'Salvar (todos veem)'
              )}
            </button>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}

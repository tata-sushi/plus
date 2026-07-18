import { useCallback, useEffect, useState } from 'react'
import { Plus, Loader2, X, Check, Pencil, Trash2 } from 'lucide-react'
import { Section } from './Section.jsx'
import { resolveIcon } from '../lib/icons.js'
import { REGRAS_EMBLEMA } from '../lib/emblemas.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { supabase } from '../lib/supabase.js'

const inputCls =
  'w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2'

const vazio = {
  id: null,
  titulo: '',
  descricao: '',
  icone: 'Award',
  regra: 'pontos',
  valor: '',
  alvo: '',
  so_lider: false,
  ativo: true,
  ordem: 0,
}

// Resumo curto da regra de um emblema (para a lista).
function resumoRegra(e) {
  const r = REGRAS_EMBLEMA.find((x) => x.v === e.regra)
  if (!r) return e.regra
  if (r.trilha) return `100% · ${e.alvo || '—'}`
  if (r.numero) return `${r.label} ${e.valor ?? '—'}`
  return r.label
}

export function AdminConquistas() {
  const [itens, setItens] = useState([])
  const [trilhas, setTrilhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('admin_listar_emblemas')
    setItens(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
    supabase.rpc('admin_trilhas').then(({ data }) => setTrilhas((data || []).map((t) => t.nome)))
  }, [carregar])

  const regraAtual = REGRAS_EMBLEMA.find((r) => r.v === editando?.regra)

  function abrir(item) {
    tapHaptic()
    setErro('')
    setEditando(
      item
        ? {
            id: item.id,
            titulo: item.titulo || '',
            descricao: item.descricao || '',
            icone: item.icone || 'Award',
            regra: item.regra || 'pontos',
            valor: item.valor == null ? '' : String(item.valor),
            alvo: item.alvo || '',
            so_lider: item.so_lider,
            ativo: item.ativo,
            ordem: item.ordem ?? 0,
          }
        : { ...vazio },
    )
  }

  const podeSalvar = !!editando && editando.titulo.trim() !== '' && !salvando

  async function salvar() {
    if (!podeSalvar) return
    tapHaptic()
    setSalvando(true)
    setErro('')
    const { error } = await supabase.rpc('admin_salvar_emblema', {
      p_id: editando.id,
      p_titulo: editando.titulo.trim(),
      p_descricao: editando.descricao.trim() || null,
      p_icone: editando.icone.trim() || 'Award',
      p_regra: editando.regra,
      p_valor: editando.valor === '' ? null : parseInt(editando.valor, 10) || 0,
      p_alvo: editando.regra === 'trilha_100' ? editando.alvo || null : null,
      p_so_lider: editando.so_lider,
      p_ativo: editando.ativo,
      p_ordem: parseInt(editando.ordem, 10) || 0,
    })
    setSalvando(false)
    if (error) {
      setErro('Não foi possível salvar. Tente novamente.')
      return
    }
    setEditando(null)
    setCarregando(true)
    carregar()
  }

  async function alternarAtivo(item) {
    tapHaptic()
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i)))
    const { error } = await supabase.rpc('admin_salvar_emblema', {
      p_id: item.id,
      p_titulo: item.titulo,
      p_descricao: item.descricao,
      p_icone: item.icone,
      p_regra: item.regra,
      p_valor: item.valor,
      p_alvo: item.alvo,
      p_so_lider: item.so_lider,
      p_ativo: !item.ativo,
      p_ordem: item.ordem,
    })
    if (error) setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: item.ativo } : i)))
  }

  async function excluir(item) {
    tapHaptic()
    const { error } = await supabase.rpc('admin_excluir_emblema', { p_id: item.id })
    setExcluindo(null)
    if (!error) setItens((prev) => prev.filter((i) => i.id !== item.id))
  }

  return (
    <>
      <div className="hstack gap-2 px-5 pt-4">
        <button onClick={() => abrir(null)} className="btn-primary shrink-0 !px-3 !py-2 text-xs">
          <Plus size={15} /> Novo
        </button>
        <span className="text-xs text-muted-2">Emblemas da área de Conquistas</span>
      </div>

      {carregando ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <Section className="mt-4" title={`Emblemas (${itens.length})`}>
          <div className="flex flex-col gap-2.5">
            {itens.map((item) => {
              const Icon = resolveIcon(item.icone)
              return (
                <div key={item.id} className={cn('card !p-3', !item.ativo && 'opacity-60')}>
                  <div className="hstack gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="hstack gap-1.5">
                        <span className="truncate text-sm font-semibold">{item.titulo}</span>
                        {item.so_lider && (
                          <span className="pill bg-surface-2 text-[10px] text-muted">líder</span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-muted">{resumoRegra(item)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => abrir(item)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted tap"
                        aria-label="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setExcluindo(item)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-2 tap"
                        aria-label="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => alternarAtivo(item)}
                        className={cn(
                          'relative h-6 w-10 shrink-0 rounded-full transition-colors tap',
                          item.ativo ? 'bg-accent' : 'bg-surface-2',
                        )}
                        aria-label={item.ativo ? 'Desativar' : 'Ativar'}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                            item.ativo ? 'left-[18px]' : 'left-0.5',
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Editor */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-card border border-line bg-surface">
            <div className="hstack justify-between border-b border-line px-5 py-3.5">
              <div className="font-display text-base font-bold">
                {editando.id ? 'Editar emblema' : 'Novo emblema'}
              </div>
              <button onClick={() => setEditando(null)} className="text-muted tap" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Título
              </label>
              <input
                value={editando.titulo}
                onChange={(e) => setEditando((s) => ({ ...s, titulo: e.target.value }))}
                placeholder="Ex.: Usuário Ouro"
                className={cn(inputCls, 'mt-1.5')}
              />

              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Descrição <span className="normal-case text-muted-2">(o que representa)</span>
              </label>
              <input
                value={editando.descricao}
                onChange={(e) => setEditando((s) => ({ ...s, descricao: e.target.value }))}
                placeholder="Ex.: Atingir 10.000 pontos"
                className={cn(inputCls, 'mt-1.5')}
              />

              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Ícone <span className="normal-case text-muted-2">(nome lucide)</span>
              </label>
              <div className="mt-1.5 hstack gap-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  {(() => {
                    const I = resolveIcon(editando.icone)
                    return <I size={18} />
                  })()}
                </span>
                <input
                  value={editando.icone}
                  onChange={(e) => setEditando((s) => ({ ...s, icone: e.target.value }))}
                  placeholder="Award, Trophy, Cake, Heart…"
                  className={inputCls}
                />
              </div>

              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Condição
              </label>
              <select
                value={editando.regra}
                onChange={(e) => setEditando((s) => ({ ...s, regra: e.target.value }))}
                className={cn(inputCls, 'mt-1.5')}
              >
                {REGRAS_EMBLEMA.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.label}
                  </option>
                ))}
              </select>

              {regraAtual?.numero && (
                <input
                  value={editando.valor}
                  onChange={(e) =>
                    setEditando((s) => ({ ...s, valor: e.target.value.replace(/\D/g, '') }))
                  }
                  inputMode="numeric"
                  placeholder="Valor (ex.: 1000)"
                  className={cn(inputCls, 'mt-2')}
                />
              )}

              {regraAtual?.trilha && (
                <select
                  value={editando.alvo}
                  onChange={(e) => setEditando((s) => ({ ...s, alvo: e.target.value }))}
                  className={cn(inputCls, 'mt-2')}
                >
                  <option value="">Selecione a trilha…</option>
                  {trilhas.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Ordem
                  </label>
                  <input
                    value={editando.ordem}
                    onChange={(e) =>
                      setEditando((s) => ({ ...s, ordem: e.target.value.replace(/\D/g, '') }))
                    }
                    inputMode="numeric"
                    className={cn(inputCls, 'mt-1.5')}
                  />
                </div>
                <button
                  onClick={() => setEditando((s) => ({ ...s, so_lider: !s.so_lider }))}
                  className="mt-6 hstack justify-between rounded-card border border-line bg-surface px-3 py-3 tap"
                >
                  <span className="text-sm font-semibold">Só líderes</span>
                  <span
                    className={cn(
                      'relative h-6 w-10 shrink-0 rounded-full transition-colors',
                      editando.so_lider ? 'bg-accent' : 'bg-surface-2',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                        editando.so_lider ? 'left-[18px]' : 'left-0.5',
                      )}
                    />
                  </span>
                </button>
              </div>

              <button
                onClick={() => setEditando((s) => ({ ...s, ativo: !s.ativo }))}
                className="mt-3 hstack w-full justify-between rounded-card border border-line bg-surface px-4 py-3 tap"
              >
                <div className="text-left">
                  <div className="text-sm font-semibold">Ativo</div>
                  <div className="text-[11px] text-muted">
                    {editando.ativo ? 'Visível na área de Conquistas' : 'Oculto'}
                  </div>
                </div>
                <span
                  className={cn(
                    'relative h-6 w-10 shrink-0 rounded-full transition-colors',
                    editando.ativo ? 'bg-accent' : 'bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                      editando.ativo ? 'left-[18px]' : 'left-0.5',
                    )}
                  />
                </span>
              </button>

              {erro && <div className="mt-3 text-xs font-medium text-danger">{erro}</div>}
            </div>

            <div className="hstack gap-2 border-t border-line px-5 py-3.5">
              <button
                onClick={() => setEditando(null)}
                disabled={salvando}
                className="btn-ghost flex-1 !py-3 text-sm text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!podeSalvar}
                className={cn('btn-primary flex-1 !py-3 text-sm', !podeSalvar && 'opacity-50')}
              >
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {excluindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-5">
            <div className="font-display text-base font-bold leading-tight">Excluir emblema?</div>
            <p className="mt-2 text-sm text-muted">
              <span className="font-semibold text-text">{excluindo.titulo}</span> será removido da
              área de Conquistas.
            </p>
            <div className="mt-4 hstack gap-2">
              <button
                onClick={() => setExcluindo(null)}
                className="btn-ghost flex-1 !py-2.5 text-sm text-muted"
              >
                Voltar
              </button>
              <button
                onClick={() => excluir(excluindo)}
                className="flex-1 rounded-card bg-danger !py-2.5 text-sm font-semibold text-white tap"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

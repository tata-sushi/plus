import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Search, ChevronRight, ChevronDown, Check, ShieldCheck, X, Layers, KeyRound, Info, ShieldOff } from 'lucide-react'
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
// (liberadas por padrão; toque pra bloquear) e os botões da barra lateral
// (ocultos por padrão; toque pra liberar pra esta pessoa).
function EditorPessoa({ pessoa, scope = 'governanca', catalogo, catalogoAbas, onFechar, onSalvo }) {
  const ehApp = scope === 'app'
  const grupos = useMemo(() => agrupar(catalogo), [catalogo])
  // Ids de página dentro do escopo aberto (p/ contar no rodapé sem misturar escopos).
  const escopoPaginaIds = useMemo(() => new Set((catalogo || []).map((p) => p.pagina_id)), [catalogo])
  // Agrupa por página e separa em abas (tipo='aba'), botões (tipo='botao') e
  // valores (tipo='valor' — o aba_id É a área consultada em pode_ver_valores).
  const itensPorPagina = useMemo(() => {
    const m = {}
    for (const a of catalogoAbas || []) {
      const bucket = m[a.pagina_id] || (m[a.pagina_id] = { abas: [], botoes: [], valores: [] })
      if (a.tipo === 'botao') bucket.botoes.push(a)
      else if (a.tipo === 'valor') bucket.valores.push(a)
      else bucket.abas.push(a)
    }
    return m
  }, [catalogoAbas])

  // Chaves de "valor" do catálogo (as áreas que este editor gerencia em
  // dp_rh.perm_ver_valores — não toca em 'geral' nem em áreas de fora).
  const valorKeys = useMemo(
    () => (catalogoAbas || []).filter((a) => a.tipo === 'valor').map((a) => a.aba_id),
    [catalogoAbas],
  )

  const [ids, setIds] = useState(null) // Set de pagina_id · null = carregando
  const [bloqueadas, setBloqueadas] = useState(new Set()) // aba_id bloqueada (abas · opt-out)
  const [liberados, setLiberados] = useState(new Set()) // aba_id de botão liberado (botões · opt-in)
  const [abasAbertas, setAbasAbertas] = useState(new Set()) // pagina_id com abas expandidas
  const [botoesAbertas, setBotoesAbertas] = useState(new Set()) // pagina_id com botões expandidos
  const [gruposAbertos, setGruposAbertos] = useState(null) // Set de "secao›sub" expandidos · null = ainda não inicializado
  const [salvando, setSalvando] = useState(false)

  // Valores (R$): liberação POR PÁGINA. Guarda as áreas ligadas do catálogo
  // (tipo='valor'); persiste em dp_rh.perm_ver_valores no "Salvar acesso".
  const [valoresLib, setValoresLib] = useState(new Set()) // aba_id/área liberada
  const [valoresAbertas, setValoresAbertas] = useState(new Set()) // pagina_id expandida

  // Reset de senha (admin): volta pra padrão tata@123 e força troca no próximo login.
  const [reset, setReset] = useState({ fase: 'idle' }) // idle | confirm | loading | done | error
  async function resetarSenha() {
    setReset({ fase: 'loading' })
    try {
      const { error } = await supabase.rpc('admin_resetar_senha', { p_matricula: pessoa.matricula })
      if (error) throw error
      tapHaptic()
      setReset({ fase: 'done' })
    } catch (e) {
      setReset({ fase: 'error', msg: e?.message || 'Não foi possível resetar a senha.' })
    }
  }

  // Desativar todos os acessos: zera páginas, botões, bloqueios de aba e valores
  // da pessoa numa tacada só (ex.: desligamento / troca de função).
  const [zerar, setZerar] = useState({ fase: 'idle' }) // idle | confirm | loading | error
  async function zerarAcessos() {
    setZerar({ fase: 'loading' })
    const { error } = await supabase.rpc('gov_admin_zerar_acessos', { p_matricula: pessoa.matricula })
    if (error) {
      setZerar({ fase: 'error', msg: error.message || 'Não foi possível desativar os acessos.' })
      return
    }
    tapHaptic()
    setIds(new Set())
    setBloqueadas(new Set())
    setLiberados(new Set())
    setValoresLib(new Set())
    onSalvo({ total: 0, escopo: 0 })
  }

  // Contagem pro rodapé: abas desligadas (opt-out), botões e valores liberados.
  const contagem = useMemo(() => {
    let abasOff = 0
    for (const item of catalogoAbas || []) {
      if (item.tipo === 'aba' && bloqueadas.has(item.aba_id)) abasOff++
    }
    return { abasOff, botoesOn: liberados.size, valoresOn: valoresLib.size }
  }, [catalogoAbas, bloqueadas, liberados, valoresLib])

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.rpc('gov_admin_acessos', { p_matricula: pessoa.matricula }),
      supabase.rpc('gov_admin_abas_bloqueios', { p_matricula: pessoa.matricula }),
      supabase.rpc('gov_admin_botoes_liberados', { p_matricula: pessoa.matricula }),
    ]).then(([ac, bl, lb]) => {
      if (!ativo) return
      // bloqueadas guarda só abas (botões usam a allowlist `liberados`).
      const abaIds = new Set(
        (catalogoAbas || []).filter((a) => a.tipo !== 'botao').map((a) => a.aba_id),
      )
      setIds(new Set((ac.data || []).map((r) => r.pagina_id)))
      setBloqueadas(new Set((bl.data || []).map((r) => r.aba_id).filter((id) => abaIds.has(id))))
      setLiberados(new Set((lb.data || []).map((r) => r.aba_id)))
    })
    return () => {
      ativo = false
    }
  }, [pessoa.matricula])

  // Carrega as liberações de valores por área (só governança). Mantém só as
  // áreas do catálogo (ignora 'geral' e áreas de fora, que não são geridas aqui).
  useEffect(() => {
    if (ehApp) return
    let ativo = true
    supabase.rpc('perm_valores_areas', { p_matricula: pessoa.matricula }).then(({ data }) => {
      if (!ativo) return
      const cat = new Set(valorKeys)
      setValoresLib(new Set((data || []).map((r) => r.area).filter((a) => cat.has(a))))
    })
    return () => {
      ativo = false
    }
  }, [pessoa.matricula, ehApp, valorKeys])

  function toggleValor(abaId) {
    tapHaptic()
    setValoresLib((prev) => {
      const n = new Set(prev)
      n.has(abaId) ? n.delete(abaId) : n.add(abaId)
      return n
    })
  }

  function toggleValoresAbertas(paginaId) {
    tapHaptic()
    setValoresAbertas((prev) => {
      const n = new Set(prev)
      n.has(paginaId) ? n.delete(paginaId) : n.add(paginaId)
      return n
    })
  }

  // Inicializa os grupos expandidos assim que os acessos carregam: abre só as
  // seções que já têm alguma página liberada (ou a única seção, no escopo App).
  useEffect(() => {
    if (ids === null || gruposAbertos !== null) return
    // Começa SEMPRE recolhido; só o escopo App (grupo único) já abre.
    const abertos = new Set()
    if (grupos.length === 1 && grupos[0]) abertos.add(`${grupos[0].secao}›${grupos[0].sub}`)
    setGruposAbertos(abertos)
  }, [ids, grupos, gruposAbertos])

  function toggleGrupoAberto(chave) {
    tapHaptic()
    setGruposAbertos((prev) => {
      const n = new Set(prev || [])
      n.has(chave) ? n.delete(chave) : n.add(chave)
      return n
    })
  }

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

  function toggleBotao(abaId) {
    tapHaptic()
    setLiberados((prev) => {
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

  function toggleBotoesAbertas(paginaId) {
    tapHaptic()
    setBotoesAbertas((prev) => {
      const n = new Set(prev)
      n.has(paginaId) ? n.delete(paginaId) : n.add(paginaId)
      return n
    })
  }

  async function salvar() {
    setSalvando(true)
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.rpc('gov_admin_set', { p_matricula: pessoa.matricula, p_pagina_ids: [...ids] }),
      supabase.rpc('gov_admin_abas_set', {
        p_matricula: pessoa.matricula,
        p_aba_ids: [...bloqueadas],
      }),
      supabase.rpc('gov_admin_botoes_set', {
        p_matricula: pessoa.matricula,
        p_aba_ids: [...liberados],
      }),
      supabase.rpc('perm_valores_sync', {
        p_matricula: pessoa.matricula,
        p_on: [...valoresLib],
        p_cat: valorKeys,
      }),
    ])
    setSalvando(false)
    if (!r1.error && !r2.error && !r3.error && !r4.error) {
      const escopo = [...ids].filter((id) => escopoPaginaIds.has(id)).length
      onSalvo({ total: ids.size, escopo })
    }
  }

  // Bloco recolhível de abas ou botões dentro de uma página. Mesma UX pros dois —
  // muda só o rótulo e a concordância de gênero na contagem.
  function BlocoToggles({ tipo, itens, aberto, onToggleAberto }) {
    if (!itens || itens.length === 0) return null
    const isBotao = tipo === 'botao'
    const isValor = tipo === 'valor'
    // Botões e valores: opt-in (começam desligados). Abas: opt-out.
    const optIn = isBotao || isValor
    const estaOn = (id) =>
      isValor ? valoresLib.has(id) : isBotao ? liberados.has(id) : !bloqueadas.has(id)
    const onToggle = isValor ? toggleValor : isBotao ? toggleBotao : toggleAba
    const label = isValor ? 'Valores' : isBotao ? 'Botões' : 'Abas'
    const qtdOn = itens.filter((a) => estaOn(a.aba_id)).length
    const qtdOff = itens.length - qtdOn
    // Opt-in (botões/valores) mostra quantos estão liberados (verde); abas,
    // quantas estão desligadas (vermelho).
    const badge = optIn
      ? qtdOn > 0 && { txt: `${qtdOn} liberado${qtdOn > 1 ? 's' : ''}`, cls: 'bg-accent/15 text-accent' }
      : qtdOff > 0 && {
          txt: `${qtdOff} desligada${qtdOff > 1 ? 's' : ''}`,
          cls: 'bg-danger/15 text-danger',
        }
    return (
      <div className="px-4 pb-3 pl-12">
        <button
          onClick={onToggleAberto}
          className="hstack w-full gap-2 py-1 text-left tap [&>*]:pointer-events-none"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">
            {label}
          </span>
          {badge && (
            <span
              className={cn('rounded-pill px-1.5 py-0.5 text-[9px] font-bold uppercase', badge.cls)}
            >
              {badge.txt}
            </span>
          )}
          {optIn && qtdOn === 0 && (
            <span className="rounded-pill bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-2">
              oculto por padrão
            </span>
          )}
          <span className="flex-1" />
          <ChevronDown
            size={14}
            className={cn('shrink-0 text-muted-2 transition-transform', aberto && 'rotate-180')}
          />
        </button>
        {aberto && (
          <div className="mt-1 flex flex-col divide-y divide-line rounded-card border border-line">
            {itens.map((a) => {
              const on = estaOn(a.aba_id)
              return (
                <div key={a.aba_id} className="hstack gap-3 px-3 py-2">
                  <span className={cn('flex-1 text-[13px] font-medium', !on && 'text-muted-2')}>
                    {a.label}
                  </span>
                  <button
                    onClick={() => onToggle(a.aba_id)}
                    className={cn(
                      'relative h-6 w-10 shrink-0 rounded-full transition-colors tap',
                      on ? 'bg-accent' : 'bg-surface-2',
                    )}
                    aria-label={
                      isValor
                        ? on
                          ? `Ocultar valores: ${a.label}`
                          : `Liberar valores: ${a.label}`
                        : isBotao
                          ? on
                            ? `Ocultar botão: ${a.label}`
                            : `Liberar botão: ${a.label}`
                          : on
                            ? `Desligar acesso: ${a.label}`
                            : `Ligar acesso: ${a.label}`
                    }
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                        on ? 'left-[18px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Cabeçalho */}
      <div className="safe-top shrink-0 border-b border-line bg-surface">
        <div className="hstack gap-3 px-5 py-3">
          <button onClick={onFechar} className="shrink-0 text-muted tap" aria-label="Fechar">
            <X size={22} />
          </button>
          <Avatar name={pessoa.nome} src={pessoa.avatar_url} size={38} />
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
        {!ehApp && pessoa.is_admin ? (
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
              const chave = `${g.secao}›${g.sub}`
              const marcados = g.itens.filter((p) => ids.has(p.pagina_id)).length
              const todos = marcados === g.itens.length
              const aberto = gruposAbertos
                ? gruposAbertos.has(chave)
                : grupos.length === 1
              return (
                <div key={chave}>
                  {/* Cabeçalho: recolher/expandir + "marcar tudo" (badge) */}
                  <div className="hstack items-center gap-2 px-1 pb-2">
                    <button
                      onClick={() => toggleGrupoAberto(chave)}
                      className="hstack min-w-0 flex-1 items-center gap-2 text-left tap"
                    >
                      <ChevronDown
                        size={14}
                        className={cn('shrink-0 text-muted-2 transition-transform', !aberto && '-rotate-90')}
                      />
                      <Layers size={13} className="shrink-0 text-muted-2" />
                      <span className="truncate text-[11px] font-bold uppercase tracking-widest text-muted">
                        {g.secao}
                        {g.sub ? ` · ${g.sub}` : ''}
                      </span>
                    </button>
                    <button
                      onClick={() => toggleGrupo(g.itens, todos)}
                      className={cn(
                        'shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-semibold tap',
                        marcados > 0 ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted-2',
                      )}
                    >
                      {marcados}/{g.itens.length}
                    </button>
                  </div>

                  {aberto && (
                  <Card className="!p-0">
                    {g.itens.map((p, i) => {
                      const on = ids.has(p.pagina_id)
                      const bucket = itensPorPagina[p.pagina_id] || {
                        abas: [],
                        botoes: [],
                        valores: [],
                      }
                      const abas = bucket.abas
                      const botoes = bucket.botoes
                      const valores = bucket.valores
                      const totalItens = abas.length + botoes.length + valores.length
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
                            {totalItens > 0 && (
                              <span className="shrink-0 text-[10px] font-semibold text-muted-2">
                                {[
                                  abas.length > 0 && `${abas.length} aba${abas.length > 1 ? 's' : ''}`,
                                  botoes.length > 0 &&
                                    `${botoes.length} botão${botoes.length > 1 ? 'es' : ''}`,
                                  valores.length > 0 &&
                                    `${valores.length} valor${valores.length > 1 ? 'es' : ''}`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            )}
                          </button>

                          {/* Explicação da pontuação do Kanban — fica só aqui, no
                              painel do admin master (não vai pros treinamentos). */}
                          {p.pagina_id === 'governanca-app-quadros' && (
                            <div className="mx-4 mb-3 rounded-xl border border-line bg-surface-2/60 px-3.5 py-3 text-[11px] leading-relaxed text-muted">
                              <div className="hstack mb-1 gap-1.5 font-semibold text-text">
                                <Info size={13} className="shrink-0 text-accent" /> Como o Kanban pontua
                              </div>
                              <ul className="ml-3.5 list-disc space-y-0.5">
                                <li><b className="text-text">Colaborador:</b> +2 por tarefa que o líder validar.</li>
                                <li><b className="text-text">Líder do quadro:</b> +1 por entrega que ele validar.</li>
                                <li>Só pontua com o cartão tendo <b className="text-text">24h ou mais</b> desde a criação (evita criar e concluir na hora só pra pontuar).</li>
                                <li>Reabrir o cartão <b className="text-text">remove</b> os pontos.</li>
                                <li>Quadro novo <b className="text-text">já nasce pontuando</b>; o líder liga/desliga no menu do quadro.</li>
                              </ul>
                            </div>
                          )}

                          {/* Só quando a página está liberada: abas e botões
                              recolhíveis (começam guardados). Ligado = a pessoa
                              enxerga; desligado = bloqueado só pra ela. */}
                          {on && (
                            <>
                              <BlocoToggles
                                tipo="aba"
                                itens={abas}
                                aberto={abasAbertas.has(p.pagina_id)}
                                onToggleAberto={() => toggleAbasAbertas(p.pagina_id)}
                              />
                              <BlocoToggles
                                tipo="botao"
                                itens={botoes}
                                aberto={botoesAbertas.has(p.pagina_id)}
                                onToggleAberto={() => toggleBotoesAbertas(p.pagina_id)}
                              />
                              <BlocoToggles
                                tipo="valor"
                                itens={valores}
                                aberto={valoresAbertas.has(p.pagina_id)}
                                onToggleAberto={() => toggleValoresAbertas(p.pagina_id)}
                              />
                            </>
                          )}
                        </div>
                      )
                    })}
                  </Card>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Desativar todos os acessos — reset total da pessoa. Escondido pra admin
            de governança (o acesso dele vem do perfil, não das liberações). */}
        {(ehApp || !pessoa.is_admin) && ids !== null && (
          <Card className="mt-4">
            <div className="hstack gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
                <ShieldOff size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Desativar todos os acessos</div>
                <div className="text-xs text-muted">
                  Remove de uma vez todas as páginas, botões e valores desta pessoa.
                </div>
              </div>
            </div>
            <div className="mt-3">
              {zerar.fase === 'confirm' ? (
                <div className="hstack gap-2">
                  <button
                    onClick={zerarAcessos}
                    className="flex-1 rounded-lg bg-danger py-2 text-sm font-semibold text-white tap"
                  >
                    Confirmar — desativar tudo
                  </button>
                  <button
                    onClick={() => setZerar({ fase: 'idle' })}
                    className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted tap"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setZerar({ fase: 'confirm' })}
                  disabled={zerar.fase === 'loading'}
                  className="hstack w-full justify-center gap-2 rounded-lg border border-danger/40 py-2 text-sm font-semibold text-danger tap disabled:opacity-50"
                >
                  {zerar.fase === 'loading' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ShieldOff size={16} />
                  )}
                  Desativar todos os acessos
                </button>
              )}
              {zerar.fase === 'error' && (
                <div className="mt-2 text-xs font-medium text-danger">{zerar.msg}</div>
              )}
            </div>
          </Card>
        )}

        {/* Reset de senha — só no escopo "Aplicativo" (é ação do app, não governança) */}
        {ehApp && (
          <Card className="mt-4">
            <div className="hstack gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warn/15 text-warn">
                <KeyRound size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Resetar senha de acesso</div>
                <div className="text-xs text-muted">
                  A senha volta para a padrão <b className="text-text">tata@123</b>.
                </div>
              </div>
            </div>
            <div className="mt-3">
              {reset.fase === 'done' ? (
                <div className="hstack gap-2 text-sm font-semibold text-accent">
                  <Check size={16} /> Senha resetada para tata@123.
                </div>
              ) : reset.fase === 'confirm' ? (
                <div className="hstack gap-2">
                  <button onClick={resetarSenha} className="btn-primary flex-1 py-2 text-sm">
                    Confirmar reset
                  </button>
                  <button
                    onClick={() => setReset({ fase: 'idle' })}
                    className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted tap"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setReset({ fase: 'confirm' })}
                  disabled={reset.fase === 'loading'}
                  className="hstack w-full justify-center gap-2 rounded-lg border border-line py-2 text-sm font-semibold tap disabled:opacity-50"
                >
                  {reset.fase === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Resetar senha para padrão
                </button>
              )}
              {reset.fase === 'error' && <div className="mt-2 text-xs font-medium text-danger">{reset.msg}</div>}
            </div>
          </Card>
        )}
      </div>

      {/* Rodapé */}
      {(ehApp || !pessoa.is_admin) && ids !== null && (
        <div className="safe-bottom shrink-0 border-t border-line bg-surface px-5 py-3">
          <button
            onClick={salvar}
            disabled={salvando}
            className={cn('btn-primary w-full !py-3.5', salvando && 'opacity-60')}
          >
            {salvando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              (() => {
                const n = [...ids].filter((id) => escopoPaginaIds.has(id)).length
                const palavra = ehApp
                  ? n === 1 ? 'recurso' : 'recursos'
                  : n === 1 ? 'página' : 'páginas'
                // abas/botões só existem nas páginas de governança — não no escopo App.
                const extra = ehApp
                  ? ''
                  : `${contagem.abasOff ? ` · ${contagem.abasOff} aba(s) off` : ''}${
                      contagem.botoesOn ? ` · ${contagem.botoesOn} botão(ões) liberado(s)` : ''
                    }${contagem.valoresOn ? ` · ${contagem.valoresOn} valor(es)` : ''}`
                return `Salvar acesso (${n} ${palavra}${extra})`
              })()
            )}
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

// Seção de acesso do painel admin. Dois escopos, mesma máquina:
//  · scope='governanca' → páginas do portal de líderes (seção ≠ App).
//    Admin enxerga tudo automaticamente (bypass).
//  · scope='app' → recursos do próprio app (seção 'App': Kanban, Escala,
//    Limpeza) + reset de senha. Não há bypass: até admin precisa de liberação.
// O editor sempre carrega/salva o conjunto COMPLETO de acessos; o escopo só
// muda o que aparece — então separar as telas nunca apaga o acesso do outro lado.
export function AdminGovernanca({ scope = 'governanca' }) {
  const ehApp = scope === 'app'
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

  // Catálogo do escopo: App traz só a seção 'App'; governança, todo o resto.
  const catalogoEscopo = useMemo(
    () => catalogo.filter((p) => (ehApp ? p.secao === 'App' : p.secao !== 'App')),
    [catalogo, ehApp],
  )

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

  const comAcesso = (pessoas || []).filter((p) =>
    ehApp ? (p.qtd_app || 0) > 0 : p.is_admin || (p.qtd_gov || 0) > 0,
  ).length

  function aoSalvar(matricula, { total, escopo }) {
    const campo = ehApp ? 'qtd_app' : 'qtd_gov'
    setPessoas((prev) =>
      prev.map((p) => (p.matricula === matricula ? { ...p, qtd: total, [campo]: escopo } : p)),
    )
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
          {ehApp
            ? `${comAcesso} com acesso · ${catalogoEscopo.length} recursos do app`
            : `${comAcesso} com acesso · ${catalogoEscopo.length} páginas no catálogo`}
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
                <Avatar name={p.nome} src={p.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.nome}</div>
                  <div className="truncate text-xs text-muted">
                    {p.cargo}
                    {p.unidade ? ` · ${p.unidade}` : ''}
                  </div>
                </div>
                {!ehApp && p.is_admin ? (
                  <span className="pill shrink-0 bg-accent-soft text-[10px] uppercase text-accent">
                    <ShieldCheck size={11} /> Vê tudo
                  </span>
                ) : (ehApp ? p.qtd_app || 0 : p.qtd_gov || 0) > 0 ? (
                  <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
                    {ehApp ? p.qtd_app : p.qtd_gov}
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
          scope={scope}
          catalogo={catalogoEscopo}
          catalogoAbas={catalogoAbas}
          onFechar={() => setSel(null)}
          onSalvo={(dados) => aoSalvar(sel.matricula, dados)}
        />
      )}
    </>
  )
}

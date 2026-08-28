import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Package, Archive, ArchiveRestore, ChevronLeft, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

const fmtBRL = (c) => (Number(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// "49,90" / "49.90" → centavos
function parseCentavos(txt) {
  const s = String(txt || '')
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
const centavosParaInput = (c) => (Number(c || 0) / 100).toFixed(2).replace('.', ',')

const VAZIO = {
  id: null,
  titulo: '',
  descricao: '',
  detalhes: '',
  precoInput: '',
  tamanhosInput: '',
  estoque: '',
  emoji: '',
  imagens: [],
  ativo: true,
  ordem: '',
}

const ST_PEDIDO = {
  solicitado: { label: 'Solicitado', cls: 'bg-warn/15 text-warn' },
  separado: { label: 'Separado', cls: 'bg-accent-soft text-accent' },
  entregue: { label: 'Entregue', cls: 'bg-accent-soft text-accent' },
  cancelado: { label: 'Cancelado', cls: 'bg-danger/15 text-danger' },
}
const ORDEM_STATUS = ['solicitado', 'separado', 'entregue', 'cancelado']

const labelCls = 'block text-[11px] font-semibold uppercase tracking-widest text-muted'
const inputCls =
  'mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2'

export function AdminLojinha() {
  const [tab, setTab] = useState('produtos') // produtos | pedidos
  const [produtos, setProdutos] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const inputFoto = useRef(null)
  const [slotAlvo, setSlotAlvo] = useState(0)
  const [arquivos, setArquivos] = useState([null, null])
  const [previews, setPreviews] = useState([null, null])

  function limparFoto() {
    setArquivos([null, null])
    setPreviews((ps) => {
      ps.forEach((u) => u && URL.revokeObjectURL(u))
      return [null, null]
    })
  }
  function abrirFoto(i) {
    setSlotAlvo(i)
    inputFoto.current?.click()
  }
  function escolherFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setErro('Selecione uma imagem.')
      return
    }
    if (f.size > 15 * 1024 * 1024) {
      setErro('Imagem muito grande (máx. 15 MB).')
      return
    }
    setErro('')
    const url = URL.createObjectURL(f)
    setArquivos((a) => {
      const n = a.slice()
      n[slotAlvo] = f
      return n
    })
    setPreviews((p) => {
      const n = p.slice()
      if (n[slotAlvo]) URL.revokeObjectURL(n[slotAlvo])
      n[slotAlvo] = url
      return n
    })
  }
  function removerFoto(i) {
    setArquivos((a) => {
      const n = a.slice()
      n[i] = null
      return n
    })
    setPreviews((p) => {
      const n = p.slice()
      if (n[i]) URL.revokeObjectURL(n[i])
      n[i] = null
      return n
    })
    setEditando((s) => {
      const im = (s.imagens || []).slice()
      im[i] = null
      return { ...s, imagens: im }
    })
  }

  const carregar = useCallback(async () => {
    const [pr, pe] = await Promise.all([
      supabase.rpc('admin_listar_loja_produtos'),
      supabase.rpc('admin_listar_loja_pedidos'),
    ])
    setProdutos(pr.data || [])
    setPedidos(pe.data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function novo() {
    tapHaptic()
    setErro('')
    limparFoto()
    setEditando({ ...VAZIO })
  }
  function editar(p) {
    tapHaptic()
    setErro('')
    limparFoto()
    setEditando({
      id: p.id,
      titulo: p.titulo || '',
      descricao: p.descricao || '',
      detalhes: p.detalhes || '',
      precoInput: centavosParaInput(p.preco_centavos),
      tamanhosInput: (p.tamanhos || []).join(', '),
      estoque: p.estoque == null ? '' : String(p.estoque),
      emoji: p.emoji || '',
      imagens: p.imagens || [],
      ativo: p.ativo,
      ordem: p.ordem == null ? '' : String(p.ordem),
    })
  }

  async function salvar() {
    if (!editando.titulo.trim()) {
      setErro('Informe o título.')
      return
    }
    setSalvando(true)
    setErro('')

    // sobe as fotos anexadas (até 2); mantém as existentes que não foram trocadas
    const imgs = []
    for (let i = 0; i < 2; i++) {
      if (arquivos[i]) {
        const ext = (arquivos[i].name.split('.').pop() || 'jpg').toLowerCase()
        const caminho = `loja/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('recompensas')
          .upload(caminho, arquivos[i], { cacheControl: '3600', contentType: arquivos[i].type })
        if (upErr) {
          setSalvando(false)
          setErro('Não foi possível enviar a foto.')
          return
        }
        imgs[i] = supabase.storage.from('recompensas').getPublicUrl(caminho).data.publicUrl
      } else if (editando.imagens?.[i]) {
        imgs[i] = editando.imagens[i]
      }
    }
    const imagens = imgs.filter(Boolean)

    const tamanhos = editando.tamanhosInput
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
    const { error } = await supabase.rpc('admin_salvar_loja_produto', {
      p_id: editando.id,
      p_titulo: editando.titulo,
      p_descricao: editando.descricao,
      p_preco_centavos: parseCentavos(editando.precoInput),
      p_tamanhos: tamanhos,
      p_estoque: editando.estoque === '' ? null : Number(editando.estoque),
      p_emoji: editando.emoji,
      p_imagens: imagens,
      p_ativo: editando.ativo,
      p_ordem: editando.ordem === '' ? 0 : Number(editando.ordem),
      p_detalhes: editando.detalhes,
    })
    setSalvando(false)
    if (error) {
      setErro('Não foi possível salvar. Tente de novo.')
      return
    }
    limparFoto()
    setEditando(null)
    carregar()
  }

  async function arquivar(p, arquivarFlag) {
    tapHaptic()
    setProdutos((prev) => prev.map((x) => (x.id === p.id ? { ...x, arquivado: arquivarFlag } : x)))
    await supabase.rpc('admin_arquivar_loja_produto', { p_id: p.id, p_arquivar: arquivarFlag })
    carregar()
  }

  async function mudarStatus(pd, status) {
    setPedidos((prev) => prev.map((x) => (x.id === pd.id ? { ...x, status } : x)))
    await supabase.rpc('admin_atualizar_loja_pedido', { p_id: pd.id, p_status: status })
  }

  // ── Formulário de produto ──────────────────────────────────────────────
  if (editando) {
    return (
      <div className="px-5 py-4">
        <button
          onClick={() => {
            limparFoto()
            setEditando(null)
          }}
          className="hstack gap-1 text-sm font-medium text-muted tap"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        <div className="mt-3 font-display text-lg font-bold">
          {editando.id ? 'Editar produto' : 'Novo produto'}
        </div>

        <div className="mt-4">
          <label className={labelCls}>Título</label>
          <input
            value={editando.titulo}
            onChange={(e) => setEditando((s) => ({ ...s, titulo: e.target.value }))}
            placeholder="Ex.: Camiseta Tatá"
            className={inputCls}
          />
        </div>

        {/* Fotos do produto (até 2) */}
        <label className={cn(labelCls, 'mt-4')}>
          Fotos <span className="normal-case text-muted-2">(até 2 — opcional; usa o emoji se não tiver)</span>
        </label>
        <input ref={inputFoto} type="file" accept="image/*" onChange={escolherFoto} className="hidden" />
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => {
            const src = previews[i] || editando.imagens?.[i]
            return (
              <div key={i}>
                <button
                  onClick={() => abrirFoto(i)}
                  className="grid aspect-square w-full place-items-center overflow-hidden rounded-card border border-dashed border-line bg-surface tap"
                >
                  {src ? (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="hstack gap-1.5 text-xs text-muted">
                      <Camera size={16} /> Foto {i + 1}
                    </span>
                  )}
                </button>
                {src && (
                  <button
                    onClick={() => removerFoto(i)}
                    className="mt-1 w-full text-center text-[11px] text-muted-2 tap"
                  >
                    Remover
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <label className={cn(labelCls, 'mt-4')}>
          Descrição <span className="normal-case text-muted-2">(opcional)</span>
        </label>
        <textarea
          value={editando.descricao}
          onChange={(e) => setEditando((s) => ({ ...s, descricao: e.target.value }))}
          placeholder="Resumo curto (aparece no card)…"
          rows={2}
          className={cn(inputCls, 'resize-none')}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Preço (R$)</label>
            <input
              value={editando.precoInput}
              onChange={(e) =>
                setEditando((s) => ({ ...s, precoInput: e.target.value.replace(/[^\d.,]/g, '') }))
              }
              inputMode="decimal"
              placeholder="49,90"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Estoque</label>
            <input
              value={editando.estoque}
              onChange={(e) => setEditando((s) => ({ ...s, estoque: e.target.value.replace(/\D/g, '') }))}
              inputMode="numeric"
              placeholder="Ilimitado"
              className={inputCls}
            />
          </div>
        </div>

        <label className={cn(labelCls, 'mt-4')}>
          Tamanhos <span className="normal-case text-muted-2">(separados por vírgula — vazio = único)</span>
        </label>
        <input
          value={editando.tamanhosInput}
          onChange={(e) => setEditando((s) => ({ ...s, tamanhosInput: e.target.value }))}
          placeholder="P, M, G, GG"
          className={inputCls}
        />

        <label className={cn(labelCls, 'mt-4')}>
          Detalhes <span className="normal-case text-muted-2">(opcional — aparece na janelinha)</span>
        </label>
        <textarea
          value={editando.detalhes}
          onChange={(e) => setEditando((s) => ({ ...s, detalhes: e.target.value }))}
          placeholder={'Retirada, prazo, observações…'}
          rows={3}
          className={cn(inputCls, 'resize-none')}
        />

        <div className="mt-4">
          <label className={labelCls}>Ordem</label>
          <input
            value={editando.ordem}
            onChange={(e) => setEditando((s) => ({ ...s, ordem: e.target.value.replace(/\D/g, '') }))}
            inputMode="numeric"
            placeholder="0"
            className={inputCls}
          />
        </div>

        <button
          onClick={() => setEditando((s) => ({ ...s, ativo: !s.ativo }))}
          className="mt-4 hstack w-full justify-between rounded-card border border-line bg-surface px-4 py-3 tap"
        >
          <div className="text-left">
            <div className="text-sm font-semibold">Disponível na lojinha</div>
            <div className="text-[11px] text-muted">
              {editando.ativo ? 'Visível pra todos' : 'Oculto — rascunho'}
            </div>
          </div>
          <span
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              editando.ativo ? 'bg-accent' : 'bg-surface-3',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                editando.ativo ? 'left-[22px]' : 'left-0.5',
              )}
            />
          </span>
        </button>

        {erro && <div className="mt-3 text-center text-xs font-medium text-danger">{erro}</div>}

        <button
          onClick={salvar}
          disabled={salvando}
          className={cn('btn-primary mt-5 w-full !py-3.5 text-sm', salvando && 'opacity-60')}
        >
          {salvando ? <Loader2 size={17} className="animate-spin" /> : 'Salvar produto'}
        </button>
      </div>
    )
  }

  // ── Lista (produtos / pedidos) ─────────────────────────────────────────
  return (
    <div className="px-5 py-4">
      {/* sub-abas */}
      <div className="hstack gap-2">
        {[
          ['produtos', 'Produtos'],
          ['pedidos', 'Pedidos'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold tap',
              tab === id ? 'bg-accent text-black' : 'bg-surface text-muted',
            )}
          >
            {label}
            {id === 'pedidos' && pedidos.some((p) => p.status === 'solicitado') && (
              <span className="ml-1.5 text-xs">
                ({pedidos.filter((p) => p.status === 'solicitado').length})
              </span>
            )}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : tab === 'produtos' ? (
        <>
          <button onClick={novo} className="btn-primary mt-4 hstack w-full justify-center gap-2 !py-3 text-sm">
            <Plus size={17} /> Novo produto
          </button>
          <div className="mt-4 flex flex-col gap-2.5">
            {produtos.length === 0 && (
              <div className="py-8 text-center text-sm text-muted">Nenhum produto ainda.</div>
            )}
            {produtos.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'card hstack gap-3 px-4 py-3',
                  p.arquivado && 'opacity-50',
                )}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent-soft text-accent">
                  {p.imagem_url ? (
                    <img src={p.imagem_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package size={18} />
                  )}
                </span>
                <button onClick={() => editar(p)} className="min-w-0 flex-1 text-left tap">
                  <div className="truncate text-sm font-semibold">{p.titulo}</div>
                  <div className="text-[11px] text-muted">
                    {fmtBRL(p.preco_centavos)}
                    {p.tamanhos?.length ? ` · ${p.tamanhos.join('/')}` : ''}
                    {!p.ativo ? ' · rascunho' : ''}
                    {p.arquivado ? ' · arquivado' : ''}
                  </div>
                </button>
                <button
                  onClick={() => arquivar(p, !p.arquivado)}
                  aria-label={p.arquivado ? 'Restaurar' : 'Arquivar'}
                  className="shrink-0 text-muted-2 tap"
                >
                  {p.arquivado ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {pedidos.length === 0 && (
            <div className="py-8 text-center text-sm text-muted">Nenhum pedido ainda.</div>
          )}
          {pedidos.map((pd) => {
            const st = ST_PEDIDO[pd.status] || ST_PEDIDO.solicitado
            return (
              <div key={pd.id} className="card px-4 py-3">
                <div className="hstack gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Package size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {pd.titulo}
                      {pd.tamanho ? ` · ${pd.tamanho}` : ''}
                    </div>
                    <div className="text-[11px] text-muted">
                      {pd.nome} · {fmtBRL(pd.preco_centavos)} ·{' '}
                      {new Date(pd.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span className={cn('pill text-[10px]', st.cls)}>{st.label}</span>
                </div>
                <div className="mt-2.5 hstack flex-wrap gap-1.5">
                  {ORDEM_STATUS.map((s) => (
                    <button
                      key={s}
                      onClick={() => mudarStatus(pd, s)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[11px] font-semibold tap',
                        pd.status === s ? 'bg-accent text-black' : 'bg-surface-2 text-muted',
                      )}
                    >
                      {ST_PEDIDO[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

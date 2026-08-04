import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus, Pencil, QrCode, Check, X, Power, Download } from 'lucide-react'
import { Card } from './Card.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

const DEEP = 'https://plus.tatasushi.tech/limpeza?b='

// Admin de banheiros (Limpeza) — embutido no painel de administração.
// Edição inline (sem modal): criar/editar acontece direto na lista.
// Só o QR abre num overlay (portado pro body, pra não ficar atrás da barra).
export function AdminBanheiros() {
  const { usuario } = useAuth()
  const isAdmin = (usuario?.perfil || '').toLowerCase() === 'admin'
  const [tab, setTab] = useState('banheiros')
  const [banheiros, setBanheiros] = useState(null)
  const [itens, setItens] = useState(null)
  const [edit, setEdit] = useState(null) // banheiro em edição: {id, nome, unidade, ordem} · id='novo'
  const [editItem, setEditItem] = useState(null) // item em edição: {id, label, ordem} · id='novo'
  const [qr, setQr] = useState(null) // banheiro p/ mostrar o QR
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    const [b, i] = await Promise.all([
      supabase.rpc('limpeza_admin_banheiros'),
      supabase.rpc('limpeza_admin_itens'),
    ])
    setBanheiros(b.data || [])
    setItens(i.data || [])
  }
  useEffect(() => {
    if (isAdmin) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const porUnidade = useMemo(() => {
    const m = {}
    for (const b of banheiros || []) (m[b.unidade || 'Sem unidade'] = m[b.unidade || 'Sem unidade'] || []).push(b)
    return m
  }, [banheiros])
  const unidades = useMemo(
    () => [...new Set((banheiros || []).map((b) => b.unidade).filter(Boolean))],
    [banheiros],
  )

  if (!isAdmin) return null
  const carregando = banheiros == null || itens == null

  // ── Banheiros ────────────────────────────────────────────────────────────
  function novoBanheiro() { setErro(''); setEditItem(null); setEdit({ id: 'novo', nome: '', unidade: '' }) }
  function editarBanheiro(b) { setErro(''); setEdit({ id: b.id, nome: b.nome, unidade: b.unidade || '', ordem: b.ordem }) }
  async function salvarBanheiro() {
    if (!edit.nome.trim()) { setErro('Informe o nome.'); return }
    setSalvando(true); setErro('')
    const { error } = await supabase.rpc('limpeza_admin_banheiro_salvar', {
      p_id: edit.id === 'novo' ? null : edit.id,
      p_nome: edit.nome.trim(), p_unidade: edit.unidade.trim() || null, p_ordem: edit.ordem || 0,
    })
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setEdit(null); carregar()
  }
  async function toggleBanheiro(b) {
    await supabase.rpc('limpeza_admin_banheiro_toggle', { p_id: b.id, p_ativo: !b.ativo })
    carregar()
  }

  // ── Itens do checklist ───────────────────────────────────────────────────
  function novoItem() { setErro(''); setEdit(null); setEditItem({ id: 'novo', label: '' }) }
  function editarItem(it) { setErro(''); setEditItem({ id: it.id, label: it.label, ordem: it.ordem }) }
  async function salvarItem() {
    if (!editItem.label.trim()) { setErro('Escreva o item.'); return }
    setSalvando(true); setErro('')
    const { error } = await supabase.rpc('limpeza_admin_item_salvar', {
      p_id: editItem.id === 'novo' ? null : editItem.id, p_label: editItem.label.trim(), p_ordem: editItem.ordem || 99,
    })
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setEditItem(null); carregar()
  }
  async function toggleItem(it) {
    await supabase.rpc('limpeza_admin_item_toggle', { p_id: it.id, p_ativo: !it.ativo })
    carregar()
  }

  const cancelar = () => { setEdit(null); setEditItem(null); setErro('') }

  return (
    <div className="px-5 pb-24 pt-3">
      {/* Tabs */}
      <div className="hstack gap-2">
        {[['banheiros', 'Banheiros'], ['checklist', 'Checklist']].map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); cancelar() }}
            className={cn('rounded-pill px-4 py-1.5 text-sm font-semibold tap', tab === k ? 'bg-accent text-black' : 'border border-line text-muted')}>
            {l}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="grid place-items-center py-20 text-muted-2"><Loader2 size={22} className="animate-spin" /></div>
      ) : tab === 'banheiros' ? (
        <div className="mt-4 flex flex-col gap-4">
          {edit?.id === 'novo' ? (
            <Card className="!p-3">
              <BanheiroCampos novo edit={edit} setEdit={setEdit} unidades={unidades}
                erro={erro} salvando={salvando} onSalvar={salvarBanheiro} onCancelar={cancelar} />
            </Card>
          ) : (
            <button onClick={novoBanheiro} className="btn-primary hstack w-full justify-center gap-2 py-3 text-sm">
              <Plus size={18} /> Novo banheiro
            </button>
          )}
          {Object.entries(porUnidade).map(([uni, list]) => (
            <div key={uni}>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">{uni}</div>
              <Card className="flex flex-col divide-y divide-line !p-0">
                {list.map((b) =>
                  edit?.id === b.id ? (
                    <div key={b.id} className="p-3">
                      <BanheiroCampos edit={edit} setEdit={setEdit} unidades={unidades}
                        erro={erro} salvando={salvando} onSalvar={salvarBanheiro} onCancelar={cancelar} />
                    </div>
                  ) : (
                    <div key={b.id} className="hstack items-center gap-2 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className={cn('truncate text-sm font-semibold', !b.ativo && 'text-muted-2 line-through')}>{b.nome}</div>
                        <div className="text-[11px] text-muted">{b.checks} check{b.checks === 1 ? '' : 's'}</div>
                      </div>
                      <IconBtn title="QR" onClick={() => setQr(b)}><QrCode size={16} /></IconBtn>
                      <IconBtn title="Editar" onClick={() => editarBanheiro(b)}><Pencil size={16} /></IconBtn>
                      <IconBtn title={b.ativo ? 'Desativar' : 'Ativar'} ativo={b.ativo} onClick={() => toggleBanheiro(b)}>
                        <Power size={16} />
                      </IconBtn>
                    </div>
                  ),
                )}
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {editItem?.id === 'novo' ? (
            <Card className="!p-3">
              <ItemCampos novo edit={editItem} setEdit={setEditItem}
                erro={erro} salvando={salvando} onSalvar={salvarItem} onCancelar={cancelar} />
            </Card>
          ) : (
            <button onClick={novoItem} className="btn-primary hstack w-full justify-center gap-2 py-3 text-sm">
              <Plus size={18} /> Novo item
            </button>
          )}
          <Card className="flex flex-col divide-y divide-line !p-0">
            {(itens || []).map((it) =>
              editItem?.id === it.id ? (
                <div key={it.id} className="p-3">
                  <ItemCampos edit={editItem} setEdit={setEditItem}
                    erro={erro} salvando={salvando} onSalvar={salvarItem} onCancelar={cancelar} />
                </div>
              ) : (
                <div key={it.id} className="hstack items-center gap-2 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className={cn('text-sm', !it.ativo && 'text-muted-2 line-through')}>{it.label}</span>
                  </span>
                  <IconBtn title="Editar" onClick={() => editarItem(it)}><Pencil size={16} /></IconBtn>
                  <IconBtn title={it.ativo ? 'Desativar' : 'Ativar'} ativo={it.ativo} onClick={() => toggleItem(it)}>
                    <Power size={16} />
                  </IconBtn>
                </div>
              ),
            )}
          </Card>
          <p className="px-1 text-[11px] text-muted-2">Itens desativados somem do checklist novo, mas continuam nos checks já feitos.</p>
        </div>
      )}

      {qr && <QrModal banheiro={qr} onClose={() => setQr(null)} />}
    </div>
  )
}

function IconBtn({ children, onClick, title, ativo }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line tap',
        ativo === false ? 'text-muted-2' : 'text-muted')}>
      {children}
    </button>
  )
}

// ── Campos inline (banheiro) ─────────────────────────────────────────────────
function BanheiroCampos({ novo, edit, setEdit, unidades, erro, salvando, onSalvar, onCancelar }) {
  return (
    <>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">
        {novo ? 'Novo banheiro' : 'Editar banheiro'}
      </div>
      <input autoFocus value={edit.nome} onChange={(e) => setEdit((s) => ({ ...s, nome: e.target.value }))}
        placeholder="Nome (ex.: Cliente 1)"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      <input value={edit.unidade} onChange={(e) => setEdit((s) => ({ ...s, unidade: e.target.value }))} list="unidades-lista"
        placeholder="Unidade (ex.: Itaim)"
        className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      <datalist id="unidades-lista">{unidades.map((u) => <option key={u} value={u} />)}</datalist>
      {erro && <div className="mt-2 text-xs font-medium text-danger">{erro}</div>}
      <div className="mt-3 hstack gap-2">
        <button onClick={onSalvar} disabled={salvando} className="btn-primary flex-1 hstack justify-center gap-2 py-2 text-sm disabled:opacity-50">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
        </button>
        <button onClick={onCancelar} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted tap">Cancelar</button>
      </div>
    </>
  )
}

// ── Campos inline (item do checklist) ────────────────────────────────────────
function ItemCampos({ novo, edit, setEdit, erro, salvando, onSalvar, onCancelar }) {
  return (
    <>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">
        {novo ? 'Novo item' : 'Editar item'}
      </div>
      <input autoFocus value={edit.label} onChange={(e) => setEdit((s) => ({ ...s, label: e.target.value }))}
        placeholder="Ex.: Limpeza dos vasos sanitários"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      {erro && <div className="mt-2 text-xs font-medium text-danger">{erro}</div>}
      <div className="mt-3 hstack gap-2">
        <button onClick={onSalvar} disabled={salvando} className="btn-primary flex-1 hstack justify-center gap-2 py-2 text-sm disabled:opacity-50">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
        </button>
        <button onClick={onCancelar} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted tap">Cancelar</button>
      </div>
    </>
  )
}

// ── QR (overlay portado pro body, pra ficar acima da barra de navegação) ─────
function QrModal({ banheiro, onClose }) {
  const [dataUrl, setDataUrl] = useState(null)
  const link = DEEP + banheiro.token
  useEffect(() => {
    let vivo = true
    import('qrcode').then((m) => m.toDataURL(link, { width: 320, margin: 2 }))
      .then((url) => { if (vivo) setDataUrl(url) })
      .catch(() => {})
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const arquivo = `QR-${(banheiro.unidade || '').replace(/\s+/g, '_')}-${banheiro.nome.replace(/\s+/g, '_')}.png`
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-bg p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="hstack items-center justify-between">
          <div className="font-display text-base font-bold">QR — {banheiro.nome}</div>
          <button onClick={onClose} className="text-muted tap" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="mt-4 flex flex-col items-center">
          {banheiro.unidade && <div className="text-xs text-muted">{banheiro.unidade}</div>}
          {dataUrl
            ? <img src={dataUrl} alt="QR" className="mt-2 h-56 w-56" />
            : <div className="mt-2 grid h-56 w-56 place-items-center text-muted-2"><Loader2 className="animate-spin" /></div>}
          <div className="mt-3 break-all text-center text-[11px] text-muted-2">{link}</div>
          {dataUrl && (
            <a href={dataUrl} download={arquivo} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm">
              <Download size={16} /> Baixar QR
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

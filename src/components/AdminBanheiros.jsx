import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Pencil, QrCode, Check, X, Power, Download } from 'lucide-react'
import { Card } from './Card.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

const DEEP = 'https://plus.tatasushi.tech/limpeza?b='

// Admin de banheiros (Limpeza) — embutido no painel de administração.
// Sem Header/Voltar próprios: o hub do painel cuida da navegação.
export function AdminBanheiros() {
  const { usuario } = useAuth()
  const isAdmin = (usuario?.perfil || '').toLowerCase() === 'admin'
  const [tab, setTab] = useState('banheiros')
  const [banheiros, setBanheiros] = useState(null)
  const [itens, setItens] = useState(null)
  const [modal, setModal] = useState(null) // {tipo:'banheiro'|'item'|'qr', dados}

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

  if (!isAdmin) return null

  const carregando = banheiros == null || itens == null

  return (
    <div className="px-5 pb-24 pt-3">
      {/* Tabs */}
      <div className="hstack gap-2">
        {[['banheiros', 'Banheiros'], ['checklist', 'Checklist']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn('rounded-pill px-4 py-1.5 text-sm font-semibold tap', tab === k ? 'bg-accent text-black' : 'border border-line text-muted')}>
            {l}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="grid place-items-center py-20 text-muted-2"><Loader2 size={22} className="animate-spin" /></div>
      ) : tab === 'banheiros' ? (
        <div className="mt-4 flex flex-col gap-4">
          <button onClick={() => setModal({ tipo: 'banheiro', dados: null })}
            className="btn-primary hstack w-full justify-center gap-2 py-3 text-sm">
            <Plus size={18} /> Novo banheiro
          </button>
          {Object.entries(porUnidade).map(([uni, list]) => (
            <div key={uni}>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">{uni}</div>
              <Card className="flex flex-col divide-y divide-line !p-0">
                {list.map((b) => (
                  <div key={b.id} className="hstack items-center gap-2 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className={cn('truncate text-sm font-semibold', !b.ativo && 'text-muted-2 line-through')}>{b.nome}</div>
                      <div className="text-[11px] text-muted">{b.checks} check{b.checks === 1 ? '' : 's'}</div>
                    </div>
                    <IconBtn title="QR" onClick={() => setModal({ tipo: 'qr', dados: b })}><QrCode size={16} /></IconBtn>
                    <IconBtn title="Editar" onClick={() => setModal({ tipo: 'banheiro', dados: b })}><Pencil size={16} /></IconBtn>
                    <IconBtn title={b.ativo ? 'Desativar' : 'Ativar'} ativo={b.ativo}
                      onClick={async () => { await supabase.rpc('limpeza_admin_banheiro_toggle', { p_id: b.id, p_ativo: !b.ativo }); carregar() }}>
                      <Power size={16} />
                    </IconBtn>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <button onClick={() => setModal({ tipo: 'item', dados: null })}
            className="btn-primary hstack w-full justify-center gap-2 py-3 text-sm">
            <Plus size={18} /> Novo item
          </button>
          <Card className="flex flex-col divide-y divide-line !p-0">
            {(itens || []).map((it) => (
              <div key={it.id} className="hstack items-center gap-2 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className={cn('text-sm', !it.ativo && 'text-muted-2 line-through')}>{it.label}</span>
                </span>
                <IconBtn title="Editar" onClick={() => setModal({ tipo: 'item', dados: it })}><Pencil size={16} /></IconBtn>
                <IconBtn title={it.ativo ? 'Desativar' : 'Ativar'} ativo={it.ativo}
                  onClick={async () => { await supabase.rpc('limpeza_admin_item_toggle', { p_id: it.id, p_ativo: !it.ativo }); carregar() }}>
                  <Power size={16} />
                </IconBtn>
              </div>
            ))}
          </Card>
          <p className="px-1 text-[11px] text-muted-2">Itens desativados somem do checklist novo, mas continuam nos checks já feitos.</p>
        </div>
      )}

      {modal?.tipo === 'banheiro' && (
        <BanheiroForm banheiro={modal.dados} unidades={Object.keys(porUnidade)} onClose={() => setModal(null)} onSalvo={() => { setModal(null); carregar() }} />
      )}
      {modal?.tipo === 'item' && (
        <ItemForm item={modal.dados} onClose={() => setModal(null)} onSalvo={() => { setModal(null); carregar() }} />
      )}
      {modal?.tipo === 'qr' && <QrModal banheiro={modal.dados} onClose={() => setModal(null)} />}
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

// ── Overlay simples ───────────────────────────────────────────────────────────
function Overlay({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-bg p-5 sm:max-w-md sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="hstack items-center justify-between">
          <div className="font-display text-base font-bold">{title}</div>
          <button onClick={onClose} className="text-muted tap" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

function BanheiroForm({ banheiro, unidades, onClose, onSalvo }) {
  const [nome, setNome] = useState(banheiro?.nome || '')
  const [unidade, setUnidade] = useState(banheiro?.unidade || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  async function salvar() {
    if (!nome.trim()) { setErro('Informe o nome.'); return }
    setSalvando(true); setErro('')
    const { error } = await supabase.rpc('limpeza_admin_banheiro_salvar', {
      p_id: banheiro?.id || null, p_nome: nome.trim(), p_unidade: unidade.trim() || null, p_ordem: banheiro?.ordem || 0,
    })
    if (error) { setErro(error.message); setSalvando(false); return }
    onSalvo()
  }
  return (
    <Overlay title={banheiro ? 'Editar banheiro' : 'Novo banheiro'} onClose={onClose}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted">Nome</label>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Cliente 1"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      <label className="mb-1 mt-3 block text-[11px] font-bold uppercase tracking-widest text-muted">Unidade</label>
      <input value={unidade} onChange={(e) => setUnidade(e.target.value)} list="unidades-lista" placeholder="Ex.: Itaim"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      <datalist id="unidades-lista">{unidades.map((u) => <option key={u} value={u} />)}</datalist>
      {erro && <div className="mt-2 text-xs font-medium text-danger">{erro}</div>}
      <button onClick={salvar} disabled={salvando} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-50">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
      </button>
    </Overlay>
  )
}

function ItemForm({ item, onClose, onSalvo }) {
  const [label, setLabel] = useState(item?.label || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  async function salvar() {
    if (!label.trim()) { setErro('Escreva o item.'); return }
    setSalvando(true); setErro('')
    const { error } = await supabase.rpc('limpeza_admin_item_salvar', {
      p_id: item?.id || null, p_label: label.trim(), p_ordem: item?.ordem || 99,
    })
    if (error) { setErro(error.message); setSalvando(false); return }
    onSalvo()
  }
  return (
    <Overlay title={item ? 'Editar item' : 'Novo item'} onClose={onClose}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted">Item do checklist</label>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Limpeza dos vasos sanitários"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
      {erro && <div className="mt-2 text-xs font-medium text-danger">{erro}</div>}
      <button onClick={salvar} disabled={salvando} className="btn-primary mt-4 hstack w-full justify-center gap-2 py-3 text-sm disabled:opacity-50">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar
      </button>
    </Overlay>
  )
}

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
  return (
    <Overlay title={`QR — ${banheiro.nome}`} onClose={onClose}>
      <div className="flex flex-col items-center">
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
    </Overlay>
  )
}

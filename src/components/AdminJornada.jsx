import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus, Pencil, Trash2, Power, ImagePlus, X, Check, Users } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { RecompensaFoto } from './RecompensaFoto.jsx'
import { cn } from '../lib/cn'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

const TAM_MAX = 15 * 1024 * 1024

function fmtTempo(meses) {
  const m = Math.max(0, Number(meses) || 0)
  const a = Math.floor(m / 12)
  const mm = m % 12
  const pa = a ? `${a} ano${a > 1 ? 's' : ''}` : ''
  const pm = mm ? `${mm} ${mm > 1 ? 'meses' : 'mês'}` : ''
  return [pa, pm].filter(Boolean).join(' e ') || '0 meses'
}

// Admin da aba Jornada: define a data de implantação e cadastra os marcos
// (por tempo de casa) e as opções de premiação de cada um.
export function AdminJornada() {
  const [dados, setDados] = useState(null) // { implantacao, marcos:[] }
  const [carregando, setCarregando] = useState(true)
  const [dataImpl, setDataImpl] = useState('')
  const [salvandoData, setSalvandoData] = useState(false)
  const [editMarco, setEditMarco] = useState(null)
  const [editOpcao, setEditOpcao] = useState(null)
  const [arquivo, setArquivo] = useState(null) // { file, preview }
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('jornada_admin_listar')
    setDados(data || { implantacao: null, marcos: [] })
    setDataImpl(data?.implantacao || '')
    setCarregando(false)
  }, [])
  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvarData() {
    tapHaptic()
    setSalvandoData(true)
    await supabase.rpc('jornada_config_salvar', { p_implantacao: dataImpl || null })
    setSalvandoData(false)
    carregar()
  }

  async function salvarMarco() {
    if (!editMarco?.titulo?.trim() || !Number(editMarco.meses)) {
      setErro('Informe o título e o tempo (em meses).')
      return
    }
    setSalvando(true)
    setErro('')
    await supabase.rpc('jornada_marco_salvar', {
      p_id: editMarco.id || null,
      p_meses: Number(editMarco.meses),
      p_titulo: editMarco.titulo,
      p_descricao: editMarco.descricao || null,
      p_ordem: Number(editMarco.ordem) || 0,
    })
    setSalvando(false)
    setEditMarco(null)
    carregar()
  }

  async function toggleMarco(m) {
    await supabase.rpc('jornada_marco_toggle', { p_id: m.id, p_ativo: !m.ativo })
    carregar()
  }
  async function excluirMarco(m) {
    if (!window.confirm(`Excluir o marco "${m.titulo}" e suas opções?`)) return
    await supabase.rpc('jornada_marco_excluir', { p_id: m.id })
    carregar()
  }

  async function salvarOpcao() {
    if (!editOpcao?.titulo?.trim()) {
      setErro('Informe o título da opção.')
      return
    }
    setSalvando(true)
    setErro('')
    let imagem_url = editOpcao.imagem_url || null
    if (arquivo) {
      const caminho = `jornada/${crypto.randomUUID()}.${(arquivo.file.name.split('.').pop() || 'jpg').toLowerCase()}`
      const { error: upErr } = await supabase.storage
        .from('recompensas')
        .upload(caminho, arquivo.file, { cacheControl: '3600', contentType: arquivo.file.type || 'image/jpeg' })
      if (upErr) {
        setSalvando(false)
        setErro('Não foi possível enviar a imagem.')
        return
      }
      imagem_url = supabase.storage.from('recompensas').getPublicUrl(caminho).data.publicUrl
    }
    await supabase.rpc('jornada_opcao_salvar', {
      p_id: editOpcao.id || null,
      p_marco: editOpcao.marco_id,
      p_titulo: editOpcao.titulo,
      p_descricao: editOpcao.descricao || null,
      p_emoji: editOpcao.emoji || null,
      p_imagem_url: imagem_url,
      p_ordem: Number(editOpcao.ordem) || 0,
      p_link: editOpcao.link || null,
    })
    setSalvando(false)
    setEditOpcao(null)
    setArquivo(null)
    carregar()
  }
  async function toggleOpcao(o) {
    await supabase.rpc('jornada_opcao_toggle', { p_id: o.id, p_ativo: !o.ativo })
    carregar()
  }
  async function excluirOpcao(o) {
    if (!window.confirm('Excluir esta opção?')) return
    await supabase.rpc('jornada_opcao_excluir', { p_id: o.id })
    carregar()
  }

  if (carregando)
    return (
      <div className="grid place-items-center py-20 text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )

  const marcos = dados?.marcos || []

  return (
    <div className="pb-24">
      {/* Data de implantação */}
      <Section className="mt-4" title="Implantação do programa">
        <Card className="!p-4">
          <p className="text-xs text-muted">
            O tempo da Jornada conta a partir desta data (não retroativo). Deixe em branco pra usar o
            tempo real de casa.
          </p>
          <div className="mt-3 hstack gap-2">
            <input
              type="date"
              value={dataImpl || ''}
              onChange={(e) => setDataImpl(e.target.value)}
              className="flex-1 rounded-card border border-line bg-bg px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={salvarData}
              disabled={salvandoData}
              className="btn-primary hstack gap-1.5 !px-4 !py-2 text-sm disabled:opacity-60"
            >
              {salvandoData ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
            </button>
          </div>
        </Card>
      </Section>

      {/* Marcos */}
      <Section
        className="mt-5"
        title="Marcos por tempo de casa"
        action={
          <button
            onClick={() => {
              setErro('')
              setEditMarco({ meses: '', titulo: '', descricao: '', ordem: marcos.length + 1 })
            }}
            className="hstack gap-1 text-sm font-semibold text-accent tap"
          >
            <Plus size={16} /> Marco
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          {marcos.length === 0 && (
            <div className="card p-6 text-center text-sm text-muted">Nenhum marco cadastrado.</div>
          )}
          {marcos.map((m) => (
            <Card key={m.id} className={cn('!p-4', !m.ativo && 'opacity-70')}>
              <div className="hstack items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="hstack items-center gap-2">
                    <span className="font-display text-base font-bold leading-tight">{m.titulo}</span>
                    <span className="pill bg-surface-2 text-[10px] text-muted">{fmtTempo(m.meses)}</span>
                  </div>
                  {m.descricao && <p className="mt-1 text-xs text-muted">{m.descricao}</p>}
                  <div className="mt-1 hstack items-center gap-1 text-[11px] text-muted-2">
                    <Users size={11} /> {m.resgates} resgate{m.resgates === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="hstack shrink-0 gap-1">
                  <IconBtn title="Editar" onClick={() => { setErro(''); setEditMarco({ ...m }) }}><Pencil size={15} /></IconBtn>
                  <IconBtn title={m.ativo ? 'Desativar' : 'Ativar'} ativo={m.ativo} onClick={() => toggleMarco(m)}><Power size={15} /></IconBtn>
                  <IconBtn title="Excluir" onClick={() => excluirMarco(m)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>

              {/* Opções */}
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                {(m.opcoes || []).map((o) => (
                  <div key={o.id} className={cn('hstack items-center gap-2.5', !o.ativo && 'opacity-50')}>
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent-soft text-xl">
                      <RecompensaFoto src={o.imagem_url} emoji={o.emoji} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{o.titulo}</div>
                      {o.descricao && <div className="truncate text-[11px] text-muted">{o.descricao}</div>}
                    </div>
                    <IconBtn title="Editar" onClick={() => { setErro(''); setArquivo(null); setEditOpcao({ ...o, marco_id: m.id }) }}><Pencil size={14} /></IconBtn>
                    <IconBtn title={o.ativo ? 'Desativar' : 'Ativar'} ativo={o.ativo} onClick={() => toggleOpcao(o)}><Power size={14} /></IconBtn>
                    <IconBtn title="Excluir" onClick={() => excluirOpcao(o)}><Trash2 size={14} /></IconBtn>
                  </div>
                ))}
                <button
                  onClick={() => { setErro(''); setArquivo(null); setEditOpcao({ marco_id: m.id, titulo: '', descricao: '', emoji: '', imagem_url: '', link: '', ordem: (m.opcoes?.length || 0) + 1 }) }}
                  className="hstack w-full justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-xs font-semibold text-muted tap"
                >
                  <Plus size={14} /> Opção de premiação
                </button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Editor de marco */}
      {editMarco &&
        createPortal(
          <ModalBase titulo={editMarco.id ? 'Editar marco' : 'Novo marco'} onClose={() => setEditMarco(null)}>
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-semibold text-muted">
                Tempo (em meses) — ex.: 12 = 1 ano, 60 = 5 anos
                <input type="number" min="1" value={editMarco.meses}
                  onChange={(e) => setEditMarco((s) => ({ ...s, meses: e.target.value }))} className={inputCls} />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Título
                <input value={editMarco.titulo} onChange={(e) => setEditMarco((s) => ({ ...s, titulo: e.target.value }))}
                  placeholder="Ex.: 5 anos de TATÁ" className={inputCls} />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Descrição (opcional)
                <textarea value={editMarco.descricao || ''} rows={2}
                  onChange={(e) => setEditMarco((s) => ({ ...s, descricao: e.target.value }))} className={`${inputCls} resize-none`} />
              </label>
              {erro && <div className="text-xs font-medium text-danger">{erro}</div>}
              <div className="hstack gap-2">
                <button onClick={() => setEditMarco(null)} className="btn-ghost flex-1 !py-2.5 text-sm text-muted">Cancelar</button>
                <button onClick={salvarMarco} disabled={salvando} className="btn-primary flex-1 hstack justify-center gap-1.5 !py-2.5 text-sm disabled:opacity-60">
                  {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
                </button>
              </div>
            </div>
          </ModalBase>,
          document.body,
        )}

      {/* Editor de opção */}
      {editOpcao &&
        createPortal(
          <ModalBase titulo={editOpcao.id ? 'Editar opção' : 'Nova opção'} onClose={() => { setEditOpcao(null); setArquivo(null) }}>
            <div className="flex flex-col gap-3">
              <div className="hstack items-center gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent-soft text-3xl">
                  <RecompensaFoto src={arquivo?.preview || editOpcao.imagem_url} emoji={editOpcao.emoji} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="hstack cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted tap">
                    <ImagePlus size={14} /> Imagem
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; e.target.value = ''
                      if (!f) return
                      if (f.size > TAM_MAX) { setErro('Imagem muito grande (máx. 15 MB).'); return }
                      setArquivo({ file: f, preview: URL.createObjectURL(f) })
                    }} />
                  </label>
                  <input value={editOpcao.emoji || ''} maxLength={4} onChange={(e) => setEditOpcao((s) => ({ ...s, emoji: e.target.value }))}
                    placeholder="ou emoji 🎁" className="w-24 rounded-lg border border-line bg-bg px-2 py-1 text-center text-sm outline-none" />
                </div>
              </div>
              <label className="block text-xs font-semibold text-muted">
                Título (a premiação)
                <input value={editOpcao.titulo} onChange={(e) => setEditOpcao((s) => ({ ...s, titulo: e.target.value }))}
                  placeholder="Ex.: Voucher de R$ 250 no Caju" className={inputCls} />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Descrição (opcional)
                <textarea value={editOpcao.descricao || ''} rows={2}
                  onChange={(e) => setEditOpcao((s) => ({ ...s, descricao: e.target.value }))} className={`${inputCls} resize-none`} />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Link (opcional) — site, local no mapa, regulamento…
                <input
                  type="url"
                  value={editOpcao.link || ''}
                  onChange={(e) => setEditOpcao((s) => ({ ...s, link: e.target.value }))}
                  placeholder="https://..."
                  className={inputCls}
                />
              </label>
              {erro && <div className="text-xs font-medium text-danger">{erro}</div>}
              <div className="hstack gap-2">
                <button onClick={() => { setEditOpcao(null); setArquivo(null) }} className="btn-ghost flex-1 !py-2.5 text-sm text-muted">Cancelar</button>
                <button onClick={salvarOpcao} disabled={salvando} className="btn-primary flex-1 hstack justify-center gap-1.5 !py-2.5 text-sm disabled:opacity-60">
                  {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
                </button>
              </div>
            </div>
          </ModalBase>,
          document.body,
        )}
    </div>
  )
}

const inputCls = 'mt-1 w-full rounded-card border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-carbon'

function IconBtn({ children, onClick, title, ativo }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line tap', ativo === false ? 'text-muted-2' : 'text-muted')}>
      {children}
    </button>
  )
}

function ModalBase({ titulo, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-bg p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-2xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
        <div className="hstack items-center justify-between pb-3">
          <div className="font-display text-base font-bold">{titulo}</div>
          <button onClick={onClose} aria-label="Fechar" className="text-muted tap"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

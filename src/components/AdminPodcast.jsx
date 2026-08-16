import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Loader2, Music, ImagePlus, Mic } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

// Admin dos episódios do Podcast (Rádio 2.0). Sobe áudio + capa pro bucket
// 'podcast' e grava metadados em tata_plus.podcast_episodios (RPCs podcast_admin_*).
const TAM_AUDIO = 50 * 1024 * 1024
const TAM_IMG = 8 * 1024 * 1024
const VAZIO = {
  id: null,
  titulo: '',
  legenda: '',
  capa_url: '',
  audio_url: '',
  publico: '',
  pontos: 10,
  ordem: 0,
  ativo: true,
}

export function AdminPodcast() {
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [capaFile, setCapaFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('podcast_admin_listar')
    setItens(data || [])
    setCarregando(false)
  }, [])
  useEffect(() => {
    carregar()
  }, [carregar])

  function abrir(item) {
    setErro('')
    setCapaFile(null)
    setAudioFile(null)
    const proximaOrdem = itens.length ? Math.max(...itens.map((i) => i.ordem || 0)) + 1 : 0
    // coalesce null → '' pra não quebrar os inputs controlados nem os .trim() ao salvar
    setEditando(
      item
        ? {
            ...VAZIO,
            ...item,
            titulo: item.titulo || '',
            legenda: item.legenda || '',
            publico: item.publico || '',
            capa_url: item.capa_url || '',
            audio_url: item.audio_url || '',
          }
        : { ...VAZIO, ordem: proximaOrdem },
    )
  }
  function fechar() {
    setEditando(null)
    setCapaFile(null)
    setAudioFile(null)
    setErro('')
  }

  const capaPreview = useMemo(
    () => (capaFile ? URL.createObjectURL(capaFile) : editando?.capa_url || ''),
    [capaFile, editando],
  )

  function escolherCapa(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return setErro('A capa precisa ser uma imagem.')
    if (f.size > TAM_IMG) return setErro('Imagem muito grande (máx. 8 MB).')
    setErro('')
    setCapaFile(f)
  }
  function escolherAudio(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('audio/')) return setErro('O arquivo precisa ser um áudio.')
    if (f.size > TAM_AUDIO) return setErro('Áudio muito grande (máx. 50 MB).')
    setErro('')
    setAudioFile(f)
  }

  const podeSalvar =
    !!editando &&
    (editando.titulo || '').trim() !== '' &&
    (!!editando.audio_url || !!audioFile) &&
    !salvando

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    setErro('')
    try {
      let capa_url = editando.capa_url
      if (capaFile) {
        const ext = (capaFile.name.split('.').pop() || 'jpg').toLowerCase()
        const caminho = `capas/${crypto.randomUUID()}.${ext}`
        const { error } = await supabase.storage
          .from('podcast')
          .upload(caminho, capaFile, { cacheControl: '3600', contentType: capaFile.type })
        if (error) {
          setSalvando(false)
          return setErro('Não foi possível enviar a capa.')
        }
        capa_url = supabase.storage.from('podcast').getPublicUrl(caminho).data.publicUrl
      }
      let audio_url = editando.audio_url
      if (audioFile) {
        const ext = (audioFile.name.split('.').pop() || 'mp3').toLowerCase()
        const caminho = `audio/${crypto.randomUUID()}.${ext}`
        const { error } = await supabase.storage
          .from('podcast')
          .upload(caminho, audioFile, { cacheControl: '3600', contentType: audioFile.type })
        if (error) {
          setSalvando(false)
          return setErro('Não foi possível enviar o áudio.')
        }
        audio_url = supabase.storage.from('podcast').getPublicUrl(caminho).data.publicUrl
      }
      const { error } = await supabase.rpc('podcast_admin_salvar', {
        p_id: editando.id,
        p_titulo: (editando.titulo || '').trim(),
        p_legenda: (editando.legenda || '').trim() || null,
        p_capa_url: capa_url || null,
        p_audio_url: audio_url || null,
        p_publico: (editando.publico || '').trim() || null,
        p_pontos: Number(editando.pontos) || 10,
        p_ordem: Number(editando.ordem) || 0,
        p_ativo: editando.ativo,
      })
      setSalvando(false)
      if (error) return setErro('Não foi possível salvar. Tente novamente.')
      fechar()
      setCarregando(true)
      carregar()
    } catch (e) {
      setSalvando(false)
      setErro(e?.message || 'Falha inesperada ao salvar.')
    }
  }

  async function excluir(id) {
    const { error } = await supabase.rpc('podcast_admin_excluir', { p_id: id })
    if (!error) {
      setExcluindo(null)
      setCarregando(true)
      carregar()
    }
  }

  return (
    <>
      <Section className="mt-4" title={`Episódios (${itens.length})`}>
        <button
          onClick={() => abrir(null)}
          className="btn-primary mb-3 hstack w-full justify-center gap-2 !py-3 text-sm"
        >
          <Plus size={16} /> Novo episódio
        </button>

        {carregando ? (
          <div className="grid place-items-center py-12 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : itens.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            Nenhum episódio ainda. Crie o primeiro no botão acima.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {itens.map((item) => (
              <Card key={item.id} className={cn('!p-3', !item.ativo && 'opacity-60')}>
                <div className="hstack gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-muted-2">
                    {item.capa_url ? (
                      <img src={item.capa_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Mic size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.titulo}</div>
                    <div className="truncate text-[11px] text-muted">
                      {item.legenda || 'sem legenda'}
                    </div>
                    <div className="mt-0.5 hstack flex-wrap gap-x-2 text-[10px] text-muted-2">
                      <span>ordem {item.ordem}</span>
                      <span>· +{item.pontos} pts</span>
                      {!item.ativo && <span className="text-danger">· rascunho</span>}
                      {!item.audio_url && <span className="text-danger">· sem áudio</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => abrir(item)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted tap"
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setExcluindo(item)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted tap"
                    aria-label="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* Modal criar/editar */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-card border border-line bg-surface">
            <div className="hstack justify-between border-b border-line px-5 py-3.5">
              <div className="font-display text-base font-bold">
                {editando.id ? 'Editar episódio' : 'Novo episódio'}
              </div>
              <button onClick={fechar} className="text-muted tap" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Capa */}
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Capa
              </label>
              <div className="mt-1.5 hstack gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-muted-2">
                  {capaPreview ? (
                    <img src={capaPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus size={20} />
                  )}
                </div>
                <label className="btn-ghost cursor-pointer !py-2 text-xs">
                  {capaPreview ? 'Trocar imagem' : 'Escolher imagem'}
                  <input type="file" accept="image/*" className="hidden" onChange={escolherCapa} />
                </label>
              </div>

              {/* Nome */}
              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Nome do episódio
              </label>
              <input
                value={editando.titulo}
                onChange={(e) => setEditando((s) => ({ ...s, titulo: e.target.value }))}
                placeholder="Ex.: Segurança alimentar na cozinha"
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />

              {/* Legenda */}
              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Legenda
              </label>
              <textarea
                value={editando.legenda}
                onChange={(e) => setEditando((s) => ({ ...s, legenda: e.target.value }))}
                rows={2}
                placeholder="Uma frase curta sobre o episódio"
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />

              {/* Áudio */}
              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Áudio (MP3)
              </label>
              <div className="mt-1.5 hstack gap-3">
                <label className="btn-ghost hstack shrink-0 cursor-pointer gap-1.5 !py-2 text-xs">
                  <Music size={14} /> {editando.audio_url || audioFile ? 'Trocar áudio' : 'Escolher áudio'}
                  <input type="file" accept="audio/*" className="hidden" onChange={escolherAudio} />
                </label>
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-2">
                  {audioFile ? audioFile.name : editando.audio_url ? 'áudio atual mantido' : 'nenhum'}
                </span>
              </div>

              {/* Público + pontos */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Para (público)
                  </label>
                  <input
                    value={editando.publico}
                    onChange={(e) => setEditando((s) => ({ ...s, publico: e.target.value }))}
                    placeholder="Todos"
                    className="mt-1.5 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Pontos
                  </label>
                  <input
                    type="number"
                    value={editando.pontos}
                    onChange={(e) => setEditando((s) => ({ ...s, pontos: e.target.value }))}
                    className="mt-1.5 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Ordem + publicado */}
              <div className="mt-4 hstack items-end justify-between">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Ordem
                  </label>
                  <input
                    type="number"
                    value={editando.ordem}
                    onChange={(e) => setEditando((s) => ({ ...s, ordem: e.target.value }))}
                    className="mt-1.5 w-24 rounded-card border border-line bg-surface px-3 py-2.5 text-sm outline-none"
                  />
                </div>
                <button
                  onClick={() => setEditando((s) => ({ ...s, ativo: !s.ativo }))}
                  className="hstack gap-2 text-sm"
                  type="button"
                >
                  <span
                    className={cn(
                      'relative h-6 w-10 rounded-full transition-colors',
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
                  <span className="font-semibold">{editando.ativo ? 'Publicado' : 'Rascunho'}</span>
                </button>
              </div>

              {erro && <div className="mt-3 text-xs font-medium text-danger">{erro}</div>}
            </div>

            <div className="hstack gap-2 border-t border-line px-5 py-3.5">
              <button
                onClick={fechar}
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
                {salvando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} /> Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {excluindo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-5">
            <div className="text-sm font-bold">Excluir episódio?</div>
            <p className="mt-1.5 text-sm text-muted">
              “{excluindo.titulo}” será removido. Essa ação não pode ser desfeita.
            </p>
            <div className="mt-4 hstack gap-2">
              <button
                onClick={() => setExcluindo(null)}
                className="btn-ghost flex-1 !py-2.5 text-sm text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluir(excluindo.id)}
                className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-white tap"
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

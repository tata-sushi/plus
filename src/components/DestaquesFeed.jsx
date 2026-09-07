import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Trash2, Loader2, ImagePlus, Pencil, Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { cn } from '../lib/cn'

// Destaques do feed — Highlights persistentes (não expiram). Fileira de bolinhas
// no topo do feed; cada bolinha é um álbum de imagens/vídeos em tela cheia
// (tap-through). Anel colorido enquanto há item novo que a pessoa não viu.
// RH (quem pode publicar) cria/gerencia; todo mundo vê.

const IMG_MAX = 15 * 1024 * 1024 // 15 MB
const VID_MAX = 60 * 1024 * 1024 // 60 MB
const DUR_IMG = 5000 // ms por imagem

export function DestaquesFeed({ admin = false }) {
  const [lista, setLista] = useState(null) // null = carregando
  const [aberto, setAberto] = useState(null) // destaque em visualização
  const [editando, setEditando] = useState(null) // { id?, titulo } no modal de criar/renomear

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('feed_destaques_listar')
    setLista(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Nada pra mostrar e não é admin: some por completo.
  if (lista === null) {
    return <div className="h-[92px]" />
  }
  if (lista.length === 0 && !admin) return null

  function abrir(d) {
    tapHaptic()
    setAberto(d)
    if (d.tem_novo) {
      supabase.rpc('feed_destaque_marcar_visto', { p_destaque_id: d.id })
      setLista((l) => l.map((x) => (x.id === d.id ? { ...x, tem_novo: false } : x)))
    }
  }

  return (
    <div className="pt-2">
      <div className="hstack gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
        {admin && (
          <button
            onClick={() => {
              tapHaptic()
              setEditando({ titulo: '' })
            }}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <span className="grid h-[62px] w-[62px] place-items-center rounded-full border-2 border-dashed border-line text-muted-2">
              <Plus size={22} />
            </span>
            <span className="max-w-[64px] truncate text-[11px] text-muted">Novo</span>
          </button>
        )}

        {lista.map((d) => (
          <button
            key={d.id}
            onClick={() => abrir(d)}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                'grid place-items-center rounded-full p-[2.5px]',
                d.tem_novo
                  ? 'bg-gradient-to-tr from-accent to-emerald-400'
                  : 'bg-line',
              )}
            >
              <span className="grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-full bg-surface ring-2 ring-bg">
                {d.capa_url ? (
                  <img src={d.capa_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-lg font-bold text-accent">
                    {(d.titulo || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </span>
            <span className="max-w-[64px] truncate text-[11px] text-muted">{d.titulo}</span>
          </button>
        ))}
      </div>

      {aberto && (
        <VisorDestaque
          destaque={aberto}
          admin={admin}
          onClose={() => setAberto(null)}
          onEditarDestaque={() => setEditando({ id: aberto.id, titulo: aberto.titulo })}
          onMudou={carregar}
        />
      )}

      {editando && (
        <EditorDestaque
          registro={editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}

// ── Modal de criar / renomear destaque ─────────────────────────────────────
function EditorDestaque({ registro, onFechar, onSalvo }) {
  const [titulo, setTitulo] = useState(registro.titulo || '')
  const [salvando, setSalvando] = useState(false)
  const criando = !registro.id

  async function salvar() {
    if (!titulo.trim() || salvando) return
    setSalvando(true)
    tapHaptic()
    await supabase.rpc('feed_destaque_salvar', {
      p_id: registro.id ?? null,
      p_titulo: titulo.trim(),
      p_capa_url: null,
      p_ordem: null,
      p_ativo: true,
    })
    setSalvando(false)
    onSalvo()
  }

  async function excluir() {
    if (!registro.id) return
    if (!window.confirm('Excluir este destaque e todos os itens dele?')) return
    setSalvando(true)
    await supabase.rpc('feed_destaque_excluir', { p_id: registro.id })
    setSalvando(false)
    onSalvo()
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 px-6" onClick={onFechar}>
      <div className="w-full max-w-[360px] rounded-2xl bg-bg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-base font-bold">
          {criando ? 'Novo destaque' : 'Renomear destaque'}
        </div>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Novidades"
          autoFocus
          className="mt-3 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-2"
        />
        <div className="mt-4 hstack justify-between">
          {!criando ? (
            <button onClick={excluir} className="hstack gap-1 text-xs font-semibold text-danger tap">
              <Trash2 size={14} /> Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="hstack gap-2">
            <button onClick={onFechar} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted tap">
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!titulo.trim() || salvando}
              className={cn('btn-primary !py-2 text-xs', (!titulo.trim() || salvando) && 'opacity-50')}
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Visor tela cheia (tap-through) ─────────────────────────────────────────
function VisorDestaque({ destaque, admin, onClose, onEditarDestaque, onMudou }) {
  const [itens, setItens] = useState(null)
  const [i, setI] = useState(0)
  const [prog, setProg] = useState(0) // 0..1 do item atual
  const [mudo, setMudo] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef(null)
  const videoRef = useRef(null)
  const timer = useRef(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('feed_destaque_itens_listar', { p_destaque_id: destaque.id })
    setItens(Array.isArray(data) ? data : [])
  }, [destaque.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const atual = itens && itens[i]

  // Avança automático: imagem por tempo; vídeo no onEnded.
  useEffect(() => {
    clearInterval(timer.current)
    setProg(0)
    if (!atual) return
    if (atual.tipo === 'imagem') {
      const t0 = Date.now()
      timer.current = setInterval(() => {
        const p = Math.min(1, (Date.now() - t0) / DUR_IMG)
        setProg(p)
        if (p >= 1) avancar()
      }, 50)
    }
    return () => clearInterval(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual?.id])

  function avancar() {
    clearInterval(timer.current)
    setI((v) => {
      if (itens && v < itens.length - 1) return v + 1
      onClose()
      return v
    })
  }
  function voltar() {
    clearInterval(timer.current)
    setI((v) => Math.max(0, v - 1))
  }

  async function subirItem(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const ehVideo = f.type.startsWith('video/')
    const ehImagem = f.type.startsWith('image/')
    if (!ehVideo && !ehImagem) return
    if (ehImagem && f.size > IMG_MAX) return alert('Imagem muito grande (máx. 15 MB).')
    if (ehVideo && f.size > VID_MAX) return alert('Vídeo muito grande (máx. 60 MB).')
    setEnviando(true)
    tapHaptic()
    const ext = (f.name.split('.').pop() || (ehVideo ? 'mp4' : 'jpg')).toLowerCase()
    const caminho = `${destaque.id}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('destaques')
      .upload(caminho, f, { cacheControl: '3600', contentType: f.type })
    if (upErr) {
      setEnviando(false)
      alert('Não foi possível enviar o arquivo.')
      return
    }
    const url = supabase.storage.from('destaques').getPublicUrl(caminho).data.publicUrl
    await supabase.rpc('feed_destaque_item_salvar', {
      p_id: null,
      p_destaque_id: destaque.id,
      p_tipo: ehVideo ? 'video' : 'imagem',
      p_media_url: url,
      p_legenda: null,
      p_ordem: null,
    })
    setEnviando(false)
    await carregar()
    onMudou?.()
  }

  async function excluirItem() {
    if (!atual) return
    if (!window.confirm('Excluir este item?')) return
    await supabase.rpc('feed_destaque_item_excluir', { p_id: atual.id })
    const restantes = (itens || []).filter((x) => x.id !== atual.id)
    setI((v) => Math.max(0, Math.min(v, restantes.length - 1)))
    setItens(restantes)
    onMudou?.()
    if (restantes.length === 0) onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[65] flex flex-col bg-black">
      {/* Barras de progresso */}
      <div className="safe-top hstack gap-1 px-3 pt-2">
        {(itens || []).map((it, idx) => (
          <span key={it.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <span
              className="block h-full bg-white"
              style={{ width: idx < i ? '100%' : idx === i ? `${prog * 100}%` : '0%' }}
            />
          </span>
        ))}
      </div>

      {/* Cabeçalho */}
      <div className="hstack items-center gap-2 px-4 py-2 text-white">
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">{destaque.titulo}</div>
        {admin && (
          <>
            <button onClick={() => inputRef.current?.click()} aria-label="Adicionar item" className="grid h-8 w-8 place-items-center rounded-full bg-white/15 tap">
              {enviando ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            </button>
            <button onClick={onEditarDestaque} aria-label="Editar destaque" className="grid h-8 w-8 place-items-center rounded-full bg-white/15 tap">
              <Pencil size={14} />
            </button>
            {atual && (
              <button onClick={excluirItem} aria-label="Excluir item" className="grid h-8 w-8 place-items-center rounded-full bg-white/15 tap">
                <Trash2 size={14} />
              </button>
            )}
          </>
        )}
        <button onClick={onClose} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white tap">
          <X size={16} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="relative min-h-0 flex-1">
        {itens === null ? (
          <div className="grid h-full place-items-center text-white/70">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : itens.length === 0 ? (
          <div className="grid h-full place-items-center px-8 text-center text-sm text-white/70">
            {admin ? 'Nenhum item ainda. Toque no + acima para adicionar imagem ou vídeo.' : 'Sem conteúdo.'}
          </div>
        ) : (
          <>
            {atual?.tipo === 'video' ? (
              <video
                ref={videoRef}
                key={atual.id}
                src={atual.media_url}
                className="h-full w-full object-contain"
                autoPlay
                muted={mudo}
                playsInline
                onEnded={avancar}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget
                  if (v.duration) setProg(v.currentTime / v.duration)
                }}
              />
            ) : (
              <img src={atual?.media_url} alt="" className="h-full w-full object-contain" />
            )}

            {/* Zonas de toque: esquerda = voltar, direita = avançar */}
            <button className="absolute inset-y-0 left-0 w-1/3" aria-label="Anterior" onClick={voltar} />
            <button className="absolute inset-y-0 right-0 w-1/3" aria-label="Próximo" onClick={avancar} />

            {atual?.tipo === 'video' && (
              <button
                onClick={() => setMudo((m) => !m)}
                aria-label={mudo ? 'Ativar som' : 'Silenciar'}
                className="absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white tap"
              >
                {mudo ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}

            {atual?.legenda && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-6 pt-10 text-sm text-white">
                {atual.legenda}
              </div>
            )}
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*,video/*" onChange={subirItem} className="hidden" />
    </div>,
    document.body,
  )
}

export default DestaquesFeed

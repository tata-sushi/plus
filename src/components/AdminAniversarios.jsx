import { useEffect, useRef, useState } from 'react'
import { Loader2, Trash2, ImagePlus, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

const TAM_MAX = 8 * 1024 * 1024 // 8 MB
const TIPOS = [
  { tipo: 'nascimento', label: 'Aniversário de vida' },
  { tipo: 'empresa', label: 'Aniversário de empresa' },
]

// Linha de mensagem editável (texto + ativa + salvar/excluir).
function MensagemLinha({ m, onSalvar, onExcluir }) {
  const [texto, setTexto] = useState(m.texto)
  const [ativo, setAtivo] = useState(m.ativo)
  const mudou = texto.trim() !== (m.texto || '').trim() || ativo !== m.ativo
  return (
    <div className="card space-y-2 p-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        className="w-full resize-none bg-transparent text-sm outline-none"
      />
      <div className="hstack justify-between">
        <label className="hstack gap-2 text-xs text-muted">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativa
        </label>
        <div className="hstack gap-3">
          {mudou && texto.trim() && (
            <button
              onClick={() => onSalvar({ ...m, texto: texto.trim(), ativo })}
              className="btn-primary !px-3 !py-1.5 text-xs"
            >
              Salvar
            </button>
          )}
          <button onClick={() => onExcluir(m.id)} className="text-danger tap" aria-label="Excluir">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminAniversarios() {
  const [estado, setEstado] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(null) // tipo em upload, ou null
  const inputFoto = useRef(null)
  const tipoUpload = useRef('nascimento')

  async function carregar() {
    const { data } = await supabase.rpc('admin_aniversario_estado')
    setEstado(data || { config: [], mensagens: [], imagens: [] })
    setCarregando(false)
  }
  useEffect(() => {
    carregar()
  }, [])

  const ativoTipo = (tipo) => estado?.config?.find((c) => c.tipo === tipo)?.ativo ?? true

  async function alternarTipo(tipo) {
    await supabase.rpc('admin_aniversario_toggle', { p_tipo: tipo, p_ativo: !ativoTipo(tipo) })
    carregar()
  }
  async function salvarMsg(m) {
    await supabase.rpc('admin_aniversario_msg_salvar', {
      p_id: m.id ?? null,
      p_tipo: m.tipo,
      p_texto: m.texto,
      p_ativo: m.ativo ?? true,
    })
    carregar()
  }
  async function excluirMsg(id) {
    if (!window.confirm('Excluir esta mensagem?')) return
    await supabase.rpc('admin_aniversario_msg_excluir', { p_id: id })
    carregar()
  }
  async function toggleImg(img) {
    await supabase.rpc('admin_aniversario_img_salvar', {
      p_id: img.id,
      p_url: img.url,
      p_ativo: !img.ativo,
    })
    carregar()
  }
  async function excluirImg(id) {
    if (!window.confirm('Remover esta imagem?')) return
    await supabase.rpc('admin_aniversario_img_excluir', { p_id: id })
    carregar()
  }

  function pedirFoto(tipo) {
    tipoUpload.current = tipo
    inputFoto.current?.click()
  }
  async function subirFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !f.type.startsWith('image/') || f.size > TAM_MAX) return
    const tipo = tipoUpload.current
    setEnviando(tipo)
    const ext = (f.name.split('.').pop() || 'png').toLowerCase()
    const caminho = `aniversarios/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('comunicados')
      .upload(caminho, f, { contentType: f.type, cacheControl: '3600' })
    if (!error) {
      const url = supabase.storage.from('comunicados').getPublicUrl(caminho).data.publicUrl
      await supabase.rpc('admin_aniversario_img_salvar', {
        p_id: null,
        p_url: url,
        p_ativo: true,
        p_tipo: tipo,
      })
    }
    setEnviando(null)
    carregar()
  }

  if (carregando) {
    return (
      <div className="hstack justify-center py-16 text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }

  const imagens = estado?.imagens || []
  const msgs = estado?.mensagens || []

  return (
    <div className="space-y-8 px-5 py-4">
      <p className="text-xs leading-relaxed text-muted">
        No dia do aniversário de cada colaborador, aparece um card no carrossel com uma imagem e uma
        mensagem escolhidas ao acaso — de cada tipo, separadamente.
      </p>

      {TIPOS.map(({ tipo, label }) => {
        const imgsTipo = imagens.filter((i) => i.tipo === tipo)
        const msgsTipo = msgs.filter((m) => m.tipo === tipo)
        const on = ativoTipo(tipo)
        return (
          <div key={tipo} className="space-y-4">
            {/* Cabeçalho + liga/desliga */}
            <div className="hstack justify-between border-b border-line pb-2">
              <span className="font-display text-base font-bold">{label}</span>
              <button
                onClick={() => alternarTipo(tipo)}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                  on ? 'bg-accent' : 'bg-surface-3',
                )}
                aria-label={on ? 'Desativar' : 'Ativar'}
              >
                <span
                  className={cn(
                    'absolute top-0.5 block h-5 w-5 rounded-full bg-white transition-transform',
                    on ? 'translate-x-[22px]' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>

            {/* Imagens (pool aleatória do tipo) */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">
                Imagens
              </div>
              <div className="grid grid-cols-3 gap-2">
                {imgsTipo.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-line"
                  >
                    <img
                      src={img.url}
                      alt=""
                      className={cn('h-full w-full object-cover', !img.ativo && 'opacity-30')}
                    />
                    <button
                      onClick={() => excluirImg(img.id)}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white tap"
                      aria-label="Remover"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      onClick={() => toggleImg(img)}
                      className="absolute bottom-1 left-1 rounded-pill bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white tap"
                    >
                      {img.ativo ? 'Ativa' : 'Off'}
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => pedirFoto(tipo)}
                  className="grid aspect-square place-items-center rounded-xl border border-dashed border-line text-muted tap"
                  aria-label="Adicionar imagem"
                >
                  {enviando === tipo ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <ImagePlus size={22} />
                  )}
                </button>
              </div>
            </div>

            {/* Mensagens do tipo */}
            <div>
              <div className="mb-2 hstack justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">
                  Mensagens
                </span>
                <button
                  onClick={() => salvarMsg({ id: null, tipo, texto: 'Nova mensagem', ativo: true })}
                  className="hstack gap-1 text-xs font-semibold text-accent tap"
                >
                  <Plus size={14} /> Nova
                </button>
              </div>
              <div className="space-y-2">
                {msgsTipo.length === 0 && (
                  <div className="text-xs text-muted-2">Nenhuma mensagem.</div>
                )}
                {msgsTipo.map((m) => (
                  <MensagemLinha key={m.id} m={m} onSalvar={salvarMsg} onExcluir={excluirMsg} />
                ))}
              </div>
            </div>
          </div>
        )
      })}

      <input ref={inputFoto} type="file" accept="image/*" onChange={subirFoto} className="hidden" />
    </div>
  )
}

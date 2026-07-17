import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Plus,
  Send,
  X,
  Loader2,
  Trash2,
  Calendar,
  Image as ImageIcon,
  LayoutGrid,
  Smartphone,
  Bell,
  Eye,
  Megaphone,
  Archive,
  ArchiveRestore,
} from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const TAM_MAX = 15 * 1024 * 1024 // 15 MB

const TIPOS = [
  { v: 'comunicado', label: 'Comunicado' },
  { v: 'noticia', label: 'Notícia' },
  { v: 'aviso', label: 'Aviso' },
]

const dataBR = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : null)

export function AdminPublicacoes() {
  const { usuario } = useAuth()
  const matricula = usuario?.matricula

  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [verArquivados, setVerArquivados] = useState(false)
  const [opcoes, setOpcoes] = useState({ unidades: [], departamentos: [] })

  const [form, setForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [tipo, setTipo] = useState('comunicado')
  const [pushAviso, setPushAviso] = useState(true)
  const [dataEvento, setDataEvento] = useState('')
  const [validoDe, setValidoDe] = useState('')
  const [validoAte, setValidoAte] = useState('')
  const [alvoModo, setAlvoModo] = useState('todos')
  const [unidadesSel, setUnidadesSel] = useState([])
  const [departamentosSel, setDepartamentosSel] = useState([])
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState('')
  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState(null)
  const imgInput = useRef(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('admin_listar_publicacoes')
    setItens(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
    supabase.rpc('segmentacao_opcoes').then(({ data }) => {
      if (data) setOpcoes({ unidades: data.unidades || [], departamentos: data.departamentos || [] })
    })
  }, [carregar])

  function alternarLista(setter, valor) {
    setter((arr) => (arr.includes(valor) ? arr.filter((x) => x !== valor) : [...arr, valor]))
  }

  function escolherImagem(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) return setErro('Selecione uma imagem.')
    if (f.size > TAM_MAX) return setErro('Imagem muito grande (máx. 15 MB).')
    setErro('')
    if (imgPreview) URL.revokeObjectURL(imgPreview)
    setImgFile(f)
    setImgPreview(URL.createObjectURL(f))
  }

  function removerImagem() {
    if (imgPreview) URL.revokeObjectURL(imgPreview)
    setImgFile(null)
    setImgPreview('')
  }

  function abrirForm() {
    tapHaptic()
    setForm(true)
  }

  function fecharForm() {
    setForm(false)
    setTitulo('')
    setCorpo('')
    setTipo('comunicado')
    setPushAviso(true)
    setDataEvento('')
    setValidoDe('')
    setValidoAte('')
    setAlvoModo('todos')
    setUnidadesSel([])
    setDepartamentosSel([])
    setErro('')
    removerImagem()
  }

  async function publicar() {
    const t = titulo.trim()
    const c = corpo.trim()
    if (!t || !c || publicando || !matricula) return
    tapHaptic()
    setPublicando(true)
    setErro('')

    let imagem_url = null
    if (imgFile) {
      const ext = (imgFile.name.split('.').pop() || 'jpg').toLowerCase()
      const caminho = `${matricula}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('comunicados')
        .upload(caminho, imgFile, { cacheControl: '3600', contentType: imgFile.type })
      if (upErr) {
        setPublicando(false)
        setErro('Não foi possível enviar a imagem.')
        return
      }
      imagem_url = supabase.storage.from('comunicados').getPublicUrl(caminho).data.publicUrl
    }

    let p_alvos = null
    if (alvoModo === 'segmentar') {
      const arr = [
        ...unidadesSel.map((v) => ({ tipo: 'unidade', valor: v })),
        ...departamentosSel.map((v) => ({ tipo: 'departamento', valor: v })),
      ]
      if (arr.length) p_alvos = arr
    }

    const { data: novoId, error } = await supabase.rpc('publicar_conteudo', {
      p_titulo: t,
      p_corpo: c,
      p_tipo: tipo,
      p_imagem_url: imagem_url,
      p_data_evento: dataEvento || null,
      p_data_inicio: validoDe || null,
      p_data_fim: validoAte || null,
      p_alvos,
      p_push: tipo === 'aviso' ? pushAviso : false,
    })
    setPublicando(false)
    if (error) {
      setErro('Não foi possível publicar.')
      return
    }
    // aviso com push ligado: dispara no celular do público-alvo
    if (tipo === 'aviso' && pushAviso && novoId) {
      supabase.functions.invoke('enviar_push', { body: { pub_id: novoId } }).catch(() => {})
    }
    fecharForm()
    setCarregando(true)
    carregar()
  }

  async function alternarAtivo(item) {
    tapHaptic()
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i)))
    const { error } = await supabase
      .from('publicacoes')
      .update({ ativo: !item.ativo })
      .eq('id', item.id)
    if (error) {
      setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: item.ativo } : i)))
    }
  }

  async function excluir(item) {
    tapHaptic()
    const { error } = await supabase.from('publicacoes').delete().eq('id', item.id)
    setExcluindo(null)
    if (!error) setItens((prev) => prev.filter((i) => i.id !== item.id))
  }

  async function alternarArquivo(item) {
    tapHaptic()
    const novo = !item.arquivado
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, arquivado: novo } : i)))
    const { error } = await supabase.from('publicacoes').update({ arquivado: novo }).eq('id', item.id)
    if (error) {
      setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, arquivado: item.arquivado } : i)))
    }
  }

  const podePublicar = titulo.trim() && corpo.trim() && !publicando

  const lista = itens.filter(
    (p) =>
      (verArquivados ? p.arquivado : !p.arquivado) &&
      (filtroTipo === 'todos' || p.tipo === filtroTipo),
  )

  return (
    <>
      {/* Filtros */}
      <div className="hstack gap-2 px-5 pt-4">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="flex-1 rounded-card border border-line bg-surface px-3 py-2 text-xs text-text outline-none"
        >
          <option value="todos">Todos os tipos</option>
          <option value="comunicado">Comunicados</option>
          <option value="noticia">Notícias</option>
          <option value="aviso">Avisos</option>
        </select>
        <button
          onClick={() => setVerArquivados((v) => !v)}
          className={cn(
            'hstack gap-1.5 rounded-card border px-3 py-2 text-xs font-semibold tap',
            verArquivados ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted',
          )}
        >
          <Archive size={14} /> Arquivados
        </button>
      </div>

      {carregando ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <Section
          className="mt-4"
          title={`${verArquivados ? 'Arquivados' : 'Publicações'} (${lista.length})`}
        >
          {lista.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              {verArquivados
                ? 'Nada arquivado aqui.'
                : 'Nenhuma publicação. Toque em Novo comunicado pra criar.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {lista.map((p) => {
                const fim = p.data_fim ? new Date(p.data_fim + 'T23:59:59') : null
                const encerrado = fim && fim < new Date()
                return (
                  <Card key={p.id} className={cn('!p-3.5', (!p.ativo || encerrado) && 'opacity-60')}>
                    <div className="hstack items-start gap-3">
                      {p.imagem_url ? (
                        <img
                          src={p.imagem_url}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                          <Megaphone size={18} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="hstack gap-1.5">
                          <span className="pill bg-surface-2 text-[10px] uppercase text-muted">
                            {p.tipo}
                          </span>
                          {!p.ativo && (
                            <span className="pill bg-surface-2 text-[10px] text-muted-2">Inativo</span>
                          )}
                          {encerrado && p.ativo && (
                            <span className="pill bg-surface-2 text-[10px] text-muted-2">Encerrado</span>
                          )}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">{p.titulo}</div>
                        <div className="mt-1 hstack flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-2">
                          {p.no_carrossel && (
                            <span className="hstack gap-0.5">
                              <LayoutGrid size={11} /> Carrossel
                            </span>
                          )}
                          {p.notificar && (
                            <span className="hstack gap-0.5">
                              <Bell size={11} /> Sininho
                            </span>
                          )}
                          {p.push && (
                            <span className="hstack gap-0.5">
                              <Smartphone size={11} /> Push
                            </span>
                          )}
                          <span className="hstack gap-0.5">
                            <Eye size={11} /> {p.visualizacoes}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-2">
                          {new Date(p.created_at).toLocaleDateString('pt-BR')}
                          {p.alvos ? ' · segmentado' : ' · todos'}
                          {p.data_fim ? ` · até ${dataBR(p.data_fim)}` : ''}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <button
                          onClick={() => alternarAtivo(p)}
                          className={cn(
                            'relative h-6 w-10 rounded-full transition-colors tap',
                            p.ativo ? 'bg-accent' : 'bg-surface-2',
                          )}
                          aria-label={p.ativo ? 'Desativar' : 'Ativar'}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                              p.ativo ? 'left-[18px]' : 'left-0.5',
                            )}
                          />
                        </button>
                        <div className="hstack gap-2">
                          <button
                            onClick={() => alternarArquivo(p)}
                            className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-2 tap"
                            aria-label={p.arquivado ? 'Restaurar' : 'Arquivar'}
                          >
                            {p.arquivado ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                          </button>
                          <button
                            onClick={() => setExcluindo(p)}
                            className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-2 tap"
                            aria-label="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </Section>
      )}

      {/* Criar novo — no rodapé da lista */}
      <div className="px-5 pb-2 pt-4">
        <button onClick={abrirForm} className="btn-primary w-full !py-3 text-sm">
          <Plus size={16} /> Novo comunicado
        </button>
      </div>

      {/* Editor de novo comunicado */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
          <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-card border border-line bg-surface sm:rounded-card">
            <div className="hstack justify-between border-b border-line px-5 py-3.5">
              <div className="font-display text-base font-bold">Novo comunicado</div>
              <button onClick={fecharForm} className="text-muted tap" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título"
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none placeholder:text-muted-2"
              />
              <textarea
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                placeholder="Escreva o comunicado…"
                rows={4}
                className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />

              {/* Imagem */}
              {imgPreview ? (
                <div className="relative mt-2">
                  <img src={imgPreview} alt="" className="w-full rounded-card object-cover" />
                  <button
                    onClick={removerImagem}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur tap"
                    aria-label="Remover imagem"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => imgInput.current?.click()}
                  className="mt-2 hstack w-full justify-center gap-2 rounded-card border border-dashed border-line bg-surface px-4 py-3 text-sm font-semibold text-muted tap"
                >
                  <ImageIcon size={16} /> Adicionar imagem
                </button>
              )}
              <input
                ref={imgInput}
                type="file"
                accept="image/*"
                onChange={escolherImagem}
                className="hidden"
              />

              {/* Tipo */}
              <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-text outline-none"
              >
                {TIPOS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Onde aparece — derivado do tipo (aviso traz o push junto) */}
              {tipo === 'aviso' ? (
                <div className="mt-2 hstack w-full justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3">
                  <span className="hstack gap-1.5 text-sm font-medium text-muted">
                    <Bell size={14} className="text-accent" /> Sininho
                  </span>
                  <button
                    type="button"
                    onClick={() => setPushAviso((s) => !s)}
                    className="hstack gap-2 tap"
                    aria-label="Disparar push no celular"
                  >
                    <span className="hstack gap-1 text-xs font-semibold text-muted">
                      <Smartphone size={13} /> Push
                    </span>
                    <span
                      className={cn(
                        'relative h-6 w-10 shrink-0 rounded-full transition-colors',
                        pushAviso ? 'bg-accent' : 'bg-surface-2',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                          pushAviso ? 'left-[18px]' : 'left-0.5',
                        )}
                      />
                    </span>
                  </button>
                </div>
              ) : (
                <div className="mt-2 hstack gap-2 rounded-card border border-line bg-surface px-3 py-2.5 text-[11px] font-medium text-muted">
                  <LayoutGrid size={13} className="text-accent" /> Aparece no carrossel da Home.
                </div>
              )}

              {/* Data do evento */}
              <label className="mt-2 hstack gap-3 rounded-card border border-line bg-surface px-4 py-3">
                <Calendar size={16} className="shrink-0 text-muted" />
                <span className="text-sm text-muted">Data do evento</span>
                <input
                  type="date"
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                  className="ml-auto bg-transparent text-sm text-text outline-none"
                />
              </label>

              {/* Validade */}
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <label className="hstack gap-2 rounded-card border border-line bg-surface px-3 py-2.5">
                  <span className="text-[11px] text-muted">Válido de</span>
                  <input
                    type="date"
                    value={validoDe}
                    onChange={(e) => setValidoDe(e.target.value)}
                    className="ml-auto bg-transparent text-xs text-text outline-none"
                  />
                </label>
                <label className="hstack gap-2 rounded-card border border-line bg-surface px-3 py-2.5">
                  <span className="text-[11px] text-muted">até</span>
                  <input
                    type="date"
                    value={validoAte}
                    onChange={(e) => setValidoAte(e.target.value)}
                    className="ml-auto bg-transparent text-xs text-text outline-none"
                  />
                </label>
              </div>

              {/* Público */}
              <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Público
              </label>
              <select
                value={alvoModo}
                onChange={(e) => setAlvoModo(e.target.value)}
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm text-text outline-none"
              >
                <option value="todos">Todos</option>
                <option value="segmentar">Segmentar por unidade/departamento</option>
              </select>

              {alvoModo === 'segmentar' && (
                <div className="mt-2 rounded-card border border-line bg-surface p-3">
                  {/* Unidades */}
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Unidades
                  </label>
                  <select
                    value=""
                    onChange={(e) => e.target.value && alternarLista(setUnidadesSel, e.target.value)}
                    className="mt-1.5 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm text-text outline-none"
                  >
                    <option value="">Adicionar unidade…</option>
                    {opcoes.unidades
                      .filter((u) => !unidadesSel.includes(u))
                      .map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                  </select>
                  {unidadesSel.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {unidadesSel.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => alternarLista(setUnidadesSel, u)}
                          className="hstack gap-1 rounded-pill bg-accent px-2.5 py-1 text-[11px] font-semibold text-black tap"
                        >
                          {u} <X size={11} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Departamentos */}
                  <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Departamentos
                  </label>
                  <select
                    value=""
                    onChange={(e) =>
                      e.target.value && alternarLista(setDepartamentosSel, e.target.value)
                    }
                    className="mt-1.5 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm text-text outline-none"
                  >
                    <option value="">Adicionar departamento…</option>
                    {opcoes.departamentos
                      .filter((d) => !departamentosSel.includes(d))
                      .map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </select>
                  {departamentosSel.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {departamentosSel.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => alternarLista(setDepartamentosSel, d)}
                          className="hstack gap-1 rounded-pill bg-accent px-2.5 py-1 text-[11px] font-semibold text-black tap"
                        >
                          {d} <X size={11} />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-2.5 text-[10px] leading-snug text-muted-2">
                    Aparece para quem está em qualquer unidade <b>ou</b> departamento escolhido.
                  </div>
                </div>
              )}

              {erro && <div className="mt-3 text-xs font-medium text-danger">{erro}</div>}
            </div>

            <div className="hstack gap-2 border-t border-line px-5 py-3.5">
              <button
                onClick={fecharForm}
                disabled={publicando}
                className="btn-ghost flex-1 !py-3 text-sm text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={publicar}
                disabled={!podePublicar}
                className={cn('btn-primary flex-1 !py-3 text-sm', !podePublicar && 'opacity-50')}
              >
                {publicando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={15} /> Publicar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {excluindo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-5">
            <div className="font-display text-base font-bold leading-tight">Excluir publicação?</div>
            <p className="mt-2 text-sm text-muted">
              <span className="font-semibold text-text">{excluindo.titulo}</span> será removida de
              vez (carrossel, página e histórico).
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

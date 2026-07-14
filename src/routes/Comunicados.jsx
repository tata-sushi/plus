import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Eye,
  Plus,
  Send,
  X,
  Loader2,
  Trash2,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { dataCurta, dataBR, ehHoje, eventoVigente } from '../lib/tempo.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const TAM_MAX = 15 * 1024 * 1024 // 15 MB

export function Comunicados() {
  const { usuario } = useAuth()
  const matricula = usuario?.matricula
  const admin = !!usuario?.podePublicar

  const [comunicados, setComunicados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [dataEvento, setDataEvento] = useState('')
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState('')
  const [publicando, setPublicando] = useState(false)
  const imgInput = useRef(null)

  const carregar = useCallback(async () => {
    // ler_comunicados registra a leitura e devolve o feed (contagem já certa)
    const { data, error } = await supabase.rpc('ler_comunicados')
    if (error) {
      setErro('Não foi possível carregar os comunicados.')
    } else {
      setComunicados(data || [])
      setErro('')
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function escolherImagem(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setErro('Selecione uma imagem.')
      return
    }
    if (f.size > TAM_MAX) {
      setErro('Imagem muito grande (máx. 15 MB).')
      return
    }
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

  function fecharForm() {
    setForm(false)
    setTitulo('')
    setCorpo('')
    setDataEvento('')
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

    const { data, error } = await supabase
      .from('comunicados')
      .insert({
        titulo: t,
        corpo: c,
        autor_matricula: matricula,
        data_evento: dataEvento || null,
        imagem_url,
      })
      .select('id, created_at')
      .single()
    setPublicando(false)
    if (error) {
      setErro('Não foi possível publicar.')
      return
    }
    setComunicados((prev) => [
      {
        id: data.id,
        titulo: t,
        corpo: c,
        autor_matricula: matricula,
        autor_nome: usuario?.nome,
        created_at: data.created_at,
        data_evento: dataEvento || null,
        imagem_url,
        visualizacoes: 1,
        lido: true,
      },
      ...prev,
    ])
    fecharForm()
  }

  async function excluir(id) {
    tapHaptic()
    const { error } = await supabase.from('comunicados').delete().eq('id', id)
    if (!error) setComunicados((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <>
      <Header />

      {/* Botão de publicar — só admin */}
      {admin && (
        <div className="px-5 pt-2">
          {!form ? (
            <button onClick={() => setForm(true)} className="btn-primary w-full !py-3 text-sm">
              <Plus size={16} /> Novo comunicado
            </button>
          ) : (
            <Card>
              <div className="hstack justify-between">
                <span className="font-display text-sm font-bold">Novo comunicado</span>
                <button onClick={fecharForm} className="text-muted tap" aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título"
                className="mt-3 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm font-semibold outline-none placeholder:text-muted-2"
              />
              <textarea
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                placeholder="Escreva o comunicado…"
                rows={4}
                className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />

              <label className="mt-2 hstack gap-3 rounded-card border border-line bg-surface px-4 py-3">
                <Calendar size={16} className="shrink-0 text-muted" />
                <span className="text-sm text-muted">Data do evento</span>
                <input
                  type="date"
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                  className="ml-auto bg-transparent text-sm text-text outline-none"
                />
                {dataEvento && (
                  <button
                    type="button"
                    onClick={() => setDataEvento('')}
                    className="text-muted-2 tap"
                    aria-label="Limpar data"
                  >
                    <X size={15} />
                  </button>
                )}
              </label>

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

              <button
                onClick={publicar}
                disabled={!titulo.trim() || !corpo.trim() || publicando}
                className={cn(
                  'btn-primary mt-3 w-full !py-3 text-sm',
                  (!titulo.trim() || !corpo.trim() || publicando) && 'opacity-50',
                )}
              >
                {publicando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={15} /> Publicar
                  </>
                )}
              </button>
            </Card>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3 px-5">
        {carregando && (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!carregando && erro && (
          <div className="rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-center text-xs font-medium text-danger">
            {erro}
          </div>
        )}

        {!carregando && !erro && comunicados.length === 0 && (
          <div className="py-10 text-center text-sm text-muted">Nenhum comunicado por enquanto.</div>
        )}

        {comunicados.map((c) => {
          const vigente = ehHoje(c.created_at) || eventoVigente(c.data_evento)
          return (
          <Card
            key={c.id}
            className={cn('reveal', vigente && 'ring-2 ring-accent/70 shadow-glow')}
          >
            <div className="hstack items-start justify-between gap-2">
              <h3 className="font-display text-base font-bold leading-snug">{c.titulo}</h3>
              {admin && (
                <button
                  onClick={() => excluir(c.id)}
                  className="shrink-0 text-muted-2 tap"
                  aria-label="Excluir comunicado"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{c.corpo}</p>

            {c.imagem_url && (
              <img
                src={c.imagem_url}
                alt=""
                className="mt-3 w-full rounded-2xl object-cover"
                loading="lazy"
              />
            )}

            {c.data_evento && (
              <div className="mt-2 hstack w-fit gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
                <Calendar size={12} /> Evento · {dataBR(c.data_evento)}
              </div>
            )}

            <div className="mt-3 hstack justify-between text-[11px] text-muted">
              <span>Data de publicação · {dataCurta(c.created_at)}</span>
              <span className="hstack gap-1">
                <Eye size={12} /> {c.visualizacoes}
              </span>
            </div>
          </Card>
          )
        })}
      </div>
    </>
  )
}

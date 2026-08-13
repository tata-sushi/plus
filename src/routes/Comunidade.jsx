import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Image as ImageIcon, Send, Loader2, Trash2, X, Gift } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { PhotoCropper } from '../components/PhotoCropper.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { tempoRelativo } from '../lib/tempo.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const TAM_MAX = 15 * 1024 * 1024 // 15 MB

// só o primeiro nome (nas postagens e comentários)
const soPrimeiro = (n) => (n || 'Colaborador').split(/\s+/)[0]

// Menções clicáveis: converte a marcação @[Nome](matricula) num link pro perfil
// da pessoa. Usado nas publicações direcionadas (robôs). Texto sem marcação passa
// intacto. Ex.: "Parabéns @[João Silva](24683)!" → "Parabéns @João Silva!" (link).
function comMencoes(texto) {
  if (!texto) return texto
  const re = /@\[([^\]]+)\]\(([\w-]+)\)/g
  const partes = []
  let ultimo = 0
  let m
  let k = 0
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index))
    partes.push(
      <Link
        key={`m${k++}`}
        to={`/perfil/${m[2]}`}
        onClick={(e) => e.stopPropagation()}
        className="font-semibold text-accent"
      >
        @{m[1]}
      </Link>,
    )
    ultimo = m.index + m[0].length
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo))
  return partes
}

// Post automático de resgate — card compacto (metade do tamanho), sem ações.
function ResgateCard({ post }) {
  const navigate = useNavigate()
  return (
    <Card className="reveal !p-3">
      <button
        onClick={() => post.autor_matricula && navigate(`/perfil/${post.autor_matricula}`)}
        className="hstack w-full gap-2.5 text-left tap"
      >
        <Avatar name={post.autor_nome || '—'} src={post.autor_avatar} size={30} />
        <div className="min-w-0 flex-1 text-xs leading-snug">
          <span className="font-semibold">{soPrimeiro(post.autor_nome)}</span>
          <span className="text-muted"> resgatou </span>
          <span className="font-semibold">{post.texto}</span>
        </div>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <Gift size={14} />
        </span>
      </button>
    </Card>
  )
}

// Mídia do post: carrossel deslizável quando há várias imagens (publicações
// dos robôs), ou foto única (posts normais). Sem imagem → não renderiza nada.
function PostMidia({ post }) {
  const imagens =
    Array.isArray(post.midias) && post.midias.length
      ? post.midias
      : post.midia_url
        ? [post.midia_url]
        : []
  const ref = useRef(null)
  const [ativo, setAtivo] = useState(0)

  if (imagens.length === 0) return null
  if (imagens.length === 1) {
    return (
      <img
        src={imagens[0]}
        alt=""
        className="mt-3 aspect-square w-full rounded-2xl object-cover"
        loading="lazy"
      />
    )
  }
  return (
    <div className="mt-3">
      <div
        ref={ref}
        onScroll={(e) =>
          setAtivo(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
        }
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
      >
        {imagens.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="aspect-square w-full shrink-0 snap-center object-cover"
            loading="lazy"
          />
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {imagens.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === ativo ? 'w-4 bg-accent' : 'w-1.5 bg-muted-2',
            )}
          />
        ))}
      </div>
    </div>
  )
}

function PostCard({ post, matricula, admin, meuNome, meuAvatar, onCurtir, onExcluir }) {
  const navigate = useNavigate()
  const [abrir, setAbrir] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [novo, setNovo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [total, setTotal] = useState(post.comentarios)

  const meuPost = post.autor_matricula === matricula
  const podeExcluir = meuPost || admin

  async function alternar() {
    tapHaptic()
    const abrindo = !abrir
    setAbrir(abrindo)
    if (abrindo && comentarios.length === 0 && total > 0) {
      setCarregando(true)
      const { data } = await supabase
        .from('feed_comentarios')
        .select('*')
        .eq('post_id', post.id)
      setComentarios(data || [])
      setCarregando(false)
    }
  }

  async function enviar(e) {
    e.preventDefault()
    const t = novo.trim()
    if (!t || enviando || !matricula) return
    tapHaptic()
    setEnviando(true)
    const { data, error } = await supabase
      .from('post_comentarios')
      .insert({ post_id: post.id, autor_matricula: matricula, texto: t })
      .select('id, created_at')
      .single()
    setEnviando(false)
    if (error) return
    setComentarios((prev) => [
      ...prev,
      {
        id: data.id,
        post_id: post.id,
        autor_matricula: matricula,
        autor_nome: meuNome,
        autor_avatar: meuAvatar,
        texto: t,
        created_at: data.created_at,
      },
    ])
    setTotal((n) => n + 1)
    setNovo('')
  }

  async function excluirComentario(c) {
    tapHaptic()
    const { error } = await supabase.from('post_comentarios').delete().eq('id', c.id)
    if (error) return
    setComentarios((prev) => prev.filter((x) => x.id !== c.id))
    setTotal((n) => Math.max(0, n - 1))
  }

  return (
    <Card className="reveal">
      {/* Autor */}
      <div className="hstack gap-3">
        <button
          onClick={() => post.autor_matricula && navigate(`/perfil/${post.autor_matricula}`)}
          className="hstack min-w-0 flex-1 gap-3 text-left tap"
        >
          <Avatar name={post.autor_nome || '—'} src={post.autor_avatar} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{soPrimeiro(post.autor_nome)}</div>
            <div className="text-[11px] text-muted">{tempoRelativo(post.created_at)}</div>
          </div>
        </button>
        {podeExcluir && (
          <button
            onClick={() => onExcluir(post)}
            className="shrink-0 text-muted-2 tap"
            aria-label="Excluir publicação"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Título (publicações ricas dos robôs) */}
      {post.titulo && (
        <h3 className="mt-3 font-display text-[15px] font-bold leading-snug">
          {comMencoes(post.titulo)}
        </h3>
      )}

      {/* Texto */}
      {post.texto && (
        <p className={cn('whitespace-pre-wrap text-sm', post.titulo ? 'mt-1' : 'mt-3')}>
          {comMencoes(post.texto)}
        </p>
      )}

      {/* Mídia — carrossel (várias) ou foto única */}
      <PostMidia post={post} />

      {/* Link / botão de ação (CTA) */}
      {post.link_url && post.link_label && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-3 flex w-full justify-center !py-2.5 text-xs"
        >
          {post.link_label}
        </a>
      )}

      {/* Ações */}
      <div className="mt-3 hstack gap-5 text-xs font-semibold text-muted">
        <button
          onClick={() => onCurtir(post)}
          className={cn('hstack gap-1.5 tap', post.curtiu && 'text-accent')}
          aria-label="Curtir"
        >
          <Heart size={16} fill={post.curtiu ? 'currentColor' : 'none'} /> {post.likes}
        </button>
        <button onClick={alternar} className={cn('hstack gap-1.5 tap', abrir && 'text-text')}>
          <MessageCircle size={16} /> {total}
        </button>
      </div>

      {/* Comentários */}
      {abrir && (
        <div className="mt-3 border-t border-line pt-3">
          {carregando && (
            <div className="hstack justify-center py-2 text-muted-2">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
          <div className="flex flex-col gap-3">
            {comentarios.map((c) => {
              const podeApagar = admin || c.autor_matricula === matricula
              return (
                <div key={c.id} className="hstack items-start gap-2">
                  <Avatar name={c.autor_nome || '—'} src={c.autor_avatar} size={28} />
                  <div className="min-w-0 flex-1 rounded-2xl bg-surface px-3 py-2">
                    <div className="hstack gap-2">
                      <span className="text-xs font-semibold">{soPrimeiro(c.autor_nome)}</span>
                      <span className="text-[10px] text-muted-2">{tempoRelativo(c.created_at)}</span>
                      {podeApagar && (
                        <button
                          onClick={() => excluirComentario(c)}
                          className="ml-auto shrink-0 text-muted-2 tap"
                          aria-label="Excluir comentário"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.texto}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={enviar} className="mt-3 hstack gap-2">
            <input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder="Escreva um comentário…"
              className="w-full rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none placeholder:text-muted-2"
            />
            <button
              type="submit"
              disabled={!novo.trim() || enviando}
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-black tap',
                (!novo.trim() || enviando) && 'opacity-50',
              )}
              aria-label="Enviar comentário"
            >
              {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </div>
      )}
    </Card>
  )
}

export function Comunidade() {
  const { usuario } = useAuth()
  const matricula = usuario?.matricula
  const admin = usuario?.podePublicar
  const meuNome = usuario?.nome || 'Você'
  const meuAvatar = usuario?.avatarUrl

  const [posts, setPosts] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [texto, setTexto] = useState('')
  const [publicando, setPublicando] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const inputFoto = useRef(null)
  const cropperRef = useRef(null)

  const carregarFeed = useCallback(async () => {
    const { data, error } = await supabase.from('feed_posts').select('*')
    if (error) {
      setErro('Não foi possível carregar o feed.')
    } else {
      setPosts(data || [])
      setErro('')
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregarFeed()
  }, [carregarFeed])

  function escolherFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = '' // permite re-selecionar o mesmo arquivo
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
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArquivo(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  function removerFoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArquivo(null)
    setPreviewUrl('')
  }

  const podePublicar = (texto.trim() !== '' || arquivo) && !publicando && !!matricula

  async function publicar() {
    if (!podePublicar) return
    const t = texto.trim()
    tapHaptic()
    setPublicando(true)
    setErro('')

    let midia_url = null
    let midia_tipo = null

    if (arquivo) {
      // usa o recorte 1:1 enquadrado pelo usuário (fallback: arquivo original)
      const blob = (await cropperRef.current?.getBlob()) || arquivo
      const caminho = `${matricula}/${crypto.randomUUID()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('comunidade')
        .upload(caminho, blob, { cacheControl: '3600', contentType: 'image/jpeg' })
      if (upErr) {
        setPublicando(false)
        setErro('Não foi possível enviar a imagem.')
        return
      }
      midia_url = supabase.storage.from('comunidade').getPublicUrl(caminho).data.publicUrl
      midia_tipo = 'foto'
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({ autor_matricula: matricula, texto: t || null, midia_url, midia_tipo })
      .select('id, created_at')
      .single()
    setPublicando(false)
    if (error) {
      setErro('Não foi possível publicar. Tente novamente.')
      return
    }

    setPosts((prev) => [
      {
        id: data.id,
        autor_matricula: matricula,
        autor_nome: meuNome,
        autor_avatar: meuAvatar,
        autor_cargo: usuario?.cargo || '',
        autor_unidade: usuario?.loja || '',
        texto: t || null,
        midia_url,
        midia_tipo,
        created_at: data.created_at,
        likes: 0,
        comentarios: 0,
        curtiu: false,
      },
      ...prev,
    ])
    setTexto('')
    removerFoto()
  }

  async function curtir(post) {
    if (!matricula) return
    tapHaptic()
    const curtindo = !post.curtiu
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, curtiu: curtindo, likes: p.likes + (curtindo ? 1 : -1) } : p,
      ),
    )
    const req = curtindo
      ? supabase.from('post_likes').insert({ post_id: post.id, autor_matricula: matricula })
      : supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('autor_matricula', matricula)
    const { error } = await req
    if (error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, curtiu: !curtindo, likes: p.likes + (curtindo ? -1 : 1) }
            : p,
        ),
      )
    }
  }

  async function excluir(post) {
    tapHaptic()
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== post.id))
  }

  return (
    <>
      <Header />

      {/* Publicar */}
      <div className="px-5 pt-2">
        <Card>
          <div className="hstack gap-3">
            <Avatar name={meuNome} src={meuAvatar} size={40} />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Compartilhe algo com a equipe…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            />
          </div>

          {/* Prévia da foto escolhida */}
          {previewUrl && (
            <div className="relative mt-3">
              <PhotoCropper ref={cropperRef} src={previewUrl} />
              <button
                onClick={removerFoto}
                className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur tap"
                aria-label="Remover foto"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            onChange={escolherFoto}
            className="hidden"
          />

          <div className="mt-3 hstack justify-between border-t border-line pt-3">
            <button
              onClick={() => inputFoto.current?.click()}
              className="hstack gap-1.5 text-xs font-semibold text-muted tap"
            >
              <ImageIcon size={16} /> Foto
            </button>
            <button
              onClick={publicar}
              disabled={!podePublicar}
              className={cn('btn-primary !py-2 text-xs', !podePublicar && 'opacity-50')}
            >
              {publicando ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Send size={14} /> Publicar
                </>
              )}
            </button>
          </div>

          {erro && !carregando && (
            <div className="mt-2 text-[11px] font-medium text-danger">{erro}</div>
          )}
        </Card>
      </div>

      {/* Feed */}
      <div className="mt-4 flex flex-col gap-3 px-5">
        {carregando && (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!carregando && erro && posts.length === 0 && (
          <div className="rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-center text-xs font-medium text-danger">
            {erro}
          </div>
        )}

        {!carregando && !erro && posts.length === 0 && (
          <div className="py-10 text-center text-sm text-muted">
            Ainda não há publicações. Seja o primeiro a compartilhar! 🎉
          </div>
        )}

        {posts.map((post) =>
          post.tipo === 'resgate' ? (
            <ResgateCard key={post.id} post={post} />
          ) : (
            <PostCard
              key={post.id}
              post={post}
              matricula={matricula}
              admin={admin}
              meuNome={meuNome}
              meuAvatar={meuAvatar}
              onCurtir={curtir}
              onExcluir={excluir}
            />
          ),
        )}
      </div>
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'
import {
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Video,
  Play,
  Send,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { tempoRelativo } from '../lib/tempo.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

function PostCard({ post, matricula, meuNome, onCurtir, onExcluir }) {
  const [abrir, setAbrir] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [novo, setNovo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [total, setTotal] = useState(post.comentarios)

  const meuPost = post.autor_matricula === matricula

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
        texto: t,
        created_at: data.created_at,
      },
    ])
    setTotal((n) => n + 1)
    setNovo('')
  }

  return (
    <Card className="reveal">
      {/* Autor */}
      <div className="hstack gap-3">
        <Avatar name={post.autor_nome || '—'} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{post.autor_nome || 'Colaborador'}</div>
          <div className="text-[11px] text-muted">
            {post.autor_cargo}
            {post.autor_cargo ? ' · ' : ''}
            {tempoRelativo(post.created_at)}
          </div>
        </div>
        {meuPost && (
          <button
            onClick={() => onExcluir(post)}
            className="shrink-0 text-muted-2 tap"
            aria-label="Excluir publicação"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Texto */}
      {post.texto && <p className="mt-3 whitespace-pre-wrap text-sm">{post.texto}</p>}

      {/* Mídia */}
      {post.midia_url && post.midia_tipo === 'foto' && (
        <img
          src={post.midia_url}
          alt=""
          className="mt-3 w-full rounded-2xl object-cover"
          loading="lazy"
        />
      )}
      {post.midia_url && post.midia_tipo === 'video' && (
        <video src={post.midia_url} controls className="mt-3 w-full rounded-2xl" />
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
        <button onClick={alternar} className={cn('hstack gap-1.5 tap', abrir && 'text-white')}>
          <MessageCircle size={16} /> {total}
        </button>
        <Share2 size={16} className="ml-auto" />
      </div>

      {/* Comentários */}
      {abrir && (
        <div className="mt-3 border-t border-white/5 pt-3">
          {carregando && (
            <div className="hstack justify-center py-2 text-muted-2">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
          <div className="flex flex-col gap-3">
            {comentarios.map((c) => (
              <div key={c.id} className="hstack items-start gap-2">
                <Avatar name={c.autor_nome || '—'} size={28} />
                <div className="min-w-0 flex-1 rounded-2xl bg-surface px-3 py-2">
                  <div className="hstack gap-2">
                    <span className="text-xs font-semibold">{c.autor_nome || 'Colaborador'}</span>
                    <span className="text-[10px] text-muted-2">{tempoRelativo(c.created_at)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.texto}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={enviar} className="mt-3 hstack gap-2">
            <input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder="Escreva um comentário…"
              className="w-full rounded-full border border-white/10 bg-surface px-4 py-2 text-sm outline-none placeholder:text-muted-2"
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
  const meuNome = usuario?.nome || 'Você'

  const [posts, setPosts] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [texto, setTexto] = useState('')
  const [publicando, setPublicando] = useState(false)
  const [avisoMidia, setAvisoMidia] = useState(false)

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

  async function publicar() {
    const t = texto.trim()
    if (!t || publicando || !matricula) return
    tapHaptic()
    setPublicando(true)
    const { data, error } = await supabase
      .from('posts')
      .insert({ autor_matricula: matricula, texto: t })
      .select('id, created_at')
      .single()
    setPublicando(false)
    if (error) {
      setErro('Não foi possível publicar. Tente novamente.')
      return
    }
    setErro('')
    setPosts((prev) => [
      {
        id: data.id,
        autor_matricula: matricula,
        autor_nome: meuNome,
        autor_cargo: usuario?.cargo || '',
        autor_unidade: usuario?.loja || '',
        texto: t,
        midia_url: null,
        midia_tipo: null,
        created_at: data.created_at,
        likes: 0,
        comentarios: 0,
        curtiu: false,
      },
      ...prev,
    ])
    setTexto('')
    setAvisoMidia(false)
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
      // reverte em caso de falha
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
            <Avatar name={meuNome} size={40} />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Compartilhe algo com a equipe…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            />
          </div>
          <div className="mt-3 hstack justify-between border-t border-white/5 pt-3">
            <div className="hstack gap-4 text-xs font-semibold text-muted">
              <button onClick={() => setAvisoMidia(true)} className="hstack gap-1.5 tap">
                <ImageIcon size={16} /> Foto
              </button>
              <button onClick={() => setAvisoMidia(true)} className="hstack gap-1.5 tap">
                <Video size={16} /> Vídeo
              </button>
            </div>
            <button
              onClick={publicar}
              disabled={!texto.trim() || publicando || !matricula}
              className={cn(
                'btn-primary !py-2 text-xs',
                (!texto.trim() || publicando || !matricula) && 'opacity-50',
              )}
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
          {avisoMidia && (
            <div className="mt-2 text-[11px] text-muted">
              Envio de foto e vídeo disponível em breve.
            </div>
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

        {!carregando && erro && (
          <div className="rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-center text-xs font-medium text-danger">
            {erro}
          </div>
        )}

        {!carregando && !erro && posts.length === 0 && (
          <div className="py-10 text-center text-sm text-muted">
            Ainda não há publicações. Seja o primeiro a compartilhar! 🎉
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            matricula={matricula}
            meuNome={meuNome}
            onCurtir={curtir}
            onExcluir={excluir}
          />
        ))}
      </div>
    </>
  )
}

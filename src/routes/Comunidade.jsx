import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Video,
  Play,
  Send,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { currentUser, getColaborador, feedComunidade } from '../lib/mockData.js'

function Post({ post, onCurtir }) {
  const autor = getColaborador(post.autorId)
  if (!autor) return null
  return (
    <Card className="reveal">
      {/* Autor */}
      <div className="hstack gap-3">
        <Link to={`/perfil/${autor.id}`} className="tap">
          <Avatar name={autor.nome} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/perfil/${autor.id}`} className="text-sm font-semibold">
            {autor.nome}
          </Link>
          <div className="text-[11px] text-muted">
            {autor.cargo} · {post.tempo}
          </div>
        </div>
      </div>

      {/* Texto */}
      {post.texto && <p className="mt-3 text-sm">{post.texto}</p>}

      {/* Mídia */}
      {post.midia && (
        <div
          className={cn(
            'relative mt-3 grid place-items-center overflow-hidden rounded-2xl bg-gradient-to-br text-6xl',
            post.midia.grad,
            post.midia.tipo === 'video' ? 'aspect-video' : 'aspect-square',
          )}
        >
          <span>{post.midia.emoji}</span>
          {post.midia.tipo === 'video' && (
            <span className="absolute grid h-14 w-14 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
              <Play size={26} fill="currentColor" />
            </span>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="mt-3 hstack gap-5 text-xs font-semibold text-muted">
        <button
          onClick={() => onCurtir(post.id)}
          className={cn('hstack gap-1.5 tap', post.curtiu && 'text-accent')}
          aria-label="Curtir"
        >
          <Heart size={16} fill={post.curtiu ? 'currentColor' : 'none'} /> {post.likes}
        </button>
        <span className="hstack gap-1.5">
          <MessageCircle size={16} /> {post.comentarios}
        </span>
        <Share2 size={16} className="ml-auto" />
      </div>
    </Card>
  )
}

export function Comunidade() {
  const [posts, setPosts] = useState(feedComunidade)
  const [texto, setTexto] = useState('')
  const [avisoMidia, setAvisoMidia] = useState(false)

  function curtir(id) {
    tapHaptic()
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, curtiu: !p.curtiu, likes: p.likes + (p.curtiu ? -1 : 1) } : p,
      ),
    )
  }

  function publicar() {
    const t = texto.trim()
    if (!t) return
    tapHaptic()
    setPosts((prev) => [
      {
        id: `novo_${prev.length}_${t.length}`,
        autorId: currentUser.id,
        tempo: 'agora',
        texto: t,
        likes: 0,
        comentarios: 0,
        curtiu: false,
      },
      ...prev,
    ])
    setTexto('')
    setAvisoMidia(false)
  }

  return (
    <>
      <Header />

      {/* Publicar */}
      <div className="px-5 pt-2">
        <Card>
          <div className="hstack gap-3">
            <Avatar name={currentUser.nome} size={40} />
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
              disabled={!texto.trim()}
              className={cn('btn-primary !py-2 text-xs', !texto.trim() && 'opacity-50')}
            >
              <Send size={14} /> Publicar
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
        {posts.map((post) => (
          <Post key={post.id} post={post} onCurtir={curtir} />
        ))}
      </div>
    </>
  )
}

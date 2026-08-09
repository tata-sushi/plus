import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Trash2, Plus, Music2, Trophy, Play } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

// Rádio Tatá — espaço colaborativo de descoberta musical. O time compartilha,
// curte e vota nas músicas; a REPRODUÇÃO acontece no próprio Spotify (o botão
// "ouvir" abre a faixa no app/site do Spotify — sem player embutido, sem risco).
// PROTÓTIPO: por enquanto os dados ficam só no aparelho (localStorage).
const CHAVE = 'tata:radio:v1'

const spotifyUrl = (trackId) => `https://open.spotify.com/track/${trackId}`
const playlistUrl = (id) => `https://open.spotify.com/playlist/${id}`

// Capa do topo (hero) da Rádio — arte oficial (imagem quadrada em /public/icons/).
const CAPA_RADIO = '/icons/radio-capa.webp'

// Extrai o ID (22 chars) de um link/URI de faixa do Spotify.
function extrairTrackId(txt) {
  if (!txt) return null
  const m = String(txt).match(/track[/:]([A-Za-z0-9]{22})/)
  if (m) return m[1]
  const bruto = String(txt).trim()
  return /^[A-Za-z0-9]{22}$/.test(bruto) ? bruto : null
}

// Metadados (título + capa) pelo oEmbed público do Spotify — sem chave de API.
async function buscarMeta(trackId) {
  try {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl(trackId))}`
    const r = await fetch(url)
    if (!r.ok) return null
    const j = await r.json()
    return { titulo: j.title || null, capa: j.thumbnail_url || null }
  } catch {
    return null
  }
}

function carregar() {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (Array.isArray(v)) return v
  } catch {
    // storage indisponível — segue com o seed
  }
  const agora = Date.now()
  return [
    { id: 's1', trackId: '0VjIjW4GlUZAMYd2vXMi3b', por: 'Tatá', curtidas: 5, euCurti: false, ts: agora - 2 * 86400000 },
    { id: 's2', trackId: '7qiZfU4dY1lWllzX7mPBI3', por: 'Tatá', curtidas: 3, euCurti: false, ts: agora - 1 * 86400000 },
  ]
}

function salvar(lista) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista))
  } catch {
    // sem persistência (modo privado) — segue só na sessão
  }
}

function Capa({ src, size = 'h-11 w-11' }) {
  return (
    <div className={cn('shrink-0 overflow-hidden rounded-lg bg-surface-2', size)}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid h-full w-full place-items-center text-muted-2">
          <Music2 size={18} />
        </div>
      )}
    </div>
  )
}

export function Radio() {
  const { usuario } = useAuth()
  const [lista, setLista] = useState(carregar)
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [sync, setSync] = useState(null) // { ok, msg } — resultado do espelho no Spotify
  const [playlistId, setPlaylistId] = useState(null)
  const tentados = useRef(new Set())

  useEffect(() => {
    salvar(lista)
  }, [lista])

  // URL da playlist do Spotify (aparece quando a conta estiver conectada).
  useEffect(() => {
    supabase.rpc('radio_playlist_url').then(({ data }) => setPlaylistId(data || null))
  }, [])

  // Enriquece com título/capa (oEmbed) as faixas que ainda não têm — uma vez cada.
  useEffect(() => {
    const faltando = lista.filter((m) => !m.titulo && !tentados.current.has(m.trackId))
    if (!faltando.length) return
    let vivo = true
    faltando.forEach((m) => {
      tentados.current.add(m.trackId)
      buscarMeta(m.trackId).then((meta) => {
        if (vivo && meta) setLista((l) => l.map((x) => (x.id === m.id ? { ...x, ...meta } : x)))
      })
    })
    return () => {
      vivo = false
    }
  }, [lista])

  const semana = useMemo(() => {
    if (!lista.length) return null
    return [...lista].sort((a, b) => b.curtidas - a.curtidas || b.ts - a.ts)[0]
  }, [lista])
  const ordenada = useMemo(() => [...lista].sort((a, b) => b.ts - a.ts), [lista])

  const admin = !!usuario?.podePublicar
  const meuNome = usuario?.primeiroNome || 'Você'

  // Tocar qualquer música abre a NOSSA playlist no Spotify (o mix do time) — o
  // play acontece lá dentro. O Spotify não permite tocar uma faixa específica
  // dentro de uma playlist por link, então sempre abrimos a playlist.
  const tocar = (trackId) => (playlistId ? playlistUrl(playlistId) : spotifyUrl(trackId))

  async function adicionar() {
    const id = extrairTrackId(link)
    if (!id) {
      setErro('Cole um link de faixa do Spotify.')
      return
    }
    if (lista.some((m) => m.trackId === id)) {
      setErro('Essa música já está na playlist.')
      return
    }
    setErro('')
    setLink('')
    setSync({ ok: null, msg: 'Adicionando ao Spotify…' })
    setLista((l) => [
      { id: 'm' + id, trackId: id, por: meuNome, curtidas: 0, euCurti: false, ts: Date.now() },
      ...l,
    ])
    // Espelha na playlist do Spotify e mostra o resultado (ajuda no teste).
    try {
      const { data, error } = await supabase.rpc('radio_add_spotify', { p_track: id })
      if (error) {
        setSync({ ok: false, msg: 'Não deu pra falar com o servidor agora.' })
      } else if (data?.ok) {
        setSync({ ok: true, msg: 'Adicionada à playlist do Spotify ✓' })
      } else {
        const motivos = {
          sem_acesso: 'Sua conta não tem acesso pra sincronizar com o Spotify.',
          nao_configurado: 'A playlist do Spotify ainda não está configurada.',
          auth_falhou: 'Falha ao autenticar no Spotify.',
          add_falhou: `O Spotify recusou a adição${data?.status ? ` (${data.status})` : ''}.`,
          track_invalido: 'Link de faixa inválido.',
        }
        setSync({ ok: false, msg: motivos[data?.erro] || 'Não foi possível adicionar no Spotify.' })
      }
    } catch {
      setSync({ ok: false, msg: 'Não deu pra falar com o servidor agora.' })
    }
  }

  function curtir(m) {
    setLista((l) =>
      l.map((x) =>
        x.id === m.id ? { ...x, euCurti: !x.euCurti, curtidas: x.curtidas + (x.euCurti ? -1 : 1) } : x,
      ),
    )
  }

  async function remover(m) {
    setLista((l) => l.filter((x) => x.id !== m.id))
    // Espelha a remoção na playlist do Spotify e mostra o resultado.
    setSync({ ok: null, msg: 'Removendo do Spotify…' })
    try {
      const { data, error } = await supabase.rpc('radio_remove_spotify', { p_track: m.trackId })
      if (error) {
        setSync({ ok: false, msg: 'Não deu pra falar com o servidor agora.' })
      } else if (data?.ok) {
        setSync({ ok: true, msg: 'Removida da playlist do Spotify ✓' })
      } else {
        const motivos = {
          sem_acesso: 'Sua conta não tem acesso pra sincronizar com o Spotify.',
          nao_configurado: 'A playlist do Spotify ainda não está configurada.',
          auth_falhou: 'Falha ao autenticar no Spotify.',
          muitas_faixas: 'A playlist é grande demais pra remover automaticamente.',
          remove_falhou: `O Spotify recusou a remoção${data?.status ? ` (${data.status})` : ''}.`,
        }
        setSync({ ok: false, msg: motivos[data?.erro] || 'Não foi possível remover do Spotify.' })
      }
    } catch {
      setSync({ ok: false, msg: 'Não deu pra falar com o servidor agora.' })
    }
  }

  return (
    <>
      <Header title="Rádio Tatá" />
      <Voltar />
      <div className="px-5 pt-2 pb-24">
        {/* Topo (hero estilo capa de playlist): capa + título em cima e, abaixo,
            a mensagem. A capa usa CAPA_RADIO (piloto: ícone do Tatá) — é só trocar
            a constante pela arte oficial quando tiver. */}
        <div className="mb-4 overflow-hidden rounded-card border border-line">
          <div className="hstack gap-3.5 bg-accent-soft p-4">
            {playlistId ? (
              <a
                href={playlistUrl(playlistId)}
                target="_blank"
                rel="noopener noreferrer"
                className="relative shrink-0 tap"
                aria-label="Abrir a playlist no Spotify"
              >
                <img
                  src={CAPA_RADIO}
                  alt="Capa da Rádio Tatá"
                  className="h-20 w-20 rounded-xl object-cover shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-black shadow">
                  <Play size={12} fill="currentColor" />
                </span>
              </a>
            ) : (
              <img
                src={CAPA_RADIO}
                alt="Capa da Rádio Tatá"
                className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-md"
              />
            )}
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-accent">
                Compartilhe cultura
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-display text-2xl font-bold leading-tight">Rádio Tatá</span>
                <span className="rounded-pill bg-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                  beta
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {lista.length} {lista.length === 1 ? 'música' : 'músicas'}
              </div>
            </div>
          </div>
          <p className="bg-surface-2 px-4 py-3.5 text-sm leading-relaxed text-text">
            Música também é uma forma de conhecer pessoas. Compartilhe o que faz parte do seu mundo,
            descubra novos sons e colabore para construir a playlist com o nosso estilo.
          </p>
        </div>

        {/* Adicionar música */}
        <div className="card p-3">
          <div className="hstack gap-2">
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value)
                setErro('')
                setSync(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              placeholder="Cole o link da música no Spotify"
              className="min-w-0 flex-1 rounded-pill bg-fill px-4 py-2.5 text-sm outline-none placeholder:text-muted-2"
            />
            <button onClick={adicionar} className="btn-primary shrink-0 !px-4 !py-2.5 text-sm">
              <Plus size={16} /> Add
            </button>
          </div>
          {erro && <p className="mt-2 text-xs font-medium text-danger">{erro}</p>}
          {sync && (
            <p
              className={cn(
                'mt-2 text-xs font-medium',
                sync.ok === true && 'text-accent',
                sync.ok === false && 'text-danger',
                sync.ok === null && 'text-muted',
              )}
            >
              {sync.msg}
            </p>
          )}
        </div>

        {/* Mais elogiada da semana passada (placeholder front: a mais curtida
            da lista do próprio aparelho — vira o campeão real do time quando
            houver base compartilhada). */}
        {semana && (
          <div className="mt-5">
            <div className="mb-2 hstack gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
              <Trophy size={14} /> Mais curtida da semana
            </div>
            <a
              href={tocar(semana.trackId)}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-card hstack w-full gap-3 p-3 text-left tap"
              aria-label="Abrir a playlist do time no Spotify"
            >
              <Capa src={semana.capa} size="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{semana.titulo || 'Faixa do Spotify'}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted">Indicada por {semana.por}</div>
                <div className="mt-1 hstack gap-1 text-[11px] font-semibold text-accent">
                  <Heart size={12} className="fill-current" /> {semana.curtidas}
                </div>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-black">
                <Play size={16} fill="currentColor" />
              </span>
            </a>
          </div>
        )}

        {/* Playlist */}
        <div className="mt-6 mb-2 hstack justify-between">
          <div className="font-display text-sm font-bold">Músicas compartilhadas</div>
          <div className="text-[11px] text-muted-2">
            {lista.length} {lista.length === 1 ? 'música' : 'músicas'}
          </div>
        </div>

        {ordenada.length === 0 ? (
          <div className="mt-6 rounded-card border border-dashed border-line px-4 py-10 text-center">
            <Music2 size={26} className="mx-auto text-muted-2" />
            <div className="mt-2 text-sm font-semibold">Playlist vazia</div>
            <div className="mt-1 text-xs text-muted">
              Cole o link de uma música do Spotify pra começar.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ordenada.map((m) => (
              <div key={m.id} className="card hstack gap-2.5 p-2.5">
                <a
                  href={tocar(m.trackId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hstack min-w-0 flex-1 gap-2.5 text-left tap"
                  aria-label="Abrir a playlist do time no Spotify"
                >
                  <Capa src={m.capa} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{m.titulo || 'Faixa do Spotify'}</div>
                    <div className="truncate text-[11px] text-muted">por {m.por}</div>
                  </div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-black">
                    <Play size={14} fill="currentColor" />
                  </span>
                </a>
                <div className="hstack shrink-0 gap-1.5">
                  <button
                    onClick={() => curtir(m)}
                    className={cn(
                      'hstack gap-1 rounded-pill px-2.5 py-1.5 text-xs font-semibold tap',
                      m.euCurti ? 'bg-accent-soft text-accent' : 'bg-fill text-muted',
                    )}
                  >
                    <Heart size={13} className={cn(m.euCurti && 'fill-current')} /> {m.curtidas}
                  </button>
                  {(admin || m.por === meuNome) && (
                    <button
                      onClick={() => remover(m)}
                      className="grid h-8 w-8 place-items-center rounded-pill bg-fill text-muted-2 tap"
                      aria-label="Remover música"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

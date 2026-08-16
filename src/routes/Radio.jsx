import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Heart, Trash2, Plus, Music2, Trophy, Play, Loader2, Headphones } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { PodcastTab } from './PodcastTab.jsx'

// Rádio Tatá — espaço colaborativo de descoberta musical. O time compartilha,
// curte e vota nas músicas; a REPRODUÇÃO acontece no próprio Spotify (tocar
// numa faixa abre a música; a capa do topo abre a playlist do time).
// Dados no backend (compartilhados entre todos): RPCs radio_listar / _adicionar
// / _curtir_toggle / _remover. Pontos entram na carteira/ranking do app.

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
  const [lista, setLista] = useState([])
  const [semana, setSemana] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [sync, setSync] = useState(null) // { ok, msg } — feedback de adicionar/remover
  const [policyOpen, setPolicyOpen] = useState(false) // aviso de política antes de adicionar
  const [playlistId, setPlaylistId] = useState(null)
  const tentados = useRef(new Set())

  const admin = !!usuario?.podePublicar
  const minhaMatricula = String(usuario?.matricula || '')

  // Rádio 2.0: abas Música / Podcast (em produção, para todos).
  const [aba, setAba] = useState('musica')
  const mostrarPodcast = aba === 'podcast'
  const [episodios, setEpisodios] = useState([])
  const [ouvidos, setOuvidos] = useState(() => new Set()) // episódios já concluídos (check persistente)

  // Episódios do podcast + os que a pessoa já concluiu.
  useEffect(() => {
    supabase.rpc('podcast_listar').then(({ data }) => setEpisodios(Array.isArray(data) ? data : []))
    supabase
      .rpc('podcast_meus_concluidos')
      .then(({ data }) => setOuvidos(new Set(Array.isArray(data) ? data : [])))
  }, [])

  // Carrega a lista compartilhada + o líder da semana (backend).
  async function carregarLista() {
    const { data } = await supabase.rpc('radio_listar')
    if (data && !data.erro) {
      setLista(Array.isArray(data.musicas) ? data.musicas : [])
      setSemana(data.semana || null)
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregarLista()
    supabase.rpc('radio_playlist_url').then(({ data }) => setPlaylistId(data || null))
  }, [])

  // Chegou via "Compartilhar → Tatá Plus" (?add=<trackId>): pré-preenche a
  // música e abre o aviso de política pra confirmar em 1 toque.
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const add = searchParams.get('add')
    if (add && /^[A-Za-z0-9]{22}$/.test(add)) {
      setLink(`https://open.spotify.com/track/${add}`)
      setPolicyOpen(true)
    }
  }, [searchParams])

  // Enriquece com capa (oEmbed) as faixas que ainda não têm — uma vez cada (só p/ exibir).
  useEffect(() => {
    const faltando = lista.filter((m) => !m.capa && !tentados.current.has(m.trackId))
    if (!faltando.length) return
    let vivo = true
    faltando.forEach((m) => {
      tentados.current.add(m.trackId)
      buscarMeta(m.trackId).then((meta) => {
        if (vivo && meta) {
          setLista((l) =>
            l.map((x) =>
              x.trackId === m.trackId
                ? { ...x, capa: x.capa || meta.capa, titulo: x.titulo || meta.titulo }
                : x,
            ),
          )
        }
      })
    })
    return () => {
      vivo = false
    }
  }, [lista])

  // Capa do herói: reaproveita a capa já enriquecida da lista, se houver.
  const semanaCapa = useMemo(
    () => (semana ? lista.find((m) => m.trackId === semana.trackId)?.capa || semana.capa : null),
    [semana, lista],
  )

  // Tocar uma música abre AQUELA faixa no Spotify (intuitivo). A playlist inteira
  // do time abre pela capa do topo / botão do fim.
  const tocar = (trackId) => spotifyUrl(trackId)

  // Ao tocar em "Add": valida o link e abre o aviso de política. A adição só
  // acontece depois que a pessoa confirma (confirmarAdicao).
  function adicionar() {
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
    setPolicyOpen(true)
  }

  async function confirmarAdicao() {
    setPolicyOpen(false)
    const id = extrairTrackId(link)
    if (!id) return
    setLink('')
    setSync({ ok: null, msg: 'Adicionando…' })
    const meta = await buscarMeta(id)
    try {
      const { data, error } = await supabase.rpc('radio_adicionar', {
        p_track: id,
        p_titulo: meta?.titulo || null,
        p_capa: meta?.capa || null,
      })
      if (error) {
        setSync({ ok: false, msg: 'Não deu pra falar com o servidor agora.' })
        return
      }
      if (!data?.ok) {
        const motivos = {
          sem_acesso: 'Sua conta não tem acesso à Rádio.',
          track_invalido: 'Link de faixa inválido.',
          sem_matricula: 'Não identifiquei seu cadastro.',
        }
        setSync({ ok: false, msg: motivos[data?.erro] || 'Não foi possível adicionar.' })
        return
      }
      if (data.ja_existe) {
        setSync({ ok: false, msg: 'Essa música já está na playlist.' })
        return
      }
      // Sem "validação" de inclusão — a música já aparece na lista. Só mostra
      // feedback quando há algo a comemorar (os +5 pontos da 1ª da semana).
      setSync(data.pontuou ? { ok: true, msg: 'Você ganhou +5 pontos!' } : null)
      await carregarLista()
    } catch {
      setSync({ ok: false, msg: 'Não deu pra falar com o servidor agora.' })
    }
  }

  async function curtir(m) {
    // Otimista: reflete na hora; reconcilia com a resposta do servidor.
    setLista((l) =>
      l.map((x) =>
        x.id === m.id ? { ...x, euCurti: !x.euCurti, curtidas: x.curtidas + (x.euCurti ? -1 : 1) } : x,
      ),
    )
    const { data, error } = await supabase.rpc('radio_curtir_toggle', { p_musica: m.id })
    setLista((l) =>
      l.map((x) =>
        x.id === m.id
          ? error || !data?.ok
            ? { ...x, euCurti: m.euCurti, curtidas: m.curtidas } // reverte
            : { ...x, euCurti: data.euCurti, curtidas: data.curtidas }
          : x,
      ),
    )
  }

  async function remover(m) {
    const antes = lista
    setLista((l) => l.filter((x) => x.id !== m.id))
    setSync({ ok: null, msg: 'Removendo…' })
    const { data, error } = await supabase.rpc('radio_remover', { p_musica: m.id })
    if (error || !data?.ok) {
      setLista(antes) // reverte
      const motivos = {
        sem_permissao: 'Você não pode remover essa música.',
        nao_encontrada: 'Música não encontrada.',
      }
      setSync({ ok: false, msg: (data && motivos[data.erro]) || 'Não deu pra remover agora.' })
      return
    }
    setSync(null)
  }

  return (
    <>
      <Header title="Rádio Tatá" />
      <Voltar />

      {/* Cabeçalho fixo da Rádio: o card "Rádio Tatá" não muda entre as abas;
          o seletor (Playlist/Podcasts) fica ABAIXO dele (só matrícula 7). */}
      <div className="px-5 pt-2">
        {/* Topo (hero estilo capa de playlist): capa + título em cima e, abaixo,
            a mensagem. A capa usa CAPA_RADIO (arte oficial da Rádio). */}
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
                Cultura e Informação
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-display text-2xl font-bold leading-tight">Rádio Tatá</span>
                <span className="rounded-pill bg-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                  beta
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {lista.length} {lista.length === 1 ? 'música' : 'músicas'}
                {episodios.length > 0 &&
                  ` · ${episodios.length} ${episodios.length === 1 ? 'podcast' : 'podcasts'}`}
              </div>
            </div>
          </div>
          <p className="bg-surface-2 px-4 py-3.5 text-sm leading-relaxed text-text">
            Música também é uma forma de conhecer pessoas. Compartilhe e descubra.
          </p>
        </div>

        {/* Seletor ABAIXO do card fixo: Playlist / Podcast */}
        <div className="-mt-1 mb-4">
          <div className="grid grid-cols-2 gap-1 rounded-pill border border-line bg-surface-2 p-1">
            <button
              onClick={() => setAba('musica')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-pill py-2 text-[13px] font-bold tap',
                aba === 'musica' ? 'bg-accent text-black' : 'text-muted',
              )}
            >
              <Music2 size={15} /> Playlist
            </button>
            <button
              onClick={() => setAba('podcast')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-pill py-2 text-[13px] font-bold tap',
                aba === 'podcast' ? 'bg-accent text-black' : 'text-muted',
              )}
            >
              <Headphones size={15} /> Podcast
            </button>
          </div>
        </div>
      </div>

      {mostrarPodcast && <PodcastTab episodios={episodios} ouvidos={ouvidos} />}

      {!mostrarPodcast && (
      <div className="px-5 pb-24">
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
          <p className="mt-2 text-[11px] text-muted-2">
            Ganhe <span className="font-semibold text-accent">+5 pontos</span> ao compartilhar (válido
            para um compartilhamento por semana).
          </p>
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

        {/* Mais curtida da semana (líder do time nesta semana, computado no backend) */}
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
              aria-label={`Ouvir ${semana.titulo || 'a música'} no Spotify`}
            >
              <Capa src={semanaCapa} size="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{semana.titulo || 'Faixa do Spotify'}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted">Indicada por {semana.por}</div>
                <div className="mt-1 hstack gap-1.5 text-[11px] font-semibold text-accent">
                  <Heart size={12} className="fill-current" /> {semana.curtidas} esta semana
                  <span className="font-medium text-muted-2">
                    · {semana.total ?? semana.curtidas} no total
                  </span>
                </div>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-black">
                <Play size={16} fill="currentColor" />
              </span>
            </a>
          </div>
        )}

        {/* Lista */}
        <div className="mt-6 mb-2 hstack justify-between">
          <div className="font-display text-sm font-bold">Músicas compartilhadas</div>
          <div className="text-[11px] text-muted-2">
            {lista.length} {lista.length === 1 ? 'música' : 'músicas'}
          </div>
        </div>

        {carregando ? (
          <div className="grid place-items-center py-12 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="mt-6 rounded-card border border-dashed border-line px-4 py-10 text-center">
            <Music2 size={26} className="mx-auto text-muted-2" />
            <div className="mt-2 text-sm font-semibold">Playlist vazia</div>
            <div className="mt-1 text-xs text-muted">
              Cole o link de uma música do Spotify pra começar.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lista.map((m) => (
              <div key={m.id} className="card hstack gap-2.5 p-2.5">
                <a
                  href={tocar(m.trackId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hstack min-w-0 flex-1 gap-2.5 text-left tap"
                  aria-label={`Ouvir ${m.titulo || 'a música'} no Spotify`}
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
                  {(admin || m.porMatricula === minhaMatricula) && (
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

        {/* Acesse e siga a playlist no Spotify — depois de todas as músicas */}
        {playlistId && (
          <a
            href={playlistUrl(playlistId)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-6 w-full !py-3 text-sm"
          >
            <Music2 size={16} /> Acesse e siga nossa playlist no Spotify
          </a>
        )}
      </div>
      )}

      {policyOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5"
          role="dialog"
          aria-modal="true"
          onClick={() => setPolicyOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-card border bg-surface p-5 shadow-xl"
            style={{ borderColor: 'rgb(var(--accent) / 0.55)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-bold text-text">⚠️ Antes de compartilhar</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Compartilhe com responsabilidade. Músicas com conteúdo ofensivo, linguagem imprópria ou
              incompatíveis com os valores e as políticas da Tatá poderão ser removidas e gerar medidas
              disciplinares, conforme a gravidade do conteúdo compartilhado.
            </p>
            <div className="mt-4 hstack gap-2">
              <button
                onClick={() => setPolicyOpen(false)}
                className="btn-ghost flex-1 !py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button onClick={confirmarAdicao} className="btn-primary flex-1 !py-2.5 text-sm">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

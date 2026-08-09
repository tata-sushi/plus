import { useEffect, useMemo, useState } from 'react'
import { Heart, Trash2, Plus, Music2, Trophy } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { cn } from '../lib/cn'

// Rádio Tatá — playlist colaborativa do Spotify. PROTÓTIPO: por enquanto roda
// só no aparelho (localStorage), sem backend. Quando ligar a base, é só trocar
// carregar/salvar/curtir/remover pelas RPCs (radio_playlist, radio_add, ...).
const CHAVE = 'tata:radio:v1'

// Extrai o ID (22 chars) de um link/URI de faixa do Spotify.
function extrairTrackId(txt) {
  if (!txt) return null
  const m = String(txt).match(/track[/:]([A-Za-z0-9]{22})/)
  if (m) return m[1]
  const bruto = String(txt).trim()
  return /^[A-Za-z0-9]{22}$/.test(bruto) ? bruto : null
}

function carregar() {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (Array.isArray(v)) return v
  } catch {
    // storage indisponível — segue com o seed
  }
  // Seed de exemplo (some assim que o time adiciona as próprias).
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

function SpotifyEmbed({ trackId }) {
  return (
    <iframe
      title="Spotify"
      src={`https://open.spotify.com/embed/track/${trackId}?utm_source=tata_plus`}
      width="100%"
      height="152"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="rounded-xl"
      style={{ border: 0 }}
    />
  )
}

export function Radio() {
  const { usuario } = useAuth()
  const [lista, setLista] = useState(carregar)
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    salvar(lista)
  }, [lista])

  // Música da Semana = mais curtida (empate → mais recente).
  const semana = useMemo(() => {
    if (!lista.length) return null
    return [...lista].sort((a, b) => b.curtidas - a.curtidas || b.ts - a.ts)[0]
  }, [lista])

  const admin = !!usuario?.podePublicar
  const meuNome = usuario?.primeiroNome || 'Você'
  const ordenada = useMemo(() => [...lista].sort((a, b) => b.ts - a.ts), [lista])

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
    setLink('')
    setLista((l) => [
      { id: 'm' + id, trackId: id, por: meuNome, curtidas: 0, euCurti: false, ts: Date.now() },
      ...l,
    ])
  }

  function curtir(m) {
    setLista((l) =>
      l.map((x) =>
        x.id === m.id ? { ...x, euCurti: !x.euCurti, curtidas: x.curtidas + (x.euCurti ? -1 : 1) } : x,
      ),
    )
  }

  function remover(m) {
    setLista((l) => l.filter((x) => x.id !== m.id))
  }

  return (
    <>
      <Header title="Rádio Tatá" />
      <Voltar />
      <div className="px-5 pt-2 pb-24">
        <p className="mb-4 text-sm text-muted">
          A playlist colaborativa do time. Cole um link do Spotify e some ao som do Tatá.{' '}
          <span className="font-semibold text-accent">(beta)</span>
        </p>

        {/* Adicionar música */}
        <div className="card p-3">
          <div className="hstack gap-2">
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value)
                setErro('')
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
        </div>

        {/* Música da Semana */}
        {semana && (
          <div className="mt-5">
            <div className="mb-2 hstack gap-1.5 text-xs font-bold uppercase tracking-wide text-accent">
              <Trophy size={14} /> Música da Semana
            </div>
            <div className="hero-card p-3">
              <SpotifyEmbed trackId={semana.trackId} />
              <div className="mt-2 hstack justify-between text-xs text-muted">
                <span>
                  Indicada por <strong className="text-text">{semana.por}</strong>
                </span>
                <span className="hstack gap-1 text-accent">
                  <Heart size={13} className="fill-current" /> {semana.curtidas}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Playlist */}
        <div className="mt-6 mb-2 hstack justify-between">
          <div className="font-display text-sm font-bold">Playlist do time</div>
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
          <div className="flex flex-col gap-2.5">
            {ordenada.map((m) => (
              <div key={m.id} className="card p-3">
                <SpotifyEmbed trackId={m.trackId} />
                <div className="mt-2 hstack justify-between">
                  <span className="min-w-0 truncate text-xs text-muted">
                    por <strong className="text-text">{m.por}</strong>
                  </span>
                  <div className="hstack shrink-0 gap-1.5">
                    <button
                      onClick={() => curtir(m)}
                      className={cn(
                        'hstack gap-1 rounded-pill px-3 py-1.5 text-xs font-semibold tap',
                        m.euCurti ? 'bg-accent-soft text-accent' : 'bg-fill text-muted',
                      )}
                    >
                      <Heart size={14} className={cn(m.euCurti && 'fill-current')} /> {m.curtidas}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

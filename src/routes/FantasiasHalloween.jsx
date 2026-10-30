import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Loader2,
  Ghost,
  Trophy,
  Trash2,
  ImagePlus,
  Check,
  X,
  Lock,
  Vote,
  UserPlus,
  Search,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { tapHaptic } from '../lib/haptics.js'
import { cn } from '../lib/cn'

const TAM_MAX = 8 * 1024 * 1024 // 8 MB
const MEDALHAS = ['🥇', '🥈', '🥉']

const ERROS = {
  encerrada: 'A votação está encerrada.',
  voto_proprio: 'Você não pode votar na sua própria fantasia 😉',
  sem_foto: 'Escolha uma foto.',
  sem_matricula: 'Escolha o colaborador.',
  sem_permissao: 'Sem permissão.',
  sem_acesso: 'Sessão expirada. Entre novamente.',
  inexistente: 'Essa fantasia não está mais no concurso.',
}

export function FantasiasHalloween() {
  const { usuario } = useAuth()
  const [estado, setEstado] = useState(null)
  const [lista, setLista] = useState(null)
  const [aviso, setAviso] = useState(null) // {tipo:'ok'|'erro', texto}
  const [enviando, setEnviando] = useState(false)
  const [preview, setPreview] = useState(null) // {arquivo, url, legenda, admin, alvo}
  const [modoAdmin, setModoAdmin] = useState(false)
  // busca de colaborador (fluxo admin)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const inputFoto = useRef(null)

  const carregar = useCallback(async () => {
    const [e, l] = await Promise.all([
      supabase.rpc('fantasia_estado'),
      supabase.rpc('fantasias_listar'),
    ])
    setEstado(e.data || null)
    setLista(l.error ? [] : l.data || [])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Ranking ao vivo: atualiza sozinho enquanto a página está aberta e visível.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') carregar()
    }, 12000)
    return () => clearInterval(t)
  }, [carregar])

  // Busca debounced de colaborador (só no fluxo admin "cadastrar por outro").
  useEffect(() => {
    if (!preview?.admin) return
    const t = busca.trim()
    if (t.length < 2) {
      setResultados([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    const timer = setTimeout(() => {
      supabase.rpc('buscar_colaboradores', { p_termo: t }).then(({ data }) => {
        setResultados(data || [])
        setBuscando(false)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [busca, preview?.admin])

  const aberto = estado?.aberto !== false
  const admin = !!(estado?.sou_admin || usuario?.podePublicar)

  function msg(tipo, texto) {
    setAviso({ tipo, texto })
    if (tipo === 'ok') setTimeout(() => setAviso(null), 2500)
  }

  function abrirInput(ehAdmin) {
    setModoAdmin(ehAdmin)
    inputFoto.current?.click()
  }

  function escolherFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) return msg('erro', 'Selecione uma imagem.')
    if (f.size > TAM_MAX) return msg('erro', 'Imagem muito grande (máx. 8 MB).')
    setAviso(null)
    setBusca('')
    setResultados([])
    setPreview({ arquivo: f, url: URL.createObjectURL(f), legenda: '', admin: modoAdmin, alvo: null })
  }

  async function publicar() {
    if (!preview?.arquivo || !usuario?.matricula) return
    if (preview.admin && !preview.alvo) return msg('erro', 'Escolha o colaborador.')
    tapHaptic()
    setEnviando(true)
    const f = preview.arquivo
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    // Sempre sobe na pasta de quem está enviando (regra do bucket); a dona da
    // fantasia é definida no RPC (admin pode gravar pra outra matrícula).
    const caminho = `${usuario.matricula}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('fantasias')
      .upload(caminho, f, { cacheControl: '3600', contentType: f.type })
    if (upErr) {
      setEnviando(false)
      return msg('erro', 'Não foi possível enviar a foto.')
    }
    const url = supabase.storage.from('fantasias').getPublicUrl(caminho).data.publicUrl
    const { data, error } = preview.admin
      ? await supabase.rpc('fantasia_admin_entrar', {
          p_matricula: preview.alvo.matricula,
          p_foto_url: url,
          p_titulo: preview.legenda || null,
        })
      : await supabase.rpc('fantasia_entrar', { p_foto_url: url, p_titulo: preview.legenda || null })
    setEnviando(false)
    if (error || !data?.ok) return msg('erro', ERROS[data?.erro] || 'Não foi possível publicar.')
    setPreview(null)
    msg('ok', preview.admin ? `Fantasia de ${preview.alvo.nome} cadastrada! 🎃` : 'Sua fantasia entrou no concurso! 🎃')
    carregar()
  }

  async function removerMinha() {
    tapHaptic()
    const { error } = await supabase.rpc('fantasia_remover_minha')
    if (error) return msg('erro', 'Não foi possível remover.')
    carregar()
  }

  async function votar(f) {
    if (!aberto || f.eh_minha) return
    tapHaptic()
    const jaEra = f.meu_voto
    setLista((prev) =>
      prev.map((x) => ({
        ...x,
        meu_voto: x.id === f.id ? !jaEra : false,
        votos:
          x.id === f.id
            ? x.votos + (jaEra ? -1 : 1)
            : x.meu_voto && !jaEra
              ? x.votos - 1
              : x.votos,
      })),
    )
    const { data, error } = jaEra
      ? await supabase.rpc('fantasia_tirar_voto')
      : await supabase.rpc('fantasia_votar', { p_fantasia: f.id })
    if (error || (data && data.ok === false)) {
      msg('erro', ERROS[data?.erro] || 'Não foi possível votar.')
    }
    carregar()
  }

  async function moderar(f) {
    if (!confirm(`Remover a fantasia de ${f.nome}?`)) return
    tapHaptic()
    const { error } = await supabase.rpc('fantasia_admin_remover', { p_id: f.id })
    if (error) return msg('erro', 'Não foi possível remover.')
    carregar()
  }

  async function toggleVotacao() {
    tapHaptic()
    const { error } = await supabase.rpc('fantasia_admin_toggle', { p_aberto: !aberto })
    if (error) return msg('erro', 'Não foi possível alterar.')
    carregar()
  }

  return (
    <>
      <Header />
      <Voltar to="/" />

      {/* Capa */}
      <div className="px-5 pt-3">
        <div className="relative overflow-hidden rounded-2xl border border-[#F2792B]/40 bg-gradient-to-br from-[#F2792B]/20 to-[#7c3aed]/15 px-5 py-6">
          <Ghost className="absolute -right-3 -top-3 text-[#F2792B]/25" size={96} />
          <div className="relative">
            <div className="text-2xl">🎃</div>
            <h1 className="mt-1 font-display text-xl font-bold leading-tight">
              Melhor Fantasia de Halloween
            </h1>
            <p className="mt-1 text-sm text-muted">
              {aberto
                ? 'Suba a foto da sua fantasia e vote na mais caprichada do time.'
                : 'Votação encerrada — confira o pódio!'}
            </p>
            {estado && (
              <div className="mt-2 hstack gap-3 text-[11px] text-muted-2">
                <span>{estado.total_fantasias || 0} fantasias</span>
                <span>·</span>
                <span>{estado.total_votos || 0} votos</span>
                {!aberto && (
                  <span className="pill bg-danger/15 text-[10px] text-danger">
                    <Lock size={10} /> Encerrada
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {aviso && (
        <div
          className={cn(
            'mx-5 mt-3 rounded-card border px-4 py-2.5 text-center text-xs font-semibold',
            aviso.tipo === 'ok'
              ? 'border-accent/30 bg-accent-soft text-accent'
              : 'border-danger/30 bg-danger/10 text-danger',
          )}
        >
          {aviso.texto}
        </div>
      )}

      {/* Controles do admin */}
      {admin && (
        <div className="px-5 pt-3 space-y-2">
          <button
            onClick={() => abrirInput(true)}
            className="hstack w-full justify-center gap-2 rounded-card border border-line bg-surface py-2.5 text-xs font-semibold tap"
          >
            <UserPlus size={14} /> Cadastrar fantasia de alguém
          </button>
          <button
            onClick={toggleVotacao}
            className={cn(
              'hstack w-full justify-center gap-2 rounded-card border py-2.5 text-xs font-semibold tap',
              aberto
                ? 'border-danger/30 bg-danger/10 text-danger'
                : 'border-accent/30 bg-accent-soft text-accent',
            )}
          >
            {aberto ? <Lock size={14} /> : <Vote size={14} />}
            {aberto ? 'Encerrar votação' : 'Reabrir votação'}
          </button>
        </div>
      )}

      {/* Minha fantasia */}
      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={escolherFoto}
        className="hidden"
      />
      {aberto && estado && (
        <div className="px-5 pt-3">
          {estado.tenho_entrada ? (
            <div className="hstack justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
              <div className="hstack gap-2 text-sm">
                <Check size={16} className="text-accent" />
                <span className="font-medium">Sua fantasia está no concurso</span>
              </div>
              <div className="hstack gap-3 text-xs font-semibold">
                <button onClick={() => abrirInput(false)} className="text-accent tap">
                  Trocar
                </button>
                <button onClick={removerMinha} className="text-danger tap">
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => abrirInput(false)}
              className="hstack w-full items-center justify-center gap-2 rounded-card border border-dashed border-[#F2792B]/50 bg-[#F2792B]/10 py-3.5 text-sm font-semibold text-[#F2792B] tap"
            >
              <ImagePlus size={18} /> Enviar minha fantasia
            </button>
          )}
        </div>
      )}

      {/* Grade de fantasias */}
      <Section className="mt-5 pb-24" title="Concorrentes">
        {lista == null ? (
          <div className="hstack justify-center py-12 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="card grid place-items-center gap-2 px-6 py-12 text-center text-muted">
            <Ghost size={30} className="text-muted-2" />
            <p className="text-sm">
              Ninguém entrou ainda. {aberto ? 'Seja o primeiro a subir sua fantasia! 👻' : ''}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {lista.map((f, i) => {
              const medalha = f.votos > 0 && i < 3 ? MEDALHAS[i] : null
              return (
                <div
                  key={f.id}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-2xl border bg-surface',
                    f.meu_voto ? 'border-accent' : 'border-line',
                  )}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-2">
                    <img src={f.foto_url} alt={f.titulo || f.nome} className="h-full w-full object-cover" />
                    {medalha && (
                      <span className="absolute left-2 top-2 text-2xl drop-shadow">{medalha}</span>
                    )}
                    {f.eh_minha && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur">
                        Sua
                      </span>
                    )}
                    {admin && (
                      <button
                        onClick={() => moderar(f)}
                        className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur tap"
                        aria-label="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <div className="truncate text-sm font-semibold leading-tight">{f.nome}</div>
                    {f.titulo && (
                      <div className="truncate text-[11px] text-muted">{f.titulo}</div>
                    )}
                    <div className="mt-1 hstack gap-1 text-[11px] font-semibold text-accent">
                      <Trophy size={12} /> {f.votos} {f.votos === 1 ? 'voto' : 'votos'}
                    </div>
                    {aberto && !f.eh_minha && (
                      <button
                        onClick={() => votar(f)}
                        className={cn(
                          'mt-2 w-full rounded-full py-2 text-center text-xs font-semibold tap',
                          f.meu_voto ? 'bg-accent text-black' : 'bg-surface-2 text-text',
                        )}
                      >
                        {f.meu_voto ? (
                          <span className="hstack justify-center gap-1">
                            <Check size={13} /> Votado
                          </span>
                        ) : (
                          'Votar'
                        )}
                      </button>
                    )}
                    {aberto && f.eh_minha && (
                      <div className="mt-2 w-full rounded-full bg-surface-2 py-2 text-center text-xs font-medium text-muted-2">
                        Você
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Preview antes de publicar */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !enviando && setPreview(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-sm flex-col overflow-hidden rounded-card border border-line bg-surface"
          >
            <div className="hstack justify-between border-b border-line px-5 py-3.5">
              <div className="font-display text-base font-bold">
                {preview.admin ? 'Cadastrar fantasia' : 'Sua fantasia'}
              </div>
              <button onClick={() => setPreview(null)} disabled={enviando} className="text-muted tap">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-surface-2">
                <img src={preview.url} alt="" className="h-full w-full object-cover" />
              </div>

              {/* Seletor de colaborador (só admin) */}
              {preview.admin && (
                <div className="mt-4">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    De quem é essa fantasia?
                  </label>
                  {preview.alvo ? (
                    <div className="mt-1.5 hstack justify-between gap-2 rounded-card border border-accent/40 bg-accent-soft px-3 py-2">
                      <div className="hstack gap-2 min-w-0">
                        <Avatar name={preview.alvo.nome} src={preview.alvo.avatar_url} size={32} />
                        <span className="truncate text-sm font-semibold">{preview.alvo.nome}</span>
                      </div>
                      <button
                        onClick={() => setPreview((p) => ({ ...p, alvo: null }))}
                        className="shrink-0 text-xs font-semibold text-accent tap"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-1.5 hstack gap-2 rounded-card border border-line bg-surface px-3 py-2.5">
                        <Search size={16} className="shrink-0 text-muted-2" />
                        <input
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          placeholder="Buscar colaborador por nome…"
                          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
                        />
                        {buscando && <Loader2 size={14} className="animate-spin text-muted-2" />}
                      </div>
                      {resultados.length > 0 && (
                        <div className="mt-1.5 max-h-52 overflow-y-auto rounded-card border border-line">
                          {resultados.map((c, i) => (
                            <button
                              key={c.matricula}
                              onClick={() =>
                                setPreview((p) => ({
                                  ...p,
                                  alvo: { matricula: c.matricula, nome: c.nome, avatar_url: c.avatar_url },
                                }))
                              }
                              className={cn(
                                'hstack w-full gap-2 px-3 py-2 text-left tap',
                                i > 0 && 'border-t border-line',
                              )}
                            >
                              <Avatar name={c.nome} src={c.avatar_url} size={32} />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{c.nome}</div>
                                {(c.unidade || c.departamento) && (
                                  <div className="truncate text-[11px] text-muted">
                                    {[c.departamento, c.unidade].filter(Boolean).join(' · ')}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Do que {preview.admin ? 'veio' : 'você veio'}? <span className="normal-case text-muted-2">(opcional)</span>
              </label>
              <input
                value={preview.legenda}
                maxLength={40}
                onChange={(e) => setPreview((p) => ({ ...p, legenda: e.target.value }))}
                placeholder="Ex.: Bruxa, Jack Caveira, Pennywise…"
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />
            </div>
            <div className="hstack gap-2 border-t border-line px-5 py-3.5">
              <button
                onClick={() => setPreview(null)}
                disabled={enviando}
                className="btn-ghost flex-1 !py-3 text-sm text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={publicar}
                disabled={enviando || (preview.admin && !preview.alvo)}
                className={cn(
                  'btn-primary flex-1 !py-3 text-sm',
                  (enviando || (preview.admin && !preview.alvo)) && 'opacity-60',
                )}
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FantasiasHalloween

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Loader2,
  Check,
  X,
  Pencil,
  ImagePlus,
  Infinity as InfinityIcon,
  PackageX,
  ShieldAlert,
  Clock,
  RotateCcw,
  FileText,
  Archive,
  ArchiveRestore,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { RecompensaFoto } from '../components/RecompensaFoto.jsx'
import { PhotoCropper } from '../components/PhotoCropper.jsx'
import { AdminPublicacoes } from '../components/AdminPublicacoes.jsx'
import { AdminConquistas } from '../components/AdminConquistas.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR')
const TAM_MAX = 15 * 1024 * 1024 // 15 MB

// filtro (lista suspensa) no padrão da aba Avisos
const filtroCls =
  'min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2 text-xs text-text outline-none'

const STATUS_PEDIDO = {
  solicitado: { label: 'Solicitado', Icon: Clock, cls: 'bg-warn/15 text-warn' },
  entregue: { label: 'Entregue', Icon: Check, cls: 'bg-accent-soft text-accent' },
  cancelado: { label: 'Cancelado', Icon: X, cls: 'bg-danger/15 text-danger' },
}

const STATUS_ENVIO = {
  pendente: { label: 'Pendente', Icon: Clock, cls: 'bg-warn/15 text-warn' },
  aprovado: { label: 'Aprovado', Icon: Check, cls: 'bg-accent-soft text-accent' },
  reprovado: { label: 'Reprovado', Icon: X, cls: 'bg-danger/15 text-danger' },
}

const vazio = {
  id: null,
  titulo: '',
  descricao: '',
  detalhes: '',
  custo: '',
  estoque: '',
  imagem_url: '',
  ativo: true,
  ordem: null,
}

function EstoquePill({ estoque }) {
  if (estoque == null)
    return (
      <span className="pill bg-surface-2 text-[10px] text-muted">
        <InfinityIcon size={11} /> Ilimitado
      </span>
    )
  if (estoque <= 0)
    return (
      <span className="pill bg-danger/15 text-[10px] text-danger">
        <PackageX size={11} /> Esgotado
      </span>
    )
  return (
    <span className="pill bg-accent-soft text-[10px] text-accent">{fmt(estoque)} em estoque</span>
  )
}

export function AdminRecompensas() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const admin = usuario?.podePublicar

  const [aba, setAba] = useState('catalogo') // 'catalogo' | 'pedidos'
  const [filtroCat, setFiltroCat] = useState('todas') // todas | ativas | inativas
  const [filtroPed, setFiltroPed] = useState('todos') // todos | solicitado | entregue | cancelado
  const [filtroEnv, setFiltroEnv] = useState('todos') // todos | pendente | aprovado | reprovado
  const [verArquivados, setVerArquivados] = useState(false)
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(null) // objeto do formulário ou null
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // pedidos (resgates a entregar)
  const [pedidos, setPedidos] = useState([])
  const [carregandoPedidos, setCarregandoPedidos] = useState(true)
  const [acaoId, setAcaoId] = useState(null) // id do pedido em atualização
  const [cancelando, setCancelando] = useState(null) // pedido aguardando confirmação

  // envios (cartões de ponto a moderar)
  const [envios, setEnvios] = useState([])
  const [carregandoEnvios, setCarregandoEnvios] = useState(true)
  const [acaoEnvio, setAcaoEnvio] = useState(null) // id do envio em ação
  const [reprovando, setReprovando] = useState(null) // envio aguardando motivo
  const [motivo, setMotivo] = useState('')
  const [anexoBusy, setAnexoBusy] = useState(null) // id do envio abrindo o anexo

  // foto em edição
  const [arquivo, setArquivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const inputFoto = useRef(null)
  const cropperRef = useRef(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('admin_listar_recompensas')
    setItens(data || [])
    setCarregando(false)
  }, [])

  const carregarPedidos = useCallback(async () => {
    const { data } = await supabase.rpc('admin_listar_pedidos')
    setPedidos(data || [])
    setCarregandoPedidos(false)
  }, [])

  const carregarEnvios = useCallback(async () => {
    const { data } = await supabase.rpc('admin_listar_envios')
    setEnvios(data || [])
    setCarregandoEnvios(false)
  }, [])

  useEffect(() => {
    if (admin) {
      carregar()
      carregarPedidos()
      carregarEnvios()
    } else {
      setCarregando(false)
      setCarregandoPedidos(false)
      setCarregandoEnvios(false)
    }
  }, [admin, carregar, carregarPedidos, carregarEnvios])

  async function verAnexo(env) {
    setAnexoBusy(env.id)
    const { data } = await supabase.storage.from('envios').createSignedUrl(env.arquivo_path, 3600)
    setAnexoBusy(null)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function moderar(env, status, motivoTxt) {
    tapHaptic()
    setAcaoEnvio(env.id)
    const { data, error } = await supabase.rpc('admin_moderar_envio', {
      p_envio: env.id,
      p_status: status,
      p_motivo: motivoTxt || null,
    })
    setAcaoEnvio(null)
    setReprovando(null)
    setMotivo('')
    if (error || !data?.ok) return
    setEnvios((prev) =>
      prev.map((e) =>
        e.id === env.id ? { ...e, status, motivo: status === 'reprovado' ? motivoTxt : null } : e,
      ),
    )
  }

  const enviosPendentes = envios.filter((e) => e.status === 'pendente').length

  async function atualizarStatus(pedido, status) {
    tapHaptic()
    setAcaoId(pedido.id)
    const { data, error } = await supabase.rpc('admin_atualizar_resgate', {
      p_id: pedido.id,
      p_status: status,
    })
    setAcaoId(null)
    setCancelando(null)
    if (error || !data?.ok) return
    setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? { ...p, status } : p)))
    // cancelar/reativar mexe no estoque — recarrega o catálogo
    carregar()
  }

  const pendentes = pedidos.filter((p) => p.status === 'solicitado').length

  // listas filtradas pela lista suspensa + arquivados de cada aba
  const itensView = itens.filter(
    (i) =>
      (verArquivados ? i.arquivado : !i.arquivado) &&
      (filtroCat === 'todas' || (filtroCat === 'ativas' ? i.ativo : !i.ativo)),
  )
  const pedidosView = pedidos.filter(
    (p) =>
      (verArquivados ? p.arquivado : !p.arquivado) &&
      (filtroPed === 'todos' || p.status === filtroPed),
  )
  const enviosView = envios.filter(
    (e) =>
      (verArquivados ? e.arquivado : !e.arquivado) &&
      (filtroEnv === 'todos' || e.status === filtroEnv),
  )

  async function arquivarRecompensa(item, arquivar) {
    tapHaptic()
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, arquivado: arquivar } : i)))
    const { error } = await supabase.rpc('admin_arquivar_recompensa', {
      p_id: item.id,
      p_arquivado: arquivar,
    })
    if (error)
      setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, arquivado: !arquivar } : i)))
  }

  async function arquivarPedido(pd, arquivar) {
    tapHaptic()
    setPedidos((prev) => prev.map((p) => (p.id === pd.id ? { ...p, arquivado: arquivar } : p)))
    const { error } = await supabase.rpc('admin_arquivar_pedido', {
      p_id: pd.id,
      p_arquivado: arquivar,
    })
    if (error)
      setPedidos((prev) => prev.map((p) => (p.id === pd.id ? { ...p, arquivado: !arquivar } : p)))
  }

  async function arquivarEnvio(env, arquivar) {
    tapHaptic()
    setEnvios((prev) => prev.map((e) => (e.id === env.id ? { ...e, arquivado: arquivar } : e)))
    const { error } = await supabase.rpc('admin_arquivar_envio', {
      p_id: env.id,
      p_arquivado: arquivar,
    })
    if (error)
      setEnvios((prev) => prev.map((e) => (e.id === env.id ? { ...e, arquivado: !arquivar } : e)))
  }

  function limparFoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArquivo(null)
    setPreviewUrl('')
  }

  function abrir(item) {
    tapHaptic()
    limparFoto()
    setErro('')
    setEditando(
      item
        ? {
            id: item.id,
            titulo: item.titulo || '',
            descricao: item.descricao || '',
            detalhes: item.detalhes || '',
            custo: String(item.custo ?? ''),
            estoque: item.estoque == null ? '' : String(item.estoque),
            imagem_url: item.imagem_url || '',
            ativo: item.ativo,
            ordem: item.ordem,
          }
        : { ...vazio },
    )
  }

  function fechar() {
    limparFoto()
    setEditando(null)
    setErro('')
  }

  function escolherFoto(e) {
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
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArquivo(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const custoNum = Number(editando?.custo)
  const podeSalvar =
    !!editando &&
    editando.titulo.trim() !== '' &&
    Number.isFinite(custoNum) &&
    custoNum > 0 &&
    !salvando

  async function salvar() {
    if (!podeSalvar) return
    tapHaptic()
    setSalvando(true)
    setErro('')

    let imagem_url = editando.imagem_url || null

    // sobe a nova foto (recorte 1:1), se houver
    if (arquivo) {
      const blob = (await cropperRef.current?.getBlob()) || arquivo
      const caminho = `${crypto.randomUUID()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('recompensas')
        .upload(caminho, blob, { cacheControl: '3600', contentType: 'image/jpeg' })
      if (upErr) {
        setSalvando(false)
        setErro('Não foi possível enviar a imagem.')
        return
      }
      imagem_url = supabase.storage.from('recompensas').getPublicUrl(caminho).data.publicUrl
    }

    const estoqueTxt = String(editando.estoque).trim()
    const estoque = estoqueTxt === '' ? null : Math.max(0, parseInt(estoqueTxt, 10) || 0)
    const ordem = Number.isFinite(editando.ordem) ? editando.ordem : itens.length

    const { error } = await supabase.rpc('admin_salvar_recompensa', {
      p_id: editando.id,
      p_titulo: editando.titulo.trim(),
      p_descricao: editando.descricao.trim() || null,
      p_custo: Math.round(custoNum),
      p_estoque: estoque,
      p_imagem_url: imagem_url,
      p_ativo: editando.ativo,
      p_ordem: ordem,
      p_detalhes: editando.detalhes.trim() || null,
    })
    setSalvando(false)
    if (error) {
      setErro('Não foi possível salvar. Tente novamente.')
      return
    }
    fechar()
    setCarregando(true)
    carregar()
  }

  async function alternarAtivo(item) {
    tapHaptic()
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i)))
    const { error } = await supabase.rpc('admin_salvar_recompensa', {
      p_id: item.id,
      p_titulo: item.titulo,
      p_descricao: item.descricao,
      p_custo: item.custo,
      p_estoque: item.estoque,
      p_imagem_url: item.imagem_url,
      p_ativo: !item.ativo,
      p_ordem: item.ordem,
      p_detalhes: item.detalhes,
    })
    if (error) {
      setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: item.ativo } : i)))
    }
  }

  if (!admin) {
    return (
      <>
        <Header title="Administração" />
        <div className="grid place-items-center px-8 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-danger/15 text-danger">
            <ShieldAlert size={26} />
          </span>
          <div className="mt-4 font-display text-base font-bold">Acesso restrito</div>
          <p className="mt-1 text-sm text-muted">
            Só administradores podem cadastrar recompensas.
          </p>
          <button onClick={() => navigate('/mais')} className="btn-primary mt-6 !py-2.5">
            Voltar
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Administração" />

      <div className="hstack gap-2 px-5 pt-1 text-sm">
        <button onClick={() => navigate('/mais')} className="hstack gap-1 text-muted tap">
          <ArrowLeft size={16} /> Mais
        </button>
      </div>

      {/* Abas */}
      <div className="px-5 pt-3">
        <div className="card flex gap-1 overflow-x-auto p-1.5 no-scrollbar">
          <button
            onClick={() => setAba('comunicados')}
            className={cn(
              'shrink-0 rounded-2xl px-4 py-2.5 text-xs font-semibold tap',
              aba === 'comunicados' ? 'bg-accent text-black' : 'text-muted',
            )}
          >
            Anúncios
          </button>
          <button
            onClick={() => setAba('catalogo')}
            className={cn(
              'shrink-0 rounded-2xl px-4 py-2.5 text-xs font-semibold tap',
              aba === 'catalogo' ? 'bg-accent text-black' : 'text-muted',
            )}
          >
            Recompensas
          </button>
          <button
            onClick={() => setAba('pedidos')}
            className={cn(
              'hstack shrink-0 justify-center gap-1 rounded-2xl px-4 py-2.5 text-xs font-semibold tap',
              aba === 'pedidos' ? 'bg-accent text-black' : 'text-muted',
            )}
          >
            Pedidos
            {pendentes > 0 && (
              <span
                className={cn(
                  'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold',
                  aba === 'pedidos' ? 'bg-black/15 text-black' : 'bg-warn/20 text-warn',
                )}
              >
                {pendentes}
              </span>
            )}
          </button>
          <button
            onClick={() => setAba('envios')}
            className={cn(
              'hstack shrink-0 justify-center gap-1 rounded-2xl px-4 py-2.5 text-xs font-semibold tap',
              aba === 'envios' ? 'bg-accent text-black' : 'text-muted',
            )}
          >
            Envios
            {enviosPendentes > 0 && (
              <span
                className={cn(
                  'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold',
                  aba === 'envios' ? 'bg-black/15 text-black' : 'bg-warn/20 text-warn',
                )}
              >
                {enviosPendentes}
              </span>
            )}
          </button>
          <button
            onClick={() => setAba('conquistas')}
            className={cn(
              'shrink-0 rounded-2xl px-4 py-2.5 text-xs font-semibold tap',
              aba === 'conquistas' ? 'bg-accent text-black' : 'text-muted',
            )}
          >
            Conquistas
          </button>
        </div>
      </div>

      {aba === 'conquistas' ? (
        <AdminConquistas />
      ) : aba === 'comunicados' ? (
        <AdminPublicacoes />
      ) : aba === 'envios' ? (
        <>
          <div className="hstack gap-2 px-5 pt-4">
            <select
              value={filtroEnv}
              onChange={(e) => setFiltroEnv(e.target.value)}
              className={filtroCls}
            >
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovados</option>
              <option value="reprovado">Reprovados</option>
            </select>
            <button
              onClick={() => setVerArquivados((v) => !v)}
              aria-label={verArquivados ? 'Ver ativos' : 'Ver arquivados'}
              className={cn(
                'shrink-0 rounded-card border px-2.5 py-2 tap',
                verArquivados
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-muted',
              )}
            >
              <Archive size={16} />
            </button>
          </div>
          {carregandoEnvios ? (
          <div className="hstack justify-center py-16 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <Section
            className="mt-4"
            title={`${verArquivados ? 'Arquivados' : 'Envios'} (${enviosView.length})`}
          >
            {enviosView.length === 0 ? (
              <div className="card p-8 text-center text-sm text-muted">
                Nenhum envio ainda. Quando alguém anexar um arquivo num desafio de envio,
                aparece aqui pra você aprovar ou reprovar.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {enviosView.map((env) => {
                  const st = STATUS_ENVIO[env.status] || STATUS_ENVIO.pendente
                  const StIcon = st.Icon
                  const ocupado = acaoEnvio === env.id
                  return (
                    <Card key={env.id} className="!p-3">
                      <div className="hstack gap-3">
                        <Avatar name={env.nome || '—'} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {env.nome || 'Colaborador'}
                          </div>
                          <div className="truncate text-xs text-muted">{env.treinamento_titulo}</div>
                          <div className="text-[11px] text-muted-2">
                            {new Date(env.enviado_em).toLocaleDateString('pt-BR')} · matrícula{' '}
                            {env.matricula}
                          </div>
                        </div>
                        <span className={cn('pill shrink-0 text-[10px]', st.cls)}>
                          <StIcon size={11} /> {st.label}
                        </span>
                      </div>

                      {env.status === 'reprovado' && env.motivo && (
                        <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-[11px] text-muted">
                          Motivo: {env.motivo}
                        </p>
                      )}

                      <div className="mt-3 hstack justify-between gap-2 border-t border-line pt-3">
                        <div className="hstack gap-2">
                          <button
                            onClick={() => verAnexo(env)}
                            disabled={anexoBusy === env.id}
                            className="btn-ghost !py-2 text-xs text-muted"
                          >
                            {anexoBusy === env.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <FileText size={14} /> Ver anexo
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => arquivarEnvio(env, !env.arquivado)}
                            aria-label={env.arquivado ? 'Restaurar' : 'Arquivar'}
                            className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted-2 tap"
                          >
                            {env.arquivado ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                          </button>
                        </div>
                        {ocupado ? (
                          <Loader2 size={16} className="animate-spin text-muted-2" />
                        ) : (
                          <div className="hstack gap-2">
                            {env.status !== 'reprovado' && (
                              <button
                                onClick={() => setReprovando(env)}
                                className="btn-ghost !py-2 text-xs text-danger"
                              >
                                Reprovar
                              </button>
                            )}
                            {env.status !== 'aprovado' && (
                              <button
                                onClick={() => moderar(env, 'aprovado')}
                                className="btn-primary !py-2 text-xs"
                              >
                                <Check size={14} /> Aprovar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </Section>
          )}
        </>
      ) : aba === 'pedidos' ? (
        <>
          <div className="hstack gap-2 px-5 pt-4">
            <select
              value={filtroPed}
              onChange={(e) => setFiltroPed(e.target.value)}
              className={filtroCls}
            >
              <option value="todos">Todos os status</option>
              <option value="solicitado">Solicitados</option>
              <option value="entregue">Entregues</option>
              <option value="cancelado">Cancelados</option>
            </select>
            <button
              onClick={() => setVerArquivados((v) => !v)}
              aria-label={verArquivados ? 'Ver ativos' : 'Ver arquivados'}
              className={cn(
                'shrink-0 rounded-card border px-2.5 py-2 tap',
                verArquivados
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-muted',
              )}
            >
              <Archive size={16} />
            </button>
          </div>
          {carregandoPedidos ? (
          <div className="hstack justify-center py-16 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <Section
            className="mt-4"
            title={`${verArquivados ? 'Arquivados' : 'Pedidos'} (${pedidosView.length})`}
          >
            {pedidosView.length === 0 ? (
              <div className="card p-8 text-center text-sm text-muted">
                Nenhum pedido ainda. Quando alguém resgatar uma recompensa, aparece aqui pra você
                entregar.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {pedidosView.map((pd) => {
                  const st = STATUS_PEDIDO[pd.status] || STATUS_PEDIDO.solicitado
                  const StIcon = st.Icon
                  const ocupado = acaoId === pd.id
                  return (
                    <Card key={pd.id} className="!p-3">
                      <div className="hstack gap-3">
                        <div className="relative shrink-0">
                          <Avatar name={pd.nome || '—'} size={40} />
                          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-surface text-sm ring-2 ring-surface">
                            {pd.emoji || '🎁'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{pd.nome || 'Colaborador'}</div>
                          <div className="truncate text-xs text-muted">{pd.titulo}</div>
                          <div className="text-[11px] text-muted-2">
                            {new Date(pd.created_at).toLocaleDateString('pt-BR')} · {fmt(pd.custo)} pts
                          </div>
                        </div>
                        <span className={cn('pill shrink-0 text-[10px]', st.cls)}>
                          <StIcon size={11} /> {st.label}
                        </span>
                      </div>

                      <div className="mt-3 hstack justify-between gap-2 border-t border-line pt-3">
                        <button
                          onClick={() => arquivarPedido(pd, !pd.arquivado)}
                          aria-label={pd.arquivado ? 'Restaurar' : 'Arquivar'}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted-2 tap"
                        >
                          {pd.arquivado ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                        </button>
                        <div className="hstack gap-2">
                          {ocupado ? (
                          <Loader2 size={16} className="animate-spin text-muted-2" />
                        ) : pd.status === 'solicitado' ? (
                          <>
                            <button
                              onClick={() => setCancelando(pd)}
                              className="btn-ghost !py-2 text-xs text-danger"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => atualizarStatus(pd, 'entregue')}
                              className="btn-primary !py-2 text-xs"
                            >
                              <Check size={14} /> Marcar entregue
                            </button>
                          </>
                        ) : pd.status === 'entregue' ? (
                          <button
                            onClick={() => setCancelando(pd)}
                            className="btn-ghost !py-2 text-xs text-muted"
                          >
                            <RotateCcw size={13} /> Cancelar e estornar
                          </button>
                        ) : (
                          <button
                            onClick={() => atualizarStatus(pd, 'solicitado')}
                            className="btn-ghost !py-2 text-xs text-muted"
                          >
                            <RotateCcw size={13} /> Reabrir
                          </button>
                        )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </Section>
          )}
        </>
      ) : (
        <>
          <div className="hstack gap-2 px-5 pt-4">
            <button
              onClick={() => abrir(null)}
              className="btn-primary shrink-0 !px-3 !py-2 text-xs"
            >
              <Plus size={15} /> Nova
            </button>
            <select
              value={filtroCat}
              onChange={(e) => setFiltroCat(e.target.value)}
              className={filtroCls}
            >
              <option value="todas">Todas</option>
              <option value="ativas">Ativas</option>
              <option value="inativas">Inativas</option>
            </select>
            <button
              onClick={() => setVerArquivados((v) => !v)}
              aria-label={verArquivados ? 'Ver ativos' : 'Ver arquivados'}
              className={cn(
                'shrink-0 rounded-card border px-2.5 py-2 tap',
                verArquivados
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-muted',
              )}
            >
              <Archive size={16} />
            </button>
          </div>
          {carregando ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <Section
          className="mt-4"
          title={`${verArquivados ? 'Arquivados' : 'Recompensas'} (${itensView.length})`}
        >
          {itensView.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              Nenhuma recompensa cadastrada. Toque em <span className="font-semibold">Nova</span> pra
              criar a primeira.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {itensView.map((item) => (
                <Card key={item.id} className={cn('!p-3', !item.ativo && 'opacity-60')}>
                  <div className="hstack gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent-soft text-2xl">
                      <RecompensaFoto
                        src={item.imagem_url}
                        emoji={item.emoji}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{item.titulo}</div>
                      <div className="mt-0.5 text-xs font-semibold text-accent">
                        {fmt(item.custo)} pts
                      </div>
                      <div className="mt-1.5 hstack gap-2">
                        <EstoquePill estoque={item.estoque} />
                        {!item.ativo && (
                          <span className="pill bg-surface-2 text-[10px] text-muted-2">Inativo</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="hstack gap-2">
                        <button
                          onClick={() => abrir(item)}
                          className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted tap"
                          aria-label="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => arquivarRecompensa(item, !item.arquivado)}
                          aria-label={item.arquivado ? 'Restaurar' : 'Arquivar'}
                          className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-2 tap"
                        >
                          {item.arquivado ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                        </button>
                      </div>
                      <button
                        onClick={() => alternarAtivo(item)}
                        className={cn(
                          'relative h-6 w-10 rounded-full transition-colors tap',
                          item.ativo ? 'bg-accent' : 'bg-surface-2',
                        )}
                        aria-label={item.ativo ? 'Desativar' : 'Ativar'}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                            item.ativo ? 'left-[18px]' : 'left-0.5',
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
          )}
        </>
      )}

      {/* Editor */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-card border border-line bg-surface">
            <div className="hstack justify-between border-b border-line px-5 py-3.5">
              <div className="font-display text-base font-bold">
                {editando.id ? 'Editar recompensa' : 'Nova recompensa'}
              </div>
              <button onClick={fechar} className="text-muted tap" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Foto */}
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Foto
              </div>
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                onChange={escolherFoto}
                className="hidden"
              />
              <div className="mt-2">
                {previewUrl ? (
                  <div className="relative">
                    <PhotoCropper ref={cropperRef} src={previewUrl} />
                    <button
                      onClick={limparFoto}
                      className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur tap"
                      aria-label="Remover foto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : editando.imagem_url ? (
                  <div className="relative">
                    <img
                      src={editando.imagem_url}
                      alt=""
                      className="aspect-square w-full rounded-2xl object-cover"
                    />
                    <button
                      onClick={() => inputFoto.current?.click()}
                      className="absolute bottom-2 right-2 z-10 hstack gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur tap"
                    >
                      <ImagePlus size={14} /> Trocar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => inputFoto.current?.click()}
                    className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-line bg-surface-2 text-muted tap"
                  >
                    <div className="text-center">
                      <ImagePlus size={26} className="mx-auto" />
                      <div className="mt-1.5 text-xs font-semibold">Adicionar foto (1:1)</div>
                    </div>
                  </button>
                )}
              </div>

              {/* Título */}
              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Título
              </label>
              <input
                value={editando.titulo}
                onChange={(e) => setEditando((s) => ({ ...s, titulo: e.target.value }))}
                placeholder="Ex.: Caixa de bombom"
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />

              {/* Descrição */}
              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Descrição <span className="normal-case text-muted-2">(opcional)</span>
              </label>
              <textarea
                value={editando.descricao}
                onChange={(e) => setEditando((s) => ({ ...s, descricao: e.target.value }))}
                placeholder="Resumo curto (aparece no card)…"
                rows={2}
                className="mt-1.5 w-full resize-none rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />

              {/* Como usar / regras */}
              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Como usar / regras <span className="normal-case text-muted-2">(opcional)</span>
              </label>
              <textarea
                value={editando.detalhes}
                onChange={(e) => setEditando((s) => ({ ...s, detalhes: e.target.value }))}
                placeholder={'Regras de uso, retirada, validade…\nUma linha por regra.'}
                rows={5}
                className="mt-1.5 w-full resize-none rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />
              <div className="mt-1.5 text-[11px] text-muted-2">
                Aparece na janelinha de detalhes quando o colaborador toca no item.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* Custo */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Pontos
                  </label>
                  <input
                    value={editando.custo}
                    onChange={(e) =>
                      setEditando((s) => ({ ...s, custo: e.target.value.replace(/\D/g, '') }))
                    }
                    inputMode="numeric"
                    placeholder="0"
                    className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
                  />
                </div>
                {/* Estoque */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Quantidade
                  </label>
                  <input
                    value={editando.estoque}
                    onChange={(e) =>
                      setEditando((s) => ({ ...s, estoque: e.target.value.replace(/\D/g, '') }))
                    }
                    inputMode="numeric"
                    placeholder="Ilimitado"
                    className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
                  />
                </div>
              </div>
              <div className="mt-1.5 text-[11px] text-muted-2">
                Deixe a quantidade em branco para estoque ilimitado. A cada resgate, ela diminui em 1.
              </div>

              {/* Ativo */}
              <button
                onClick={() => setEditando((s) => ({ ...s, ativo: !s.ativo }))}
                className="mt-4 hstack w-full justify-between rounded-card border border-line bg-surface px-4 py-3 tap"
              >
                <div className="text-left">
                  <div className="text-sm font-semibold">Disponível no catálogo</div>
                  <div className="text-[11px] text-muted">
                    {editando.ativo ? 'Visível pra todos' : 'Oculto — rascunho'}
                  </div>
                </div>
                <span
                  className={cn(
                    'relative h-6 w-10 shrink-0 rounded-full transition-colors',
                    editando.ativo ? 'bg-accent' : 'bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                      editando.ativo ? 'left-[18px]' : 'left-0.5',
                    )}
                  />
                </span>
              </button>

              {erro && <div className="mt-3 text-xs font-medium text-danger">{erro}</div>}
            </div>

            <div className="hstack gap-2 border-t border-line px-5 py-3.5">
              <button
                onClick={fechar}
                disabled={salvando}
                className="btn-ghost flex-1 !py-3 text-sm text-muted"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!podeSalvar}
                className={cn('btn-primary flex-1 !py-3 text-sm', !podeSalvar && 'opacity-50')}
              >
                {salvando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} /> Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de cancelamento (estorna pontos) */}
      {cancelando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-5">
            <div className="font-display text-base font-bold leading-tight">Cancelar resgate?</div>
            <p className="mt-2 text-sm text-muted">
              O resgate de <span className="font-semibold text-text">{cancelando.titulo}</span> de{' '}
              <span className="font-semibold text-text">{cancelando.nome || 'colaborador'}</span> será
              cancelado. Os <span className="font-semibold text-accent">{fmt(cancelando.custo)} pts</span>{' '}
              voltam pro saldo e o estoque é reposto.
            </p>
            <div className="mt-4 hstack gap-2">
              <button
                onClick={() => setCancelando(null)}
                disabled={acaoId === cancelando.id}
                className="btn-ghost flex-1 !py-2.5 text-sm text-muted"
              >
                Voltar
              </button>
              <button
                onClick={() => atualizarStatus(cancelando, 'cancelado')}
                disabled={acaoId === cancelando.id}
                className={cn(
                  'flex-1 rounded-card bg-danger !py-2.5 text-sm font-semibold text-white',
                  acaoId === cancelando.id && 'opacity-60',
                )}
              >
                {acaoId === cancelando.id ? (
                  <Loader2 size={16} className="mx-auto animate-spin" />
                ) : (
                  'Cancelar e estornar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reprovar envio (motivo) */}
      {reprovando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-5">
            <div className="font-display text-base font-bold leading-tight">Reprovar cartão?</div>
            <p className="mt-1.5 text-sm text-muted">
              De <span className="font-semibold text-text">{reprovando.nome || 'colaborador'}</span>.
              Diga o motivo (opcional) — ele verá pra corrigir e reenviar.
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex.: cartão sem assinatura, falta no dia 05…"
              className="mt-3 w-full resize-none rounded-card border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted-2"
            />
            <div className="mt-4 hstack gap-2">
              <button
                onClick={() => {
                  setReprovando(null)
                  setMotivo('')
                }}
                disabled={acaoEnvio === reprovando.id}
                className="btn-ghost flex-1 !py-2.5 text-sm text-muted"
              >
                Voltar
              </button>
              <button
                onClick={() => moderar(reprovando, 'reprovado', motivo.trim())}
                disabled={acaoEnvio === reprovando.id}
                className={cn(
                  'flex-1 rounded-card bg-danger !py-2.5 text-sm font-semibold text-white',
                  acaoEnvio === reprovando.id && 'opacity-60',
                )}
              >
                {acaoEnvio === reprovando.id ? (
                  <Loader2 size={16} className="mx-auto animate-spin" />
                ) : (
                  'Reprovar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

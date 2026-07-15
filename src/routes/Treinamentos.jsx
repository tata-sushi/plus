import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Lock,
  CheckCircle2,
  ChevronDown,
  Play,
  Loader2,
  Star,
  Clock,
  ArrowLeft,
  ArrowDown,
  Check,
  FileText,
  Download,
  Gift,
  Ban,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { PdfViewer } from '../components/PdfViewer.jsx'
import { VideoPlayer } from '../components/VideoPlayer.jsx'
import { VideosYouTube, VideosLista } from '../components/VideosYouTube.jsx'
import { IntroDesafio } from '../components/IntroDesafio.jsx'
import { ProvaDesafio } from '../components/ProvaDesafio.jsx'
import { EnvioDesafio } from '../components/EnvioDesafio.jsx'
import { Submodulo } from '../components/Submodulo.jsx'
import { CodigoEtica } from '../components/CodigoEtica.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { resolveIcon } from '../lib/icons.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'

const TIPO_LABEL = { prova: 'Prova', envio: 'Envio' }

function Detalhe({ treino, onFechar, onConcluir, onEnviarProva, onAssinarCodigo, onResgatar, concluindo }) {
  const { usuario } = useAuth()
  const [data, setData] = useState(null)
  const [rolou, setRolou] = useState(false) // rolou o conteúdo até o fim?
  const [videosOk, setVideosOk] = useState(false) // assistiu todos os vídeos?
  const [respostas, setRespostas] = useState({}) // { questaoId: opcaoId }
  const [provaResultado, setProvaResultado] = useState(null) // resposta do responder_prova
  const [enviandoProva, setEnviandoProva] = useState(false)
  const conteudoRef = useRef(null)

  const nomeCompleto = (usuario?.nome || '').trim()
  const primeiroNome = usuario?.primeiroNome || nomeCompleto.split(/\s+/)[0] || ''
  const personalizar = (html) =>
    (html || '')
      .replace(/\{\{\s*user\.name\s*\}\}/gi, nomeCompleto)
      .replace(/\{\{\s*(?:user\.first_name|primeiro_nome|nome)\s*\}\}/gi, primeiroNome)

  useEffect(() => {
    setData(null)
    setRolou(false)
    setVideosOk(false)
    setRespostas({})
    setProvaResultado(null)
    let ativo = true
    supabase.rpc('abrir_treinamento', { p_treino: treino.id }).then(({ data }) => {
      if (ativo) setData(data)
    })
    return () => {
      ativo = false
    }
  }, [treino.id])

  // recarrega só os dados (ex.: depois de enviar o anexo, pra atualizar o status)
  const recarregar = useCallback(() => {
    supabase.rpc('abrir_treinamento', { p_treino: treino.id }).then(({ data }) => setData(data))
  }, [treino.id])

  const blocos = Array.isArray(data?.blocos) ? data.blocos : []
  const ehCodigo = blocos.length > 0 // Código de Ética: leitura guiada em blocos
  const ehEnvio = data?.tipo === 'envio' // anexo + moderação
  const ehReconhecimento = data?.tipo === 'reconhecimento' // aniversário de empresa
  const midias = Array.isArray(data?.midias) ? data.midias : []
  const ehVideos = midias.length > 0
  const temHtml = !!data?.conteudo_html
  const questoes = Array.isArray(data?.prova?.questoes) ? data.prova.questoes : []
  const ehProva = questoes.length > 0
  const ehVideo = /\.(mp4|webm|mov)(\?|#|$)/i.test(data?.arquivo_url || '')
  const ehPdf = !!data?.arquivo_url && !ehVideo
  // conteúdo "rico" = texto e/ou prova (pode ter vídeo junto) → rola numa tela só
  const ehRico = temHtml || ehProva
  const ehSoVideos = ehVideos && !ehRico
  const ehMidia = ehVideos || ehVideo
  const temConteudo = ehVideos || ehPdf || ehVideo || ehRico
  const podeConcluir = (treino.tipo === 'conteudo' || ehPdf || ehMidia || ehProva) && !treino.concluido

  // o que trava a conclusão: rolar o conteúdo e/ou assistir os vídeos
  const precisaRolar = ehRico || ehPdf
  const precisaVideos = ehVideos || ehVideo
  const faltaRolar = precisaRolar && !rolou
  const faltaVideos = precisaVideos && !videosOk
  const liberado = !faltaRolar && !faltaVideos
  const todasRespondidas = ehProva && questoes.every((q) => respostas[q.id])

  const frase = data?.descricao || treino.descricao

  function escolher(questaoId, opcaoId) {
    setRespostas((r) => ({ ...r, [questaoId]: opcaoId }))
    setProvaResultado(null) // limpa o destaque de erro ao trocar a resposta
  }

  async function submeterProva() {
    if (!todasRespondidas || enviandoProva) return
    setEnviandoProva(true)
    const r = await onEnviarProva(treino, respostas)
    setEnviandoProva(false)
    if (r && !r.aprovado) setProvaResultado(r)
  }

  // sem conteúdo real pra ler (fallback) → libera direto
  useEffect(() => {
    if (data && !temConteudo) setRolou(true)
  }, [data, temConteudo])

  // conteúdo HTML: se couber sem rolar, já libera a rolagem
  useEffect(() => {
    const el = conteudoRef.current
    if (el && el.scrollHeight <= el.clientHeight + 4) setRolou(true)
  }, [data])

  function aoRolarConteudo(e) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) setRolou(true)
  }

  // portal no <body>: escapa de qualquer transform/stacking do <main>
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="safe-top hstack gap-3 border-b border-line px-4 py-2.5">
        <button
          onClick={onFechar}
          className="hstack shrink-0 gap-1.5 rounded-full bg-surface px-3.5 py-2 text-xs font-semibold tap"
        >
          <ArrowLeft size={15} /> Voltar
        </button>
        <div className="min-w-0 flex-1 truncate text-center text-xs font-medium text-muted">
          ({treino.titulo})
        </div>
        {treino.pontos > 0 ? (
          <span className="pill shrink-0 bg-accent-soft text-accent">
            <Star size={12} /> {treino.pontos} pts
          </span>
        ) : (
          // espaçador invisível (mesma largura do Voltar) pra centralizar o título
          <span
            aria-hidden
            className="hstack invisible shrink-0 gap-1.5 px-3.5 py-2 text-xs font-semibold"
          >
            <ArrowLeft size={15} /> Voltar
          </span>
        )}
      </div>

      {/* Corpo: código de ética (blocos), vídeos, vídeo/PDF, conteúdo rico ou fallback */}
      {!data ? (
        <div className="hstack flex-1 justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : ehCodigo ? (
        <CodigoEtica
          treinoId={treino.id}
          blocos={blocos}
          concluido={data.concluido}
          personalizar={personalizar}
          onAssinar={() => onAssinarCodigo(treino)}
        />
      ) : ehEnvio ? (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {frase && (
            <div className="mb-5">
              <IntroDesafio titulo={treino.titulo} frase={frase} variante={1} />
            </div>
          )}
          {temHtml && (
            <div
              className="conteudo text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: personalizar(data.conteudo_html) }}
            />
          )}
          <div className="mt-7 border-t border-line pt-6">
            <EnvioDesafio
              treinoId={treino.id}
              matricula={usuario?.matricula}
              envio={data.envio}
              concluido={data.concluido}
              liberado={data.liberado}
              dataFim={data.data_fim}
              pontos={data.pontos}
              onEnviado={recarregar}
            />
          </div>
        </div>
      ) : ehReconhecimento ? (
        <div className="flex-1 overflow-y-auto px-5 py-7">
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent">
              <Gift size={30} />
            </span>
            <h2 className="mt-3 font-display text-xl font-bold">{treino.titulo}</h2>
            <p className="mt-1.5 text-sm font-semibold text-accent">
              {data.descricao || treino.descricao}
            </p>
          </div>
          <div className="mt-7">
            {(() => {
              const est = treino.estado_reconhecimento
              const ehPontos = (treino.pontos || 0) > 0
              if (est === 'resgatado')
                return (
                  <div className="rounded-card border border-accent/30 bg-accent-soft px-4 py-5 text-center">
                    <CheckCircle2 className="mx-auto text-accent" size={28} />
                    <p className="mt-2 text-sm font-bold text-accent">Reconhecimento resgatado! 🎉</p>
                    {ehPontos && (
                      <p className="mt-0.5 text-xs text-muted">Os pontos já estão na sua carteira.</p>
                    )}
                  </div>
                )
              if (est === 'disponivel' && ehPontos)
                return (
                  <button
                    onClick={() => onResgatar?.(treino)}
                    className="btn-primary w-full !py-3.5 text-sm"
                  >
                    <Gift size={17} /> Resgatar {treino.pontos} pontos
                  </button>
                )
              if (est === 'disponivel')
                return (
                  <div className="rounded-card border border-accent/30 bg-accent-soft px-4 py-4 text-center">
                    <p className="text-sm font-semibold text-accent">Prêmio disponível! 🎁</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Em breve você poderá solicitar a sua premiação por aqui.
                    </p>
                  </div>
                )
              if (est === 'ja_passou')
                return (
                  <div className="rounded-card border border-line bg-surface px-4 py-4">
                    <div className="hstack gap-2 text-sm font-semibold text-muted">
                      <Ban size={16} /> Comemorado antes do programa
                    </div>
                    <p className="mt-1.5 text-sm leading-snug text-muted">
                      Você comemorou este aniversário de casa <strong>antes do início do
                      programa</strong>, então este marco não fica disponível pra resgate. Mas
                      relaxa — o reconhecimento vale <strong>daqui pra frente</strong>! 💚
                    </p>
                  </div>
                )
              return (
                <div className="rounded-card border border-line bg-surface px-4 py-4 text-center">
                  <Lock className="mx-auto text-muted-2" size={22} />
                  <p className="mt-2 text-sm font-semibold">Falta um pouquinho!</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Você desbloqueia este reconhecimento ao completar seu tempo de casa.
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      ) : ehSoVideos ? (
        <VideosYouTube
          chave={treino.id}
          videos={midias}
          jaConcluido={treino.concluido}
          onAssistidos={() => setVideosOk(true)}
          intro={{ titulo: treino.titulo, frase }}
        />
      ) : ehVideo ? (
        <VideoPlayer src={data.arquivo_url} onAssistido={() => setVideosOk(true)} />
      ) : ehPdf && !ehRico ? (
        <PdfViewer src={data.arquivo_url} onLido={() => setRolou(true)} />
      ) : ehRico ? (
        <div ref={conteudoRef} onScroll={aoRolarConteudo} className="flex-1 overflow-y-auto px-5 py-4">
          {frase && (
            <div className="mb-5">
              <IntroDesafio titulo={treino.titulo} frase={frase} variante={1} />
            </div>
          )}
          {temHtml && (
            <div
              className="conteudo text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: personalizar(data.conteudo_html) }}
            />
          )}
          {ehVideos && (
            <div className="mt-9">
              <VideosLista
                chave={treino.id}
                videos={midias}
                jaConcluido={treino.concluido}
                onAssistidos={() => setVideosOk(true)}
                semRecolher
                rotulo={
                  ehProva
                    ? false
                    : midias.length > 1
                      ? undefined
                      : 'Assista o vídeo para concluir o desafio.'
                }
              />
            </div>
          )}
          {ehPdf && (
            <div className="mt-9">
              <p className="mb-2 hstack gap-1.5 text-xs font-semibold text-muted">
                <FileText size={14} /> Material de apoio
              </p>
              <PdfViewer src={data.arquivo_url} inline />
              <a
                href={`${data.arquivo_url}?download`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost mt-3 w-full !py-3 text-sm"
              >
                <Download size={16} /> Baixar PDF
              </a>
            </div>
          )}
          {ehProva && (
            <div className="mt-9">
              <ProvaDesafio
                prova={data.prova}
                respostas={respostas}
                onResponder={escolher}
                resultado={provaResultado}
                concluido={data.concluido}
                gabarito={data.prova?.gabarito}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-muted">
          {treino.descricao && <p className="mb-3">{treino.descricao}</p>}
          <p className="text-muted-2">Conteúdo completo em breve.</p>
        </div>
      )}

      {!ehCodigo && !ehEnvio && !ehReconhecimento && (
      <div className="safe-bottom border-t border-line px-5 py-3">
        {treino.concluido ? (
          <div className="hstack justify-center gap-2 rounded-card bg-accent-soft py-3 text-sm font-semibold text-accent">
            <CheckCircle2 size={18} /> Concluído
          </div>
        ) : podeConcluir ? (
          !liberado ? (
            // ainda falta rolar o conteúdo e/ou assistir os vídeos
            <div className="hstack justify-center gap-2 rounded-card bg-surface py-3 text-sm font-semibold text-muted-2">
              {faltaRolar ? (
                <>
                  <ArrowDown size={16} className="animate-bounce" /> Role para realizar o desafio
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" /> Assista para realizar o desafio
                </>
              )}
            </div>
          ) : ehProva ? (
            <div className="space-y-2">
              {provaResultado?.erro && (
                <p className="text-center text-xs font-medium text-danger">
                  Não foi possível enviar agora. Tente de novo.
                </p>
              )}
              <button
                onClick={submeterProva}
                disabled={!todasRespondidas || enviandoProva}
                className={cn(
                  'btn-primary w-full !py-3.5 text-sm',
                  (!todasRespondidas || enviandoProva) && 'opacity-60',
                )}
              >
                {enviandoProva ? <Loader2 size={18} className="animate-spin" /> : 'Enviar resposta'}
              </button>
              {!todasRespondidas && (
                <p className="text-center text-[11px] text-muted-2">
                  Escolha uma resposta para enviar.
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => onConcluir(treino)}
              disabled={concluindo}
              className={cn('btn-primary w-full !py-3.5 text-sm', concluindo && 'opacity-60')}
            >
              {concluindo ? <Loader2 size={18} className="animate-spin" /> : 'Concluir desafio'}
            </button>
          )
        ) : (
          <div className="hstack justify-center gap-2 rounded-card bg-surface py-3 text-sm font-semibold text-muted">
            <Clock size={16} /> Disponível em breve
          </div>
        )}
      </div>
      )}
    </div>,
    document.body,
  )
}

export function Treinamentos() {
  const { usuario } = useAuth()
  const admin = usuario?.podePublicar
  const [trilhas, setTrilhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aberta, setAberta] = useState(null) // trilha_id expandida
  const [detalhe, setDetalhe] = useState(null) // treino aberto
  const [concluindo, setConcluindo] = useState(false)
  const [aviso, setAviso] = useState('')
  const [celebrando, setCelebrando] = useState(null) // {pontos} — overlay de conclusão

  useEffect(() => {
    if (!celebrando) return
    const t = setTimeout(() => setCelebrando(null), 2600)
    return () => clearTimeout(t)
  }, [celebrando])

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('treinamentos_do_usuario')
    if (error) {
      setCarregando(false)
      return
    }
    const map = new Map()
    for (const r of data || []) {
      if (!map.has(r.trilha_id)) {
        map.set(r.trilha_id, {
          id: r.trilha_id,
          nome: r.trilha_nome,
          icone: r.trilha_icone,
          itens: [],
        })
      }
      map.get(r.trilha_id).itens.push(r)
    }
    setTrilhas([...map.values()])
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrir(item) {
    // reconhecimento sempre abre (é informativo); admin abre qualquer um pra conferir
    if (item.tipo !== 'reconhecimento' && !item.liberado && !item.concluido && !admin) return
    tapHaptic()
    setAviso('')
    setDetalhe(item)
  }

  async function concluir(item) {
    setConcluindo(true)
    const { data } = await supabase.rpc('concluir_treinamento', { p_treino: item.id })
    setConcluindo(false)
    if (data?.ok) {
      setDetalhe(null)
      setCelebrando({ pontos: Number(data.pontos) || 0 })
      carregar()
    } else if (data?.erro === 'limite_diario') {
      setDetalhe(null)
      setAviso('Você já concluiu 3 desafios hoje. Volte amanhã! 👋')
    } else {
      setAviso('Não foi possível concluir agora.')
    }
  }

  // Envio da prova: a correção é no servidor. Aprovado → conclui e celebra;
  // reprovado → devolve o placar pro Detalhe destacar as questões erradas.
  async function enviarProva(item, respostas) {
    const { data, error } = await supabase.rpc('responder_prova', {
      p_treino: item.id,
      p_respostas: respostas,
    })
    if (!error && data?.ok && data.aprovado) {
      setDetalhe(null)
      setCelebrando({ pontos: Number(data.pontos) || 0 })
      carregar()
      return { aprovado: true }
    }
    if (data?.erro === 'limite_diario') {
      setDetalhe(null)
      setAviso('Você já concluiu 3 desafios hoje. Volte amanhã! 👋')
      return { aprovado: true }
    }
    if (!error && data?.ok && data.aprovado === false) {
      return {
        aprovado: false,
        acertos: data.acertos,
        total: data.total,
        erradas: data.erradas,
      }
    }
    return { aprovado: false, erro: true }
  }

  // Assinatura do Código de Ética: conclui o módulo e credita os pontos.
  async function assinarCodigo(item) {
    const { data, error } = await supabase.rpc('assinar_codigo_etica', { p_treino: item.id })
    if (!error && data?.ok) {
      setDetalhe(null)
      setCelebrando({ pontos: Number(data.pontos) || 0 })
      carregar()
      return { ok: true }
    }
    if (data?.erro === 'limite_diario') {
      setDetalhe(null)
      setAviso('Você já concluiu 3 desafios hoje. Volte amanhã! 👋')
      return { ok: true }
    }
    return { ok: false }
  }

  // Resgate direto do nível de pontos (reconhecimento por tempo de casa)
  async function resgatarReconhecimento(item) {
    const { data } = await supabase.rpc('resgatar_reconhecimento', { p_treino: item.id })
    if (data?.ok) {
      setDetalhe(null)
      if (!data.ja_resgatado) setCelebrando({ pontos: Number(data.pontos) || 0 })
      carregar()
    } else {
      setAviso('Não foi possível resgatar agora.')
    }
  }

  return (
    <>
      <Header title="Treinamentos" />

      {aviso && (
        <div className="mx-5 mt-2 rounded-card border border-accent/30 bg-accent-soft px-4 py-2.5 text-center text-xs font-semibold text-accent">
          {aviso}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3 px-5">
        {carregando && (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!carregando && trilhas.length === 0 && (
          <div className="py-10 text-center text-sm text-muted">
            Nenhum treinamento disponível pra você por enquanto.
          </div>
        )}

        {trilhas.map((tr) => {
          const Icon = resolveIcon(tr.icone)
          const total = tr.itens.length
          const feitos = tr.itens.filter((i) => i.concluido).length
          const pontosTrilha = tr.itens.reduce((s, i) => s + (i.pontos || 0), 0)
          const expandida = aberta === tr.id
          // TATÁ NEWS abre como prateleira de jornalzinhos (#1, #2, …)
          const prateleira = tr.nome === 'TATÁ NEWS'
          // itens soltos (direto na trilha) x agrupados por subcategoria (ex.: séries mensais)
          const soltos = tr.itens.filter((i) => !i.subcategoria)
          const subcats = tr.itens.reduce((acc, i) => {
            if (i.subcategoria) (acc[i.subcategoria] ||= []).push(i)
            return acc
          }, {})
          return (
            <Card key={tr.id} className="!p-0 overflow-hidden">
              <button
                onClick={() => setAberta(expandida ? null : tr.id)}
                className="hstack w-full gap-3 p-4 text-left tap"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{tr.nome}</div>
                  <div className="mt-0.5 hstack justify-between gap-2 text-xs text-muted">
                    <span>{feitos}/{total} concluídos</span>
                    <span>
                      <span className="font-semibold text-accent">
                        {total ? Math.round((feitos / total) * 100) : 0}%
                      </span>
                      {pontosTrilha > 0 && (
                        <span className="text-muted-2"> ({pontosTrilha} pts)</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={total ? feitos / total : 0} />
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={cn('shrink-0 text-muted transition-transform', expandida && 'rotate-180')}
                />
              </button>

              {expandida && prateleira && (
                <div className="grid grid-cols-4 gap-3 border-t border-line p-4">
                  {/* mais recente primeiro: #30 … #1 */}
                  {[...tr.itens].reverse().map((item) => {
                    const bloqueado = !item.liberado && !item.concluido
                    const rotulo = (item.titulo.match(/#\d+/) || [item.titulo])[0]
                    return (
                      <button
                        key={item.id}
                        onClick={() => abrir(item)}
                        disabled={bloqueado}
                        aria-label={item.titulo}
                        className={cn(
                          'relative flex flex-col items-center gap-1 py-1.5 tap',
                          // realizado = verde escuro · aberto = citric · futuro = cinza
                          item.concluido
                            ? 'text-accent-dim'
                            : bloqueado
                              ? 'text-muted-2 opacity-40'
                              : 'text-accent',
                        )}
                      >
                        {item.concluido && (
                          <span className="absolute right-2 top-0 grid h-4 w-4 place-items-center rounded-full border border-accent-dim bg-accent-soft text-accent-dim">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                        {bloqueado && (
                          <span className="absolute right-2 top-0 text-muted-2">
                            <Lock size={12} />
                          </span>
                        )}
                        <Icon size={30} strokeWidth={1.8} />
                        <span className="text-xs font-bold">{rotulo}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {expandida && !prateleira && (
                <div className="border-t border-line">
                  {soltos.map((item) => {
                    const bloqueado = !item.liberado && !item.concluido
                    // desafio com blocos (Código de Ética) → cabeçalho + trilhinha de casinhas
                    if (item.blocos_total > 0) {
                      const total = item.blocos_total
                      const perRow = 5
                      const nohBase =
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold'
                      // cor da casinha conforme o estado
                      const casaCls = (idx) =>
                        item.concluido
                          ? 'bg-accent-soft text-accent-dim' // realizado → número no segundo verde
                          : !bloqueado && idx === 0
                            ? 'bg-accent text-black' // aberto → citric marcante
                            : 'border border-line bg-surface-2 text-muted-2' // futuro → escuro
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'border-t border-line px-4 py-3.5 first:border-t-0',
                            bloqueado && 'opacity-45',
                          )}
                        >
                          {/* cabeçalho — clicável pra entrar */}
                          <button
                            onClick={() => abrir(item)}
                            disabled={bloqueado}
                            className="hstack w-full gap-3 text-left tap"
                          >
                            <span
                              className={cn(
                                'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                                item.concluido
                                  ? 'bg-accent-soft text-accent'
                                  : bloqueado
                                    ? 'bg-surface-2 text-muted-2'
                                    : 'bg-accent text-black',
                              )}
                            >
                              {item.concluido ? (
                                <CheckCircle2 size={16} />
                              ) : bloqueado ? (
                                <Lock size={14} />
                              ) : (
                                <Play size={13} fill="currentColor" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{item.titulo}</span>
                              <span className="text-[11px] text-muted-2">{total} partes</span>
                            </span>
                            {item.pontos > 0 && (
                              <span className="hstack shrink-0 gap-1 text-[11px] font-semibold text-muted">
                                <Star size={11} /> {item.pontos}
                              </span>
                            )}
                          </button>

                          {/* trilhinha: todas as fileiras com os mesmos 5 slots (os vazios
                              ficam invisíveis à direita), pras casinhas alinharem em coluna.
                              Só a casinha 1 (ou o cabeçalho) abre; as outras não fazem nada. */}
                          <div className="mt-4 flex flex-col gap-3">
                            {Array.from({
                              length: Math.ceil((total + (item.concluido ? 1 : 0)) / perRow),
                            }).map((_, ri) => (
                              <div key={ri} className="hstack w-full">
                                {Array.from({ length: perRow }).map((_, c) => {
                                  const idx = ri * perRow + c
                                  const slots = total + (item.concluido ? 1 : 0)
                                  const existe = idx < slots
                                  const ehCheck = item.concluido && idx === total // círculo final vazado
                                  return (
                                    <Fragment key={c}>
                                      {c > 0 && (
                                        <span
                                          className={cn(
                                            'h-[2px] flex-1',
                                            !existe
                                              ? 'invisible'
                                              : item.concluido
                                                ? 'bg-accent-dim'
                                                : 'bg-line',
                                          )}
                                        />
                                      )}
                                      {!existe ? (
                                        <span className="invisible h-7 w-7 shrink-0" />
                                      ) : ehCheck ? (
                                        <span className={cn(nohBase, 'bg-accent-soft text-accent-dim')}>
                                          <Check size={13} strokeWidth={3} />
                                        </span>
                                      ) : idx === 0 ? (
                                        <button
                                          onClick={() => abrir(item)}
                                          disabled={bloqueado}
                                          aria-label="Começar o Código de Ética"
                                          className="shrink-0 tap"
                                        >
                                          <span className={cn(nohBase, casaCls(idx))}>{idx + 1}</span>
                                        </button>
                                      ) : (
                                        <span className={cn(nohBase, casaCls(idx))}>{idx + 1}</span>
                                      )}
                                    </Fragment>
                                  )
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return (
                      <button
                        key={item.id}
                        onClick={() => abrir(item)}
                        disabled={bloqueado}
                        className={cn(
                          'hstack w-full gap-3 border-t border-line px-4 py-3 text-left first:border-t-0 tap',
                          bloqueado && 'opacity-45',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                            item.concluido
                              ? 'bg-accent-soft text-accent'
                              : bloqueado
                                ? 'bg-surface-2 text-muted-2'
                                : 'bg-accent text-black',
                          )}
                        >
                          {item.concluido ? (
                            <CheckCircle2 size={16} />
                          ) : bloqueado ? (
                            <Lock size={14} />
                          ) : (
                            <Play size={13} fill="currentColor" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{item.titulo}</span>
                          {TIPO_LABEL[item.tipo] && (
                            <span className="text-[11px] text-muted-2">{TIPO_LABEL[item.tipo]}</span>
                          )}
                        </span>
                        {item.pontos > 0 && (
                          <span className="hstack shrink-0 gap-1 text-[11px] font-semibold text-muted">
                            <Star size={11} /> {item.pontos}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {Object.entries(subcats).map(([nome, itens]) => (
                    <Submodulo key={nome} nome={nome} itens={itens} onAbrir={abrir} admin={admin} />
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {detalhe && (
        <Detalhe
          treino={detalhe}
          onFechar={() => setDetalhe(null)}
          onConcluir={concluir}
          onEnviarProva={enviarProva}
          onAssinarCodigo={assinarCodigo}
          onResgatar={resgatarReconhecimento}
          concluindo={concluindo}
        />
      )}

      {/* Celebração de conclusão */}
      {celebrando &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/70 backdrop-blur-sm"
            onClick={() => setCelebrando(null)}
          >
          <div className="px-8 text-center">
            <div className="animate-pop mx-auto grid h-24 w-24 place-items-center rounded-full bg-accent text-black shadow-glow">
              <Check size={46} strokeWidth={3} />
            </div>
            <div className="animate-rise mt-5 font-display text-2xl font-bold text-white">
              Desafio concluído! 🎉
            </div>
            {celebrando.pontos > 0 && (
              <div className="animate-rise mt-2 text-sm font-semibold text-accent">
                +{celebrando.pontos} pts na sua carteira
              </div>
            )}
          </div>
        </div>,
          document.body,
        )}
    </>
  )
}

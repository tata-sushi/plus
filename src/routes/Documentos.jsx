import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileSignature,
  PenLine,
  Check,
  Clock,
  Loader2,
  ShieldCheck,
  Inbox,
  Printer,
  Maximize2,
  X,
  Plus,
  Minus,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { AssinaturaPad } from '../components/AssinaturaPad.jsx'
import { SelfieCapture } from '../components/SelfieCapture.jsx'
import { PdfViewer } from '../components/PdfViewer.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { carimbarPdf } from '../lib/pdfAssinatura.js'

const TIPO_ROTULO = { rh: 'RH', politica: 'Política', recibo: 'Recibo', pdf: 'Documento' }

// Consentimento padrão exibido no card e registrado na assinatura.
const CONSENTIMENTO = 'Li e concordo a assinatura do documento acima.'

function fmtData(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Documentos() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [lista, setLista] = useState(null) // null = carregando
  const [sel, setSel] = useState(null) // documento aberto (docs_abrir)
  const [carregandoDoc, setCarregandoDoc] = useState(false)
  const [assinando, setAssinando] = useState(false)
  const [erro, setErro] = useState('')
  const [rubricaTem, setRubricaTem] = useState(false)
  const [selfieBlob, setSelfieBlob] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null) // URL assinada do PDF de origem
  const [pdfCheio, setPdfCheio] = useState(false) // leitor de PDF em tela cheia
  const [pdfZoom, setPdfZoom] = useState(1) // zoom do leitor em tela cheia
  const rubricaRef = useRef(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('docs_minhas')
    setLista(Array.isArray(data) ? data : [])
  }, [])

  const abrir = useCallback(async (atribuicaoId) => {
    setCarregandoDoc(true)
    setErro('')
    setRubricaTem(false)
    setSelfieBlob(null)
    setPdfUrl(null)
    const { data } = await supabase.rpc('docs_abrir', { p_atribuicao_id: atribuicaoId })
    setCarregandoDoc(false)
    if (data?.ok) {
      setSel(data)
      if (data.tipo === 'pdf' && data.arquivo_path) {
        const { data: su } = await supabase.storage
          .from('assinaturas')
          .createSignedUrl(data.arquivo_path, 3600)
        setPdfUrl(su?.signedUrl || null)
      }
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Abre direto quando vem de uma notificação (?a=atribuicaoId)
  useEffect(() => {
    const a = params.get('a')
    if (a && !sel) abrir(a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  function voltarLista() {
    setSel(null)
    setParams({}, { replace: true })
    setLista(null)
    carregar()
  }

  async function assinar() {
    if (assinando) return
    setAssinando(true)
    setErro('')
    try {
      let rubricaPath = ''
      let selfiePath = ''
      let rubricaBlob = null
      if (sel.exige_rubrica) {
        rubricaBlob = await rubricaRef.current?.exportPNG()
        if (!rubricaBlob) throw new Error('rubrica')
        rubricaPath = `rubricas/${sel.atribuicao_id}-${Date.now()}.png`
        const { error } = await supabase.storage
          .from('assinaturas')
          .upload(rubricaPath, rubricaBlob, { contentType: 'image/png' })
        if (error) throw error
      }
      if (sel.exige_selfie) {
        if (!selfieBlob) throw new Error('selfie')
        selfiePath = `selfies/${sel.atribuicao_id}-${Date.now()}.jpg`
        const { error } = await supabase.storage
          .from('assinaturas')
          .upload(selfiePath, selfieBlob, { contentType: 'image/jpeg' })
        if (error) throw error
      }
      const { data } = await supabase.rpc('docs_assinar', {
        p_atribuicao_id: sel.atribuicao_id,
        p_rubrica_path: rubricaPath,
        p_selfie_path: selfiePath,
        p_user_agent: navigator.userAgent,
      })
      if (!data?.ok) throw new Error(data?.erro || 'falhou')

      // PDF: gera o único carimbado com os dados de auditoria reais do servidor
      if (sel.tipo === 'pdf' && sel.arquivo_path && pdfUrl) {
        try {
          const pdfBytes = await (await fetch(pdfUrl)).arrayBuffer()
          const carimbado = await carimbarPdf({
            pdfBytes,
            rubricaBlob,
            selfieBlob,
            dados: {
              titulo: data.titulo,
              declaracao: data.declaracao,
              assinante: data.assinante,
              matricula: data.matricula,
              cargo: data.cargo,
              unidade: data.unidade,
              assinadoEm: fmtData(data.assinado_em),
              ip: data.ip,
              hash: data.hash,
              versao: data.versao,
              nivelRotulo: 'Assinatura eletronica simples',
            },
          })
          const assinadoPath = `assinados/${sel.atribuicao_id}-${Date.now()}.pdf`
          const { error } = await supabase.storage
            .from('assinaturas')
            .upload(assinadoPath, new Blob([carimbado], { type: 'application/pdf' }), {
              contentType: 'application/pdf',
            })
          if (!error) {
            await supabase.rpc('docs_definir_assinado', {
              p_atribuicao_id: sel.atribuicao_id,
              p_assinado_path: assinadoPath,
            })
            // Carimbo de tempo (RFC 3161) sobre o PDF assinado — best-effort:
            // se a TSA/função estiver fora, a assinatura segue válida (horário do servidor).
            try {
              const digest = await crypto.subtle.digest('SHA-256', carimbado)
              const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
              const { data: ct } = await supabase.functions.invoke('carimbo-tempo', { body: { sha256 } })
              if (ct?.ok && ct.token_base64) {
                await supabase.rpc('docs_registrar_carimbo', {
                  p_atribuicao_id: sel.atribuicao_id,
                  p_doc_sha256: sha256,
                  p_token_base64: ct.token_base64,
                  p_tsa: ct.tsa || null,
                  p_tempo: ct.tempo || null,
                  p_serial: ct.serial || null,
                })
              }
            } catch {
              /* carimbo de tempo indisponível — não bloqueia a assinatura */
            }
          }
        } catch {
          /* se o carimbo falhar, a assinatura já está registrada — segue sem bloquear */
        }
      }
      tapHaptic()
      voltarLista()
    } catch {
      setErro('Não foi possível assinar agora. Tente de novo.')
    } finally {
      setAssinando(false)
    }
  }

  const podeAssinar =
    sel &&
    (!sel.exige_rubrica || rubricaTem) &&
    (!sel.exige_selfie || selfieBlob) &&
    !assinando

  // ── Tela de assinatura ────────────────────────────────────────────────────
  if (sel) {
    const assinado = sel.status === 'assinado'
    return (
      <div className="min-h-[100dvh] bg-bg">
        {/* Leitor de PDF em tela cheia — com zoom, pra ler com folga antes de assinar */}
        {pdfCheio && pdfUrl && (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-bg"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="hstack items-center justify-between gap-2 border-b border-line px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{sel.titulo}</span>
              <button
                onClick={() => setPdfCheio(false)}
                className="btn-ghost shrink-0 !p-2"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <PdfViewer src={pdfUrl} zoom={pdfZoom} />

            {/* zoom flutuante no topo, ao centro, sobre o PDF (logo abaixo do cabeçalho) */}
            <div
              className="fixed left-1/2 z-[70] -translate-x-1/2 hstack items-center gap-1 rounded-full border border-line bg-surface px-1.5 py-1 shadow-lg"
              style={{ top: 'calc(env(safe-area-inset-top) + 3.75rem)' }}
            >
              <button
                onClick={() => setPdfZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
                className="grid h-10 w-10 place-items-center rounded-full text-muted tap"
                aria-label="Diminuir zoom"
              >
                <Minus size={18} />
              </button>
              <span className="w-12 text-center text-sm font-semibold tabular-nums text-text">
                {Math.round(pdfZoom * 100)}%
              </span>
              <button
                onClick={() => setPdfZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="grid h-10 w-10 place-items-center rounded-full text-muted tap"
                aria-label="Aumentar zoom"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}

        <Header />
        <div className="px-5 pt-2">
          <button onClick={voltarLista} className="hstack gap-1 text-sm font-medium text-muted tap">
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>

        <div className="mx-auto w-full max-w-[560px] px-5 pb-28 pt-3">
          <div className="hstack gap-2">
            <span className="rounded-pill bg-fill px-2 py-0.5 text-[11px] font-semibold text-muted">
              {TIPO_ROTULO[sel.tipo] || 'Documento'}
            </span>
            {assinado && (
              <span className="hstack gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                <Check size={12} strokeWidth={3} /> Assinado
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-xl font-bold leading-tight">{sel.titulo}</h1>

          {/* corpo do documento — PDF (visualizador) ou texto */}
          {sel.tipo === 'pdf' ? (
            <div className="relative mt-4">
              <div className="overflow-hidden rounded-card border border-line">
                {pdfUrl ? (
                  <PdfViewer src={pdfUrl} inline />
                ) : (
                  <div className="hstack justify-center py-10 text-muted-2">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                )}
              </div>
              {pdfUrl && (
                <button
                  onClick={() => {
                    setPdfZoom(1)
                    setPdfCheio(true)
                  }}
                  aria-label="Abrir em tela cheia"
                  className="absolute right-3.5 top-3.5 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-surface/90 text-muted shadow-sm backdrop-blur tap"
                >
                  <Maximize2 size={16} />
                </button>
              )}
            </div>
          ) : (
            <div
              className="conteudo mt-4 rounded-card border border-line bg-surface px-4 py-4 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sel.corpo_html || '' }}
            />
          )}

          {/* declaração de aceite (centralizada, sem ícone) */}
          <div className="mt-4 rounded-card border border-accent/30 bg-accent-soft px-4 py-3.5">
            <p className="text-center text-sm font-medium leading-snug">{CONSENTIMENTO}</p>
          </div>

          {assinado ? (
            <>
              <div className="mt-5 hstack items-start gap-2.5 rounded-card border border-line bg-surface px-4 py-3.5 text-sm text-muted">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent" />
                <span>
                  Assinado em <b className="text-text">{fmtData(sel.assinado_em)}</b>. O registro
                  ficou guardado com a trilha de auditoria.
                </span>
              </div>
              <button
                onClick={() => navigate(`/comprovante/${sel.atribuicao_id}`)}
                className="btn-ghost mt-3 w-full !py-3 text-sm"
              >
                <Printer size={16} /> Imprimir / Salvar comprovante
              </button>
            </>
          ) : (
            <>
              {sel.exige_rubrica && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold text-muted">Sua assinatura</p>
                  <AssinaturaPad ref={rubricaRef} onChange={setRubricaTem} />
                </div>
              )}
              {sel.exige_selfie && (
                <div className="mt-6">
                  <p className="mb-2 text-center text-xs font-semibold text-muted">
                    Selfie de confirmação
                  </p>
                  <SelfieCapture onChange={setSelfieBlob} />
                </div>
              )}

              <div className="mt-7 space-y-2">
                {erro && <p className="text-center text-xs font-medium text-danger">{erro}</p>}
                <button
                  onClick={assinar}
                  disabled={!podeAssinar}
                  className={`btn-primary w-full !py-3.5 text-sm ${!podeAssinar ? 'opacity-60' : ''}`}
                >
                  {assinando ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <PenLine size={17} /> Concordar e Assinar
                    </>
                  )}
                </button>
                {!podeAssinar && !assinando && (
                  <p className="text-center text-[11px] text-muted-2">
                    {sel.exige_rubrica && !rubricaTem
                      ? 'Assine no quadro para concluir.'
                      : sel.exige_selfie && !selfieBlob
                        ? 'Tire a selfie para concluir.'
                        : ''}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Lista (caixa de pendências) ───────────────────────────────────────────
  return (
    <>
      <Header />
      <div className="px-5 pt-3">
        <h1 className="font-display text-xl font-bold">Assinaturas</h1>
        <p className="mt-0.5 text-sm text-muted">Documentos para você ler e assinar.</p>
      </div>

      <div className="mt-4 px-5 pb-24">
        {lista === null ? (
          <div className="hstack justify-center py-20 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="grid place-items-center px-8 py-20 text-center text-muted">
            <Inbox size={30} className="text-muted-2" />
            <p className="mt-3 text-sm">Nenhum documento para assinar por aqui.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {lista.map((d, i) => {
              const pend = d.status === 'pendente'
              return (
                <button
                  key={d.atribuicao_id}
                  onClick={() =>
                    pend ? abrir(d.atribuicao_id) : navigate(`/comprovante/${d.atribuicao_id}`)
                  }
                  className={`hstack w-full gap-3 px-4 py-3.5 text-left tap ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      pend ? 'bg-accent-soft text-accent' : 'bg-fill text-muted'
                    }`}
                  >
                    {pend ? <FileSignature size={18} /> : <Check size={18} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{d.titulo}</span>
                    <span className="mt-0.5 hstack gap-1.5 text-[11px] text-muted">
                      <span className="rounded-pill bg-fill px-1.5 py-px font-semibold">
                        {TIPO_ROTULO[d.tipo] || 'Documento'}
                      </span>
                      {pend ? (
                        <span className="hstack gap-1 text-accent">
                          <Clock size={11} /> Pendente
                        </span>
                      ) : (
                        <span className="text-muted-2">Assinado em {fmtData(d.assinado_em)}</span>
                      )}
                    </span>
                  </span>
                  {carregandoDoc && <Loader2 size={16} className="animate-spin text-muted-2" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export default Documentos

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Loader2, ShieldCheck, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { PdfViewer } from '../components/PdfViewer.jsx'

const TIPO_ROTULO = { rh: 'RH', politica: 'Política', recibo: 'Recibo', pdf: 'Documento' }
const NIVEL_ROTULO = { simples: 'Assinatura eletrônica simples', icp: 'Assinatura ICP-Brasil' }

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

export function Comprovante() {
  const { atribuicaoId } = useParams()
  const navigate = useNavigate()
  const [c, setC] = useState(null)
  const [rubricaUrl, setRubricaUrl] = useState(null)
  const [selfieUrl, setSelfieUrl] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null) // PDF único assinado (tipo pdf)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const { data } = await supabase.rpc('docs_comprovante', { p_atribuicao_id: atribuicaoId })
      if (!ativo) return
      if (!data?.ok) {
        setErro('Comprovante indisponível.')
        return
      }
      setC(data)
      const assinar = async (p) =>
        p ? (await supabase.storage.from('assinaturas').createSignedUrl(p, 3600)).data?.signedUrl : null
      if (data.tipo === 'pdf') {
        const pu = await assinar(data.assinado_path)
        if (!ativo) return
        setPdfUrl(pu)
      } else {
        const [ru, su] = await Promise.all([assinar(data.rubrica_path), assinar(data.selfie_path)])
        if (!ativo) return
        setRubricaUrl(ru)
        setSelfieUrl(su)
      }
    })()
    return () => {
      ativo = false
    }
  }, [atribuicaoId])

  if (erro)
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg px-8 text-center text-muted">
        <div>
          <p className="text-sm">{erro}</p>
          <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold text-accent tap">
            Voltar
          </button>
        </div>
      </div>
    )
  if (!c)
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )

  // ── PDF único carimbado: mostra o próprio arquivo assinado ──────────────────
  if (c.tipo === 'pdf') {
    return (
      <div className="min-h-[100dvh] bg-bg pb-28">
        <div className="safe-top sticky top-0 z-10 hstack justify-between border-b border-line bg-bg/90 px-5 py-3 backdrop-blur">
          <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm font-medium text-muted tap">
            <ArrowLeft size={16} /> Voltar
          </button>
          <span className="text-sm font-semibold">PDF assinado</span>
          <div className="w-14" />
        </div>
        <div className="mx-auto w-full max-w-[720px] px-4 py-4">
          <h1 className="font-display text-lg font-bold">{c.titulo}</h1>
          <p className="mt-0.5 text-xs text-muted">
            Assinado por {c.assinante} em {fmtData(c.assinado_em)}
          </p>
          {pdfUrl ? (
            <div className="mt-3 overflow-hidden rounded-card border border-line">
              <PdfViewer src={pdfUrl} inline />
            </div>
          ) : (
            <div className="mt-3 rounded-card border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
              O PDF assinado não está disponível para este registro. As provas
              (rubrica, selfie e auditoria) continuam guardadas no painel.
            </div>
          )}
        </div>
        {pdfUrl && (
          <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 px-5 py-3 backdrop-blur">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mx-auto flex w-full max-w-[720px] !py-3.5 text-sm"
            >
              <ExternalLink size={17} /> Abrir / Baixar PDF assinado
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-bg pb-28">
      {/* regras de impressão: isola só o #comprovante */}
      <style>{`
        @media print {
          @page { margin: 16mm; }
          body * { visibility: hidden !important; }
          #comprovante, #comprovante * { visibility: visible !important; }
          #comprovante { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* barra superior (não imprime) */}
      <div className="no-print safe-top sticky top-0 z-10 hstack justify-between border-b border-line bg-bg/90 px-5 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm font-medium text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-sm font-semibold">Comprovante</span>
        <div className="w-14" />
      </div>

      {/* documento imprimível — fundo branco e tinta escura fixos */}
      <div className="mx-auto my-5 w-full max-w-[720px] px-4">
        <div
          id="comprovante"
          style={{ background: '#fff', color: '#1a1a1a' }}
          className="rounded-card border border-line px-7 py-8 leading-relaxed shadow-sm"
        >
          <div style={{ borderBottom: '1px solid #e5e7eb' }} className="hstack items-center justify-between pb-3">
            <div className="hstack gap-2">
              <img src="/icons/icon-192.png" alt="" width={26} height={26} style={{ borderRadius: 6 }} />
              <span style={{ fontWeight: 700 }}>Tatá Plus</span>
            </div>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Comprovante de Assinatura Eletrônica</span>
          </div>

          <div className="mt-5">
            <span
              style={{ background: '#f1f5f0', color: '#4b5563', fontSize: 11, fontWeight: 600 }}
              className="rounded-pill px-2 py-0.5"
            >
              {TIPO_ROTULO[c.tipo] || 'Documento'}
            </span>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{c.titulo}</h1>
          </div>

          {/* corpo do documento (placeholders já preenchidos) */}
          <div
            className="conteudo mt-4"
            style={{ fontSize: 14 }}
            dangerouslySetInnerHTML={{ __html: c.corpo_html || '' }}
          />

          {/* declaração */}
          <div
            style={{ background: '#f6f7f5', borderLeft: '3px solid #269C32', fontSize: 13 }}
            className="mt-5 rounded px-4 py-3"
          >
            {c.declaracao}
          </div>

          {/* bloco de assinatura */}
          <div className="mt-7 grid grid-cols-[1fr_auto] items-end gap-5">
            <div>
              {rubricaUrl ? (
                <img
                  src={rubricaUrl}
                  alt="Rubrica"
                  style={{ height: 70, objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ height: 70 }} />
              )}
              <div style={{ borderTop: '1px solid #9ca3af', marginTop: 2, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.assinante}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Matrícula {c.matricula}
                  {c.cargo ? ` · ${c.cargo}` : ''}
                  {c.unidade ? ` · ${c.unidade}` : ''}
                </div>
              </div>
            </div>
            {selfieUrl && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={selfieUrl}
                  alt="Selfie"
                  style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' }}
                />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>Selfie de confirmação</div>
              </div>
            )}
          </div>

          {/* carimbo de auditoria */}
          <div
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: 11.5, color: '#4b5563' }}
            className="mt-7 rounded px-4 py-3"
          >
            <div className="hstack items-start gap-2">
              <ShieldCheck size={15} style={{ color: '#269C32', marginTop: 1, flexShrink: 0 }} />
              <div style={{ display: 'grid', gap: 2 }}>
                <div>
                  <b style={{ color: '#1a1a1a' }}>{NIVEL_ROTULO[c.nivel] || 'Assinatura eletrônica'}</b>
                </div>
                <div>
                  Assinado em <b style={{ color: '#1a1a1a' }}>{fmtData(c.assinado_em)}</b>
                  {c.ip ? ` · IP ${c.ip}` : ''}
                </div>
                <div>
                  Documento (v{c.versao}) · impressão digital <span style={{ fontFamily: 'monospace' }}>{c.hash}</span>
                </div>
                {c.user_agent && (
                  <div style={{ color: '#9ca3af', wordBreak: 'break-word' }}>Dispositivo: {c.user_agent}</div>
                )}
              </div>
            </div>
            <p style={{ marginTop: 8, fontSize: 10.5, color: '#9ca3af' }}>
              Assinado eletronicamente nos termos da MP 2.200-2/2001. A autenticidade pode ser
              conferida pelo RH da Tatá Sushi.
            </p>
          </div>
        </div>
      </div>

      {/* botão de imprimir (não imprime) */}
      <div className="no-print safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 px-5 py-3 backdrop-blur">
        <button onClick={() => window.print()} className="btn-primary mx-auto flex w-full max-w-[720px] !py-3.5 text-sm">
          <Printer size={17} /> Imprimir / Salvar PDF
        </button>
      </div>
    </div>
  )
}

export default Comprovante

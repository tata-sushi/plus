import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ReceiptText, FileText, Loader2, X, ExternalLink } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { PdfViewer } from '../components/PdfViewer.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Página de Holerites (contracheques) — igual às Assinaturas, mas SÓ visualização
// (não exige assinatura). Lê os documentos do RH (dp_rh) via holerites_meus e abre
// o PDF com URL assinada do bucket privado dp-documentos.

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
// "2026-08" -> "Agosto de 2026"
function fmtCompetencia(c) {
  const m = /^(\d{4})-(\d{2})$/.exec(c || '')
  if (!m) return c || '—'
  return `${MESES[Number(m[2]) - 1] || m[2]} de ${m[1]}`
}
function fmtTamanho(b) {
  if (!b) return ''
  const kb = b / 1024
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`
}

export function Holerites() {
  const navigate = useNavigate()
  const [lista, setLista] = useState(null) // null = carregando
  const [abrindo, setAbrindo] = useState(null) // id do holerite sendo aberto
  const [erro, setErro] = useState('')
  const [visor, setVisor] = useState(null) // { url, nome }

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('holerites_meus')
    setLista(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function abrir(h) {
    if (abrindo) return
    tapHaptic()
    setAbrindo(h.id)
    setErro('')
    const { data, error } = await supabase.storage
      .from(h.bucket || 'dp-documentos')
      .createSignedUrl(h.path, 3600)
    setAbrindo(null)
    if (error || !data?.signedUrl) {
      setErro('Não consegui abrir o holerite agora. Tente de novo.')
      return
    }
    setVisor({ url: data.signedUrl, nome: h.nome_arquivo })
  }

  return (
    <div className="min-h-[100dvh] bg-bg">
      <Header />
      <div className="px-5 pt-2">
        <button
          onClick={() => {
            tapHaptic()
            navigate(-1)
          }}
          className="hstack gap-1 text-sm font-medium text-muted tap"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      <div className="mx-auto w-full max-w-[520px] px-5 pb-28 pt-4">
        <div className="mb-5">
          <div className="font-display text-[19px] font-bold leading-tight">Holerites</div>
        </div>

        {lista === null ? (
          <div className="hstack justify-center py-20 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted-2">
              <ReceiptText size={24} />
            </div>
            <p className="mx-auto mt-3 max-w-[280px] text-sm text-muted">
              Nenhum holerite disponível ainda. Assim que o RH publicar, ele aparece aqui.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {lista.map((h, i) => (
              <button
                key={h.id}
                onClick={() => abrir(h)}
                disabled={!!abrindo}
                className={`hstack w-full items-center gap-3 px-4 py-3.5 text-left tap disabled:opacity-60 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <FileText size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{fmtCompetencia(h.competencia)}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">
                    Holerite{h.tamanho ? ` · ${fmtTamanho(h.tamanho)}` : ''}
                  </span>
                </span>
                {abrindo === h.id ? (
                  <Loader2 size={18} className="shrink-0 animate-spin text-muted-2" />
                ) : (
                  <span className="shrink-0 text-[11px] font-semibold text-accent">abrir</span>
                )}
              </button>
            ))}
          </div>
        )}

        {erro && <p className="mt-3 text-center text-xs text-danger">{erro}</p>}
      </div>

      {visor && <VisorHolerite url={visor.url} nome={visor.nome} onClose={() => setVisor(null)} />}
    </div>
  )
}

// Leitor de PDF em tela cheia (mesmo componente das outras telas).
function VisorHolerite({ url, nome, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg">
      <div className="safe-top hstack items-center gap-2 border-b border-line bg-bg px-4 py-3">
        <button onClick={onClose} aria-label="Fechar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        <div className="min-w-0 flex-1 truncate text-sm font-semibold">{nome || 'Holerite'}</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir em nova aba"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-muted tap"
        >
          <ExternalLink size={15} />
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-2 px-3 py-3">
        <PdfViewer src={url} />
      </div>
    </div>,
    document.body,
  )
}

export default Holerites

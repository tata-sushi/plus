import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ReceiptText, FileText, Loader2 } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Página de Holerites (contracheques) — igual às Assinaturas, mas SÓ visualização
// (não exige assinatura). Lê os documentos do RH (dp_rh) via holerites_meus e abre
// o PDF direto no leitor do próprio aparelho, com URL assinada do bucket privado
// dp-documentos.

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

export function Holerites() {
  const navigate = useNavigate()
  const [lista, setLista] = useState(null) // null = carregando
  const [abrindo, setAbrindo] = useState(null) // id do holerite sendo aberto
  const [erro, setErro] = useState('')

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
    // Abre a aba já no gesto do clique (evita bloqueio de pop-up); depois de gerar
    // a URL assinada, aponta a aba pra ela — o próprio aparelho abre o leitor de PDF.
    const aba = window.open('', '_blank')
    const { data, error } = await supabase.storage
      .from(h.bucket || 'dp-documentos')
      .createSignedUrl(h.path, 3600)
    setAbrindo(null)
    if (error || !data?.signedUrl) {
      if (aba) aba.close()
      setErro('Não consegui abrir o holerite agora. Tente de novo.')
      return
    }
    // Carimba o acesso a este holerite (fire-and-forget; não trava a abertura).
    supabase.rpc('holerite_registrar_acesso', { p_documento_id: h.id }).then(
      () => {},
      () => {},
    )
    if (aba) {
      aba.location.href = data.signedUrl
    } else {
      // Pop-up bloqueado: navega na própria janela.
      window.location.href = data.signedUrl
    }
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
                  <span className="mt-0.5 block truncate text-[11px] text-muted">Holerite</span>
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
    </div>
  )
}

export default Holerites

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Send } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { carregarMotivos, iconeMotivo } from '../lib/reconhecimento.js'
import { cn } from '../lib/cn'

const MAX_MSG = 280
const soPrimeiro = (n) => (n || 'Colaborador').split(/\s+/)[0]

// Sheet (bottom) pra reconhecer um colega: escolhe o motivo (chips da RPC 4),
// escreve uma mensagem opcional e registra via reconhecimento_registrar (RPC 1).
// Sem nota/estrela. `de` é resolvido no servidor pela sessão — não enviamos.
export function ReconhecerSheet({ paraMatricula, paraNome, onClose, onSucesso }) {
  const [motivos, setMotivos] = useState([])
  const [motivo, setMotivo] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    carregarMotivos().then((m) => ativo && setMotivos(m))
    return () => {
      ativo = false
    }
  }, [])

  async function enviar() {
    if (!motivo || enviando) return
    tapHaptic()
    setEnviando(true)
    setErro('')
    const { data, error } = await supabase.rpc('reconhecimento_registrar', {
      p_para_matricula: paraMatricula,
      p_motivo: motivo,
      p_mensagem: mensagem.trim() || null,
    })
    setEnviando(false)
    if (error || !data) {
      setErro(error?.message || 'Não foi possível reconhecer agora. Tente de novo.')
      return
    }
    const label = motivos.find((m) => m.slug === motivo)?.label || motivo
    onSucesso?.({ id: data, motivo, motivoLabel: label })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-bg p-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        <div className="hstack items-center justify-between">
          <div className="font-display text-base font-bold">
            Reconhecer {soPrimeiro(paraNome)}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-1 text-xs text-muted">Escolha o motivo do reconhecimento.</p>

        {/* Motivos (chips, seleção única) */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {motivos.map((m) => {
            const Icon = iconeMotivo(m.slug)
            const on = motivo === m.slug
            return (
              <button
                key={m.slug}
                onClick={() => {
                  tapHaptic()
                  setMotivo(m.slug)
                }}
                className={cn(
                  'hstack gap-1.5 rounded-pill border px-3 py-2 text-xs font-semibold tap',
                  on
                    ? 'border-accent bg-accent text-black'
                    : 'border-line bg-surface text-text',
                )}
              >
                <Icon size={14} className={on ? '' : 'text-accent'} />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Mensagem opcional */}
        <div className="mt-4">
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value.slice(0, MAX_MSG))}
            rows={3}
            placeholder="Mensagem (opcional) — ex.: salvou o rush de sexta!"
            className="w-full resize-none rounded-card border border-line bg-surface px-3.5 py-3 text-sm outline-none focus:border-accent"
          />
          <div className="mt-1 text-right text-[11px] text-muted-2">
            {mensagem.length}/{MAX_MSG}
          </div>
        </div>

        {erro && <p className="mt-1 text-xs font-medium text-danger">{erro}</p>}

        <div className="mt-3 hstack gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 !py-3 text-sm">
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={!motivo || enviando}
            className="btn-primary flex-1 !py-3 text-sm disabled:opacity-50"
          >
            {enviando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Send size={16} /> Reconhecer
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

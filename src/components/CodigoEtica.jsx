import { useState } from 'react'
import { Check, ArrowRight, ArrowLeft, Loader2, ShieldCheck, PenLine } from 'lucide-react'
import { ProgressBar } from './ProgressBar.jsx'
import { ProvaDesafio } from './ProvaDesafio.jsx'
import { AssinaturaPad } from './AssinaturaPad.jsx'
import { cn } from '../lib/cn'
import { supabase } from '../lib/supabase.js'

// Leitura guiada em blocos do Código de Ética: um bloco por vez, com barra de
// progresso. Cada bloco avança de um jeito: prova (acertar a verificação),
// aceite ("Li e concordo") ou assinatura (termo final). A correção das provas
// é no servidor (responder_bloco); a conclusão é a assinatura (onAssinar).
export function CodigoEtica({ treinoId, blocos, concluido, personalizar, onAssinar }) {
  const total = blocos.length
  const [passo, setPasso] = useState(0)
  const [feitos, setFeitos] = useState(() =>
    concluido ? new Set(blocos.map((_, i) => i)) : new Set(),
  )
  const [respostas, setRespostas] = useState({}) // { blocoIdx: { qid: oid } }
  const [resultado, setResultado] = useState(null) // reprovado do bloco atual
  const [enviando, setEnviando] = useState(false)
  const [assinando, setAssinando] = useState(false)
  const [erroAssinar, setErroAssinar] = useState(false)
  const [assinou, setAssinou] = useState(false)

  const b = blocos[passo]
  const ehUltimo = passo === total - 1
  const pct = concluido ? 1 : feitos.size / total

  function ir(i) {
    setResultado(null)
    setPasso(i)
  }
  function avancar() {
    setFeitos((s) => new Set(s).add(passo))
    if (!ehUltimo) ir(passo + 1)
  }

  const respBloco = respostas[passo] || {}
  const todasResp =
    b.acao === 'prova' && (b.prova?.questoes || []).every((q) => respBloco[q.id])

  function escolher(qid, oid) {
    setRespostas((r) => ({ ...r, [passo]: { ...(r[passo] || {}), [qid]: oid } }))
    setResultado(null)
  }

  async function enviarProva() {
    if (!todasResp || enviando) return
    setEnviando(true)
    const { data, error } = await supabase.rpc('responder_bloco', {
      p_treino: treinoId,
      p_indice: passo,
      p_respostas: respBloco,
    })
    setEnviando(false)
    if (!error && data?.ok && data.aprovado) avancar()
    else if (!error && data?.ok) setResultado(data)
    else setResultado({ aprovado: false, erro: true })
  }

  async function assinar() {
    if (assinando) return
    setAssinando(true)
    setErroAssinar(false)
    const r = await onAssinar()
    setAssinando(false)
    if (!r?.ok) setErroAssinar(true)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Progresso */}
      <div className="border-b border-line px-5 py-3">
        <div className="hstack justify-between text-xs font-semibold">
          <span className="text-muted">
            Parte {passo + 1} de {total}
          </span>
          <span className="text-accent">{Math.round(pct * 100)}%</span>
        </div>
        <div className="mt-2">
          <ProgressBar value={pct} />
        </div>
      </div>

      {/* Conteúdo do bloco */}
      <div key={passo} className="animate-page flex-1 overflow-y-auto px-5 py-5">
        <h2 className="font-display text-lg font-bold leading-tight">{b.titulo}</h2>
        <div
          className="conteudo mt-3 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: personalizar(b.html) }}
        />

        {b.acao === 'prova' && (
          <div className="mt-7 border-t border-line pt-6">
            <ProvaDesafio
              prova={b.prova}
              respostas={respBloco}
              onResponder={escolher}
              resultado={resultado}
              concluido={concluido}
              gabarito={b.prova?.gabarito}
            />
          </div>
        )}

        {(b.acao === 'aceite' || b.acao === 'assinatura') && (
          <div className="mt-7 rounded-card border border-accent/30 bg-accent-soft px-4 py-3.5">
            <div className="hstack items-start gap-2.5">
              {b.acao === 'assinatura' ? (
                <PenLine size={17} className="mt-0.5 shrink-0 text-accent" />
              ) : (
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent" />
              )}
              <p className="text-sm font-medium leading-snug">
                {personalizar(b.acao === 'assinatura' ? b.declaracao : b.aceite)}
              </p>
            </div>
          </div>
        )}

        {b.acao === 'assinatura' && !concluido && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-muted">Sua assinatura</p>
            <AssinaturaPad onChange={setAssinou} />
          </div>
        )}
      </div>

      {/* Rodapé de ação */}
      <div className="safe-bottom border-t border-line px-5 py-3">
        {concluido ? (
          <div className="hstack gap-2">
            <button
              onClick={() => ir(Math.max(0, passo - 1))}
              disabled={passo === 0}
              className={cn('btn-ghost !py-2.5 text-xs', passo === 0 && 'opacity-40')}
            >
              <ArrowLeft size={15} /> Anterior
            </button>
            <div className="hstack flex-1 justify-center gap-1.5 text-xs font-semibold text-accent">
              <Check size={15} strokeWidth={3} /> Concluído
            </div>
            <button
              onClick={() => ir(Math.min(total - 1, passo + 1))}
              disabled={ehUltimo}
              className={cn('btn-ghost !py-2.5 text-xs', ehUltimo && 'opacity-40')}
            >
              Próximo <ArrowRight size={15} />
            </button>
          </div>
        ) : b.acao === 'prova' ? (
          <div className="space-y-2">
            {resultado?.erro && (
              <p className="text-center text-xs font-medium text-danger">
                Não foi possível enviar agora. Tente de novo.
              </p>
            )}
            <button
              onClick={enviarProva}
              disabled={!todasResp || enviando}
              className={cn(
                'btn-primary w-full !py-3.5 text-sm',
                (!todasResp || enviando) && 'opacity-60',
              )}
            >
              {enviando ? <Loader2 size={18} className="animate-spin" /> : 'Enviar resposta'}
            </button>
            {!todasResp && (
              <p className="text-center text-[11px] text-muted-2">Escolha uma resposta para enviar.</p>
            )}
          </div>
        ) : b.acao === 'aceite' ? (
          <button onClick={avancar} className="btn-primary w-full !py-3.5 text-sm">
            <ShieldCheck size={17} /> Li e concordo
          </button>
        ) : (
          <div className="space-y-2">
            {erroAssinar && (
              <p className="text-center text-xs font-medium text-danger">
                Não foi possível assinar agora. Tente de novo.
              </p>
            )}
            <button
              onClick={assinar}
              disabled={assinando || !assinou}
              className={cn(
                'btn-primary w-full !py-3.5 text-sm',
                (assinando || !assinou) && 'opacity-60',
              )}
            >
              {assinando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <PenLine size={17} /> {b.botao || 'Assinar e concluir'}
                </>
              )}
            </button>
            {!assinou && (
              <p className="text-center text-[11px] text-muted-2">Assine no quadro para concluir.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

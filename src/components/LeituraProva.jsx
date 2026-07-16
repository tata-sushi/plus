import { useRef, useState } from 'react'
import { Loader2, ArrowRight, ArrowLeft, FileText, CheckCircle2, ArrowDown } from 'lucide-react'
import { PdfViewer } from './PdfViewer.jsx'
import { ProvaDesafio } from './ProvaDesafio.jsx'
import { cn } from '../lib/cn'

// Leitura obrigatória (PDF) + prova numa SEGUNDA página. A prova nunca aparece
// junto do PDF: a pessoa lê primeiro, avança, e só então responde — sem poder
// consultar as respostas no material enquanto faz o quiz.
export function LeituraProva({
  introHtml,
  pdfUrl,
  prova,
  concluido,
  respostas,
  onResponder,
  resultado,
  onEnviar,
  enviando,
}) {
  const [fase, setFase] = useState('leitura')
  const [lido, setLido] = useState(concluido)
  const scrollRef = useRef(null)
  const questoes = prova?.questoes || []
  const todasResp = questoes.length > 0 && questoes.every((q) => respostas[q.id])

  // após o PDF renderizar: se couber sem rolar, já libera; senão espera a rolagem
  function aoRenderizar() {
    const el = scrollRef.current
    if (el && el.scrollHeight <= el.clientHeight + 4) setLido(true)
  }
  function aoRolar(e) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) setLido(true)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* trilho de etapas */}
      <div className="hstack gap-3 border-b border-line px-5 py-2.5 text-[11px] font-bold">
        <span className={cn(fase === 'leitura' ? 'text-accent' : 'text-muted-2')}>1 · Leitura</span>
        <span className="h-px flex-1 bg-line" />
        <span className={cn(fase === 'prova' ? 'text-accent' : 'text-muted-2')}>2 · Prova</span>
      </div>

      {fase === 'leitura' ? (
        <div
          ref={scrollRef}
          onScroll={aoRolar}
          className="animate-page flex-1 overflow-y-auto px-5 py-5"
        >
          {introHtml && (
            <div
              className="conteudo mb-5 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          )}
          <p className="mb-2 hstack gap-1.5 text-xs font-semibold text-muted">
            <FileText size={14} /> Cartilha — leia até o fim
          </p>
          <PdfViewer src={pdfUrl} inline onLido={aoRenderizar} />
        </div>
      ) : (
        <div key="prova" className="animate-page flex-1 overflow-y-auto px-5 py-5">
          <ProvaDesafio
            prova={prova}
            respostas={respostas}
            onResponder={onResponder}
            resultado={resultado}
            concluido={concluido}
            gabarito={prova?.gabarito}
          />
        </div>
      )}

      {/* rodapé */}
      <div className="safe-bottom border-t border-line px-5 py-3">
        {concluido ? (
          <div className="hstack gap-2">
            <button
              onClick={() => setFase('leitura')}
              disabled={fase === 'leitura'}
              className={cn('btn-ghost !py-2.5 text-xs', fase === 'leitura' && 'opacity-40')}
            >
              <ArrowLeft size={15} /> Cartilha
            </button>
            <div className="hstack flex-1 justify-center gap-1.5 text-xs font-semibold text-accent">
              <CheckCircle2 size={15} /> Concluído
            </div>
            <button
              onClick={() => setFase('prova')}
              disabled={fase === 'prova'}
              className={cn('btn-ghost !py-2.5 text-xs', fase === 'prova' && 'opacity-40')}
            >
              Prova <ArrowRight size={15} />
            </button>
          </div>
        ) : fase === 'leitura' ? (
          <button
            onClick={() => setFase('prova')}
            disabled={!lido}
            className={cn('btn-primary w-full !py-3.5 text-sm', !lido && 'opacity-60')}
          >
            {lido ? (
              <>
                Ir para a prova <ArrowRight size={16} />
              </>
            ) : (
              <>
                <ArrowDown size={16} className="animate-bounce" /> Role a cartilha até o fim
              </>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            {resultado?.erro && (
              <p className="text-center text-xs font-medium text-danger">
                Não foi possível enviar agora. Tente de novo.
              </p>
            )}
            <button
              onClick={onEnviar}
              disabled={!todasResp || enviando}
              className={cn(
                'btn-primary w-full !py-3.5 text-sm',
                (!todasResp || enviando) && 'opacity-60',
              )}
            >
              {enviando ? <Loader2 size={18} className="animate-spin" /> : 'Enviar resposta'}
            </button>
            {!todasResp && (
              <p className="text-center text-[11px] text-muted-2">Responda todas para enviar.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

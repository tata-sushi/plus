import { useRef, useState } from 'react'
import { Loader2, ArrowRight, ArrowLeft, FileText, CheckCircle2, ArrowDown, Download, Clock } from 'lucide-react'
import { PdfViewer } from './PdfViewer.jsx'
import { ProvaDesafio } from './ProvaDesafio.jsx'
import { ProgressBar } from './ProgressBar.jsx'
import { cn } from '../lib/cn'

// tempo de espera legível a partir de segundos
function tempoEspera(s) {
  if (!s || s <= 0) return 'instantes'
  if (s >= 3600) return `${Math.ceil(s / 3600)}h`
  if (s >= 60) return `${Math.ceil(s / 60)} min`
  return 'instantes'
}

// Leitura obrigatória (PDF) + prova numa SEGUNDA página, no modelo em partes do
// Código de Ética (Parte 1 de 2 + %). A prova nunca aparece junto do PDF: a pessoa
// lê primeiro, avança, e só então responde — sem consultar as respostas no material.
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
  const pct = concluido ? 1 : fase === 'prova' ? 0.5 : 0

  // em espera: acabou de errar (com timer) ou tentou de novo cedo demais
  const emEspera =
    !concluido && !!resultado && !resultado.aprovado && (resultado.aguarde || resultado.espera_horas > 0)
  const segRestantes = resultado?.segundos ?? (resultado?.espera_horas || 0) * 3600

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
      {/* progresso em partes (modelo Código de Ética) */}
      <div className="border-b border-line px-5 py-3">
        <div className="hstack justify-between text-xs font-semibold">
          <span className="text-muted">Parte {fase === 'leitura' ? 1 : 2} de 2</span>
          <span className="text-accent">{Math.round(pct * 100)}%</span>
        </div>
        <div className="mt-2">
          <ProgressBar value={pct} />
        </div>
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
          <a
            href={`${pdfUrl}?download`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost mt-3 w-full !py-3 text-sm"
          >
            <Download size={16} /> Baixar PDF
          </a>
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
        ) : emEspera ? (
          <div className="rounded-card border border-warn/30 bg-warn/10 px-4 py-3.5 text-center">
            <Clock className="mx-auto text-warn" size={22} />
            <p className="mt-1.5 text-sm font-bold text-warn">
              {resultado.aguarde ? 'Ainda no intervalo de espera' : 'Não foi dessa vez'}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Você pode refazer a prova em <strong>~{tempoEspera(segRestantes)}</strong>.
            </p>
          </div>
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

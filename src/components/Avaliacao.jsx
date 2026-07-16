import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/cn'

// Desafio de avaliação (nota, ex.: NPS 0–10): mostra o conteúdo + a pergunta
// com a escala de notas. Enviar a nota conclui o desafio e credita os pontos.
export function Avaliacao({ introHtml, avaliacao, concluido, onEnviar, enviando }) {
  const [nota, setNota] = useState(null)
  const min = avaliacao?.min ?? 0
  const max = avaliacao?.max ?? 10
  const notas = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {introHtml && (
          <div
            className="conteudo text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        )}

        <div className="mt-8 border-t border-line pt-6">
          <p className="text-sm font-bold text-accent">{avaliacao?.pergunta || 'Sua avaliação'}</p>

          {concluido ? (
            <div className="mt-4 rounded-card border border-accent/30 bg-accent-soft px-4 py-4 text-center">
              <CheckCircle2 className="mx-auto text-accent" size={24} />
              <p className="mt-1.5 text-sm font-semibold text-accent">
                Avaliação enviada. Obrigado! 💚
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-11">
                {notas.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNota(n)}
                    className={cn(
                      'grid h-10 place-items-center rounded-xl border text-sm font-bold tap',
                      nota === n
                        ? 'border-accent bg-accent text-black'
                        : 'border-line bg-surface text-muted',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {(avaliacao?.rotulo_min || avaliacao?.rotulo_max) && (
                <div className="mt-2 hstack justify-between text-[11px] text-muted-2">
                  <span>{avaliacao?.rotulo_min}</span>
                  {avaliacao?.rotulo_meio && <span>{avaliacao.rotulo_meio}</span>}
                  <span>{avaliacao?.rotulo_max}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!concluido && (
        <div className="safe-bottom border-t border-line px-5 py-3">
          <button
            onClick={() => onEnviar(nota)}
            disabled={nota == null || enviando}
            className={cn(
              'btn-primary w-full !py-3.5 text-sm',
              (nota == null || enviando) && 'opacity-60',
            )}
          >
            {enviando ? <Loader2 size={18} className="animate-spin" /> : 'Enviar'}
          </button>
          {nota == null && (
            <p className="mt-2 text-center text-[11px] text-muted-2">Escolha uma nota para enviar.</p>
          )}
        </div>
      )}
    </div>
  )
}

import { Check } from 'lucide-react'
import { cn } from '../lib/cn'

// Prova do desafio, respondida na mesma tela (sem modal, sem sobrepor o texto).
// O gabarito NÃO vem pro cliente: a correção é feita no servidor (responder_prova),
// então aqui só temos enunciado + opções. Depois de um envio errado, as questões
// erradas ficam destacadas até a pessoa escolher de novo.
export function ProvaDesafio({ prova, respostas, onResponder, resultado }) {
  const questoes = prova?.questoes || []
  const multiplas = questoes.length > 1
  const erradas = new Set(
    resultado && !resultado.aprovado && Array.isArray(resultado.erradas) ? resultado.erradas : [],
  )

  return (
    <div className="flex flex-col gap-7">
      <div className="hstack gap-2 text-accent">
        <span className="text-xs font-bold uppercase tracking-wide">Prova</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {questoes.map((q, qi) => {
        const errou = erradas.has(q.id)
        return (
          <div key={q.id}>
            <div className="mb-3 hstack items-start gap-2">
              {multiplas && (
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                  {qi + 1}
                </span>
              )}
              <p className="text-sm font-semibold leading-snug">{q.enunciado}</p>
            </div>

            <div className="flex flex-col gap-2">
              {(q.opcoes || []).map((o) => {
                const escolhida = respostas[q.id] === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onResponder(q.id, o.id)}
                    className={cn(
                      'hstack w-full items-start gap-3 rounded-card border px-4 py-3 text-left text-sm tap transition-colors',
                      escolhida
                        ? 'border-accent bg-accent-soft'
                        : errou
                          ? 'border-danger/40 bg-surface'
                          : 'border-line bg-surface',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                        escolhida ? 'border-accent bg-accent text-black' : 'border-muted-2',
                      )}
                    >
                      {escolhida && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className={cn('flex-1 leading-snug', escolhida && 'font-medium')}>
                      {o.texto}
                    </span>
                  </button>
                )
              })}
            </div>

            {errou && (
              <p className="mt-2 text-xs font-medium text-danger">
                Essa resposta não está certa. Revise o conteúdo e escolha de novo.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { Check, X } from 'lucide-react'
import { cn } from '../lib/cn'

// Prova do desafio, respondida na mesma tela (sem modal, sem sobrepor o texto).
// O gabarito NÃO vem pro cliente na abertura: a correção é no servidor
// (responder_prova). Depois de um envio errado, o servidor devolve qual era a
// certa só das questões erradas — então a opção marcada errada fica vermelha e
// a correta fica verde. Ao trocar a resposta, o destaque some.
// Quando o desafio já está concluído, o servidor manda o gabarito e a resposta
// certa fica marcada em verde (só leitura), pra pessoa lembrar o que acertou.
export function ProvaDesafio({ prova, respostas, onResponder, resultado, concluido, gabarito }) {
  const questoes = prova?.questoes || []
  const multiplas = questoes.length > 1
  const reprovado = !concluido && resultado && !resultado.aprovado
  const erradas = new Set(reprovado && Array.isArray(resultado.erradas) ? resultado.erradas : [])
  const corretas = reprovado && resultado.corretas ? resultado.corretas : {}
  const gab = concluido && gabarito ? gabarito : null

  return (
    <div className="flex flex-col gap-7">
      <p className="text-[0.95rem] font-bold text-accent">Hora da revisão!</p>

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
                // concluído: só a resposta certa (gabarito) fica verde, em leitura.
                // envio errado: a marcada fica vermelha, a certa verde.
                const vermelha = errou && escolhida
                const verde = gab
                  ? gab[q.id] === o.id
                  : errou
                    ? corretas[q.id] === o.id
                    : escolhida
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={concluido}
                    onClick={() => !concluido && onResponder(q.id, o.id)}
                    className={cn(
                      'hstack w-full items-start gap-3 rounded-card border px-4 py-3 text-left text-sm transition-colors',
                      !concluido && 'tap',
                      vermelha
                        ? 'border-danger bg-danger/10'
                        : verde
                          ? 'border-accent bg-accent-soft'
                          : 'border-line bg-surface',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                        vermelha
                          ? 'border-danger bg-danger text-white'
                          : verde
                            ? 'border-accent bg-accent text-black'
                            : 'border-muted-2',
                      )}
                    >
                      {vermelha ? (
                        <X size={13} strokeWidth={3} />
                      ) : verde ? (
                        <Check size={13} strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className={cn('flex-1 leading-snug', (vermelha || verde) && 'font-medium')}>
                      {o.texto}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

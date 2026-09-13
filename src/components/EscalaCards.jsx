import { useState } from 'react'
import { cn } from '../lib/cn'

// Cards interativos usados dentro do desafio "A escala, a régua e as categorias"
// (categoria Avaliações & Feedbacks). São injetados no conteúdo via tokens
// [[escala-likert]] e [[regua]] — ver ConteudoComWidgets em Treinamentos.jsx.

// ── Escala de resposta (1 a 5) ───────────────────────────────────────────────
// Nomenclatura oficial das escalas do Tatá: Nada · Pouco · Moderado · Bastante · Muito.
const LIKERT = ['Nada', 'Pouco', 'Moderado', 'Bastante', 'Muito']

function EscalaLikert() {
  const [sel, setSel] = useState(3) // começa no meio pra já mostrar algo

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Como você responde</p>
      <p className="mt-0.5 text-xs text-muted">Toque em um número para ver o que ele significa.</p>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSel(n)}
            className={cn(
              'grid h-11 place-items-center rounded-xl border text-base font-bold tap',
              sel === n
                ? 'border-accent bg-accent text-black'
                : 'border-line bg-surface-2 text-muted',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-2 hstack justify-between text-[11px] font-medium text-muted-2">
        <span>Nada</span>
        <span>Moderado</span>
        <span>Muito</span>
      </div>

      <div className="mt-3 rounded-xl bg-accent-soft px-3 py-2.5 text-center text-sm">
        <span className="font-bold text-accent">{sel}</span>
        <span className="text-muted"> = </span>
        <span className="font-semibold">{LIKERT[sel - 1]}</span>
      </div>
    </div>
  )
}

// ── Régua de classificação (média de 1,0 a 5,0) ──────────────────────────────
// Mesma nomenclatura da apresentação: Nada · Pouco · Moderado · Bastante · Muito.
const FAIXAS = [
  { nome: 'Nada', faixa: '< 3,0', cor: '231 76 60', min: 1.0, escuro: false },
  { nome: 'Pouco', faixa: '3,0–3,4', cor: '243 156 18', min: 3.0, escuro: false },
  { nome: 'Moderado', faixa: '3,5–3,9', cor: '241 196 15', min: 3.5, escuro: false },
  { nome: 'Bastante', faixa: '4,0–4,4', cor: '92 184 92', min: 4.0, escuro: false },
  { nome: 'Muito', faixa: '≥ 4,5', cor: '30 126 52', min: 4.5, escuro: true },
]
function ReguaClassificacao() {
  const [sel, setSel] = useState(1) // "Pouco" por padrão (bate com o exemplo de média 3,2)
  const f = FAIXAS[sel]

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Como a média é lida</p>
      <p className="mt-0.5 text-xs text-muted">Toque numa faixa para ver o que ela significa.</p>

      {/* faixa selecionada */}
      <div className="mt-3 text-center">
        <span className="font-display text-2xl font-extrabold" style={{ color: `rgb(${f.cor})` }}>
          {f.nome}
        </span>
        <p className="mt-0.5 text-xs font-semibold" style={{ color: `rgb(${f.cor})` }}>
          média {f.faixa}
        </p>
      </div>

      {/* régua de classificação — cards clicáveis (estilo da apresentação) */}
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {FAIXAS.map((x, i) => {
          const on = i === sel
          return (
            <button
              key={x.nome}
              type="button"
              onClick={() => setSel(i)}
              className={cn(
                'rounded-lg px-1 py-2 text-center tap transition-all',
                on ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : 'opacity-40',
              )}
              style={{ background: `rgb(${x.cor})`, color: x.escuro ? '#fff' : '#1a1a1a' }}
            >
              <div className="text-[10px] font-bold leading-tight">{x.nome}</div>
              <div className="mt-0.5 text-[8px] font-semibold opacity-90">{x.faixa}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Seleciona o card pelo token do conteúdo.
export function EscalaCard({ tipo }) {
  if (tipo === 'escala-likert') return <EscalaLikert />
  if (tipo === 'regua') return <ReguaClassificacao />
  return null
}

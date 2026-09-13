import { useState } from 'react'
import { cn } from '../lib/cn'

// Cards interativos usados dentro do desafio "A escala, a régua e as categorias"
// (categoria Avaliações & Feedbacks). São injetados no conteúdo via tokens
// [[escala-likert]] e [[regua]] — ver ConteudoComWidgets em Treinamentos.jsx.

// ── Escala de resposta (Likert 1 a 5) ────────────────────────────────────────
const LIKERT = ['Nunca', 'Quase nunca', 'Às vezes', 'Quase sempre', 'Sempre']

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
        <span>Nunca</span>
        <span>Às vezes</span>
        <span>Sempre</span>
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
const FAIXAS = [
  { nome: 'Crítico', desc: 'Precisa de ação imediata', cor: '239 68 68', min: 1.0 },
  { nome: 'Atenção', desc: 'Requer atenção', cor: '245 158 11', min: 3.0 },
  { nome: 'Observação', desc: 'De olho, com acompanhamento', cor: '234 179 8', min: 3.5 },
  { nome: 'Saudável', desc: 'Vai bem', cor: '132 204 22', min: 4.0 },
  { nome: 'Destaque', desc: 'Referência, ótimo resultado', cor: '34 197 94', min: 4.5 },
]
const MIN = 1.0
const MAX = 5.0

function faixaDe(v) {
  let f = FAIXAS[0]
  for (const x of FAIXAS) if (v >= x.min) f = x
  return f
}
function pct(v) {
  return ((v - MIN) / (MAX - MIN)) * 100
}
function fmt(v) {
  return v.toFixed(1).replace('.', ',')
}

function ReguaClassificacao() {
  const [valor, setValor] = useState(3.2) // cai em "Atenção", como no exemplo do texto
  const f = faixaDe(valor)

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Como a média é lida</p>
      <p className="mt-0.5 text-xs text-muted">Arraste para ver em qual faixa a média cai.</p>

      {/* média + faixa atual */}
      <div className="mt-3 hstack items-baseline justify-center gap-2">
        <span className="font-display text-3xl font-extrabold" style={{ color: `rgb(${f.cor})` }}>
          {fmt(valor)}
        </span>
        <span className="hstack items-center gap-1.5 text-sm font-bold" style={{ color: `rgb(${f.cor})` }}>
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: `rgb(${f.cor})` }} />
          {f.nome}
        </span>
      </div>
      <p className="mt-1 text-center text-xs text-muted">{f.desc}</p>

      {/* barra proporcional das faixas + marcador */}
      <div className="relative mt-4 h-3">
        <div className="flex h-3 overflow-hidden rounded-full">
          {FAIXAS.map((x, i) => {
            const fim = i + 1 < FAIXAS.length ? FAIXAS[i + 1].min : MAX
            const w = ((fim - x.min) / (MAX - MIN)) * 100
            const ativa = x.nome === f.nome
            return (
              <div
                key={x.nome}
                style={{ width: `${w}%`, background: `rgb(${x.cor})`, opacity: ativa ? 1 : 0.28 }}
              />
            )
          })}
        </div>
        <div
          className="absolute -top-1.5 h-6 w-1 -translate-x-1/2 rounded-full bg-text ring-2 ring-surface"
          style={{ left: `${pct(valor)}%` }}
        />
      </div>

      <input
        type="range"
        min={MIN}
        max={MAX}
        step={0.1}
        value={valor}
        onChange={(e) => setValor(parseFloat(e.target.value))}
        aria-label="Média da avaliação"
        className="mt-3 w-full accent-accent"
      />

      <div className="mt-1 hstack justify-between text-[11px] font-medium text-muted-2">
        <span>1,0</span>
        <span>5,0</span>
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

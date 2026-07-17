import { useState } from 'react'
import { Sparkles, Lock } from 'lucide-react'
import { Card } from './Card.jsx'
import { DISC, dominanteDe } from '../lib/disc.js'
import { cn } from '../lib/cn'

// Seletor de variação "texto" (U+FE0E): símbolo do signo monocromático (cítrico).
const VS_TEXTO = String.fromCharCode(0xfe0e)

function resumoDisc(p) {
  const dom = dominanteDe(p.pontuacoes || {})
  const r = p.perfil
  const sigla = r === 'Equilibrado' ? '≈' : r?.length === 2 ? r : dom
  const rotulo = r === 'Equilibrado' ? 'Equilibrado' : DISC[dom]?.nome
  return { sigla, cor: DISC[dom]?.cor, rotulo }
}

function Quadro({ children, onClick, ativo, className }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'card flex flex-col items-center gap-1.5 px-1.5 py-3.5 text-center tap',
        !onClick && 'cursor-default',
        ativo && 'ring-1 ring-accent',
        className,
      )}
    >
      {children}
    </button>
  )
}

// Quadros de perfil comportamental. Presentacional:
//  - disc: { perfil, pontuacoes } | null
//  - signo: objeto do lib/signo | null
//  - onDiscFeito: callback ao tocar o DISC concluído (ex.: abrir resultado) — opcional
//  - onDiscFazer: callback quando ainda não fez o DISC (ex.: ir aos desafios) — opcional
//    (sem esse callback, o quadro do DISC fica só de leitura: "Sem perfil")
export function QuadrosPerfil({ disc, signo, onDiscFeito, onDiscFazer }) {
  const [signoAberto, setSignoAberto] = useState(false)
  const feito = !!disc
  const r = feito ? resumoDisc(disc) : null

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {/* DISC */}
        <Quadro onClick={feito ? onDiscFeito : onDiscFazer}>
          {feito ? (
            <span
              className="grid h-9 w-9 place-items-center rounded-xl font-display text-sm font-bold text-white"
              style={{ background: r.cor }}
            >
              {r.sigla}
            </span>
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted">
              {onDiscFazer ? <Sparkles size={16} className="text-accent" /> : <Lock size={14} />}
            </span>
          )}
          <span className="text-xs font-semibold leading-none">DISC</span>
          <span className="text-[10px] leading-tight text-muted">
            {feito ? r.rotulo : onDiscFazer ? 'Fazer teste' : 'Sem perfil'}
          </span>
        </Quadro>

        {/* MBTI · Big Five — em breve */}
        {['MBTI', 'Big Five'].map((nome) => (
          <Quadro key={nome}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted">
              <Lock size={14} />
            </span>
            <span className="text-xs font-semibold leading-none">{nome}</span>
            <span className="text-[10px] leading-tight text-muted">Em breve</span>
          </Quadro>
        ))}

        {/* Signo */}
        <Quadro
          onClick={signo ? () => setSignoAberto((v) => !v) : undefined}
          ativo={signoAberto}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-lg leading-none text-accent">
            {signo ? signo.emoji + VS_TEXTO : '—'}
          </span>
          <span className="text-xs font-semibold leading-none">Signo</span>
          <span className="text-[10px] leading-tight text-muted">{signo ? signo.nome : '—'}</span>
        </Quadro>
      </div>

      {signoAberto && signo && (
        <Card className="mt-2">
          <div className="hstack gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl leading-none text-accent">
              {signo.emoji + VS_TEXTO}
            </span>
            <div className="min-w-0">
              <div className="font-display text-base font-bold">{signo.nome}</div>
              <div className="text-xs text-muted">Elemento {signo.elemento}</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">{signo.review}</p>
        </Card>
      )}
    </>
  )
}

import { Sparkles, Lock } from 'lucide-react'
import { Card } from './Card.jsx'
import { DISC, ORDEM, dominanteDe } from '../lib/disc.js'
import { cn } from '../lib/cn'

// Seletor de variação "texto" (U+FE0E): símbolo do signo monocromático (cítrico).
const VS_TEXTO = String.fromCharCode(0xfe0e)

function nomeDisc(p) {
  const r = p.perfil
  const dom = dominanteDe(p.pontuacoes || {})
  if (r === 'Equilibrado') return 'Equilibrado'
  if (r?.length === 2 && DISC[r[1]]) return `${DISC[r[0]].nome} + ${DISC[r[1]].nome}`
  return DISC[dom]?.nome
}

// DISC completo (sem navegação): dominante + barras + descrição do perfil dominante.
function DiscAberto({ disc }) {
  const pont = disc.pontuacoes || {}
  const total = ORDEM.reduce((s, k) => s + (Number(pont[k]) || 0), 0) || 1
  const dom = dominanteDe(pont)
  const r = disc.perfil
  const sigla = r === 'Equilibrado' ? '≈' : r?.length === 2 ? r : dom

  return (
    <Card>
      <div className="hstack gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft font-display text-base font-bold text-accent">
          {sigla}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">DISC</div>
          <div className="font-display text-base font-bold">{nomeDisc(disc)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {ORDEM.map((k) => {
          const pct = Math.round(((Number(pont[k]) || 0) / total) * 100)
          return (
            <div key={k}>
              <div className="hstack justify-between text-xs font-semibold">
                <span>{DISC[k].nome}</span>
                <span className="text-muted">{pct}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {DISC[dom]?.desc && <p className="mt-3 text-sm text-muted">{DISC[dom].desc}</p>}
    </Card>
  )
}

function EmBreve() {
  return (
    <Card>
      {['MBTI', 'Big Five'].map((n, i) => (
        <div key={n} className={cn('hstack gap-3', i > 0 && 'mt-2 border-t border-line pt-2')}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted-2">
            <Lock size={15} />
          </span>
          <span className="flex-1 text-sm font-semibold">{n}</span>
          <span className="text-[11px] font-medium text-muted-2">Em breve</span>
        </div>
      ))}
    </Card>
  )
}

// Análises de perfil abertas, na ordem: Signo · DISC · MBTI/Big Five (em breve).
//  - disc: { perfil, pontuacoes } | null
//  - signo: objeto do lib/signo | null   (null esconde o card do signo)
//  - mostrarDisc: false esconde o bloco do DISC de vez
//  - onFazer: ir aos desafios quando ainda não fez o DISC (perfil próprio) — opcional
export function AnalisesPerfil({ disc, signo, onFazer, mostrarDisc = true }) {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Signo */}
      {signo && (
        <Card>
          <div className="hstack gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl leading-none text-accent">
              {signo.emoji + VS_TEXTO}
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Signo
              </div>
              <div className="font-display text-base font-bold">
                {signo.nome} · {signo.elemento}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">{signo.review}</p>
        </Card>
      )}

      {/* DISC */}
      {mostrarDisc && (disc ? (
        <DiscAberto disc={disc} />
      ) : (
        <Card>
          <div className="hstack gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Sparkles size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">DISC</div>
              <div className="text-xs text-muted">
                {onFazer ? 'Descubra seu perfil comportamental.' : 'Ainda não fez o teste.'}
              </div>
            </div>
            {onFazer && (
              <button onClick={onFazer} className="btn-primary shrink-0 !py-2 text-xs">
                Fazer
              </button>
            )}
          </div>
        </Card>
      ))}

      {/* MBTI · Big Five */}
      <EmBreve />
    </div>
  )
}

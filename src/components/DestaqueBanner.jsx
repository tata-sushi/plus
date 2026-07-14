import { Link } from 'react-router-dom'
import { Target, Trophy, Megaphone, Star, ChevronRight, Sparkles } from 'lucide-react'

// Cada categoria tem um "template" de fundo (placeholder até chegarem as artes).
// Quando houver imagem real, d.imagem_url entra por cima do gradiente.
const TEMPLATES = {
  desafio: { grad: 'from-amber-500/30 via-amber-500/5', Icon: Target, tint: 'text-amber-200' },
  ranking: { grad: 'from-violet-500/30 via-violet-500/5', Icon: Trophy, tint: 'text-violet-200' },
  comunicado: { grad: 'from-accent/30 via-accent/5', Icon: Megaphone, tint: 'text-accent' },
  pontos: { grad: 'from-emerald-500/30 via-emerald-500/5', Icon: Star, tint: 'text-emerald-200' },
}

export function DestaqueBanner({ d }) {
  const tpl = TEMPLATES[d.template] || TEMPLATES.comunicado
  const Icon = tpl.Icon

  return (
    <Link
      to={d.cta_to || '/'}
      className="relative block overflow-hidden rounded-3xl border border-line bg-surface tap"
    >
      {/* fundo: arte real (futuro) ou gradiente do template */}
      {d.imagem_url ? (
        <img src={d.imagem_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className={`absolute inset-0 bg-gradient-to-tr ${tpl.grad} to-transparent`} />
      )}

      {/* ícone decorativo grande, bem sutil */}
      <Icon
        size={150}
        strokeWidth={1.25}
        className={`pointer-events-none absolute -right-5 -top-6 opacity-[0.08] ${tpl.tint}`}
      />

      {/* scrim para legibilidade do texto */}
      <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

      {/* conteúdo */}
      <div className="relative flex min-h-[224px] flex-col justify-end gap-3 p-5">
        <div>
          <div className="hstack gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/70">
            <Sparkles size={12} className={tpl.tint} /> Notícias
          </div>
          <div className="mt-1.5 font-display text-lg font-bold leading-snug text-white">
            {d.titulo}
          </div>
          {d.texto && <div className="mt-1 line-clamp-2 text-xs text-white/75">{d.texto}</div>}
        </div>
        {d.cta_label && (
          <span className="hstack w-fit gap-1.5 rounded-pill bg-white px-4 py-2 text-xs font-bold text-black">
            {d.cta_label} <ChevronRight size={14} />
          </span>
        )}
      </div>
    </Link>
  )
}

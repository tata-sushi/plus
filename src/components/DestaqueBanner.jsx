import { Link } from 'react-router-dom'
import {
  Target,
  Trophy,
  Megaphone,
  Star,
  ChevronRight,
  PartyPopper,
  Cake,
  Newspaper,
} from 'lucide-react'

// Cada categoria tem um "template" de fundo (placeholder até chegarem as artes).
// Quando houver imagem real, d.imagem_url entra por cima do gradiente.
const TEMPLATES = {
  desafio: { grad: 'from-amber-500/30 via-amber-500/5', Icon: Target, tint: 'text-amber-200' },
  ranking: { grad: 'from-violet-500/30 via-violet-500/5', Icon: Trophy, tint: 'text-violet-200' },
  comunicado: { grad: 'from-accent/30 via-accent/5', Icon: Megaphone, tint: 'text-accent' },
  pontos: { grad: 'from-emerald-500/30 via-emerald-500/5', Icon: Star, tint: 'text-emerald-200' },
  aniversario: {
    grad: 'from-pink-500/45 via-fuchsia-500/15',
    Icon: PartyPopper,
    tint: 'text-pink-200',
  },
}

export function DestaqueBanner({ d }) {
  // Aniversário pode vir com o alinhamento embutido no template: 'aniversario-cd'
  // = mensagem centralizada à direita (para imagens com espaço livre à direita).
  const centroDireita = d.template === 'aniversario-cd'
  const tplKey = centroDireita ? 'aniversario' : d.template
  const tpl = TEMPLATES[tplKey] || TEMPLATES.comunicado
  const Icon = tpl.Icon
  // No card de aniversário a mensagem é o conteúdo principal, então ela vem
  // maior e com mais linhas; nos demais é só um subtítulo compacto.
  const ehAniver = tplKey === 'aniversario'

  return (
    <Link
      to={d.cta_to || '/'}
      className="relative block aspect-square overflow-hidden rounded-3xl border border-line bg-surface tap"
    >
      {/* fundo: arte real (futuro) ou gradiente do template */}
      {d.imagem_url ? (
        <img src={d.imagem_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className={`absolute inset-0 bg-gradient-to-tr ${tpl.grad} to-transparent`} />
      )}

      {/* ícone decorativo grande, bem sutil */}
      <Icon
        size={200}
        strokeWidth={1.25}
        className={`pointer-events-none absolute -right-6 -top-6 opacity-[0.08] ${tpl.tint}`}
      />

      {/* scrim para legibilidade do texto (segue o alinhamento do conteúdo) */}
      <span
        className={
          centroDireita
            ? 'absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent'
            : 'absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent'
        }
      />

      {/* pílula da categoria — canto superior direito */}
      <div className="absolute right-3 top-3 z-10">
        {d.categoria === 'comunicado' && (
          <span className="pill bg-accent text-black text-[10px] uppercase tracking-wide">
            <Megaphone size={12} /> Comunicado
          </span>
        )}
        {d.categoria === 'noticia' && (
          <span className="pill bg-accent text-black text-[10px] uppercase tracking-wide">
            <Newspaper size={12} /> Notícia
          </span>
        )}
        {d.categoria === 'aniversario' && (
          <span className="pill bg-pink-500 text-white text-[10px] uppercase tracking-wide">
            <Cake size={12} /> Aniversário
          </span>
        )}
      </div>

      {/* conteúdo */}
      <div
        className={
          centroDireita
            ? 'absolute inset-0 flex flex-col items-end justify-center gap-2.5 p-5 text-right'
            : 'absolute inset-0 flex flex-col justify-end gap-2.5 p-5'
        }
      >
        <div className={centroDireita ? 'max-w-[85%]' : undefined}>
          <div className="font-display text-lg font-bold leading-snug text-white">{d.titulo}</div>
          {d.texto && (
            <div
              className={
                ehAniver
                  ? 'mt-1.5 line-clamp-5 whitespace-pre-line text-base leading-snug text-white/90'
                  : 'mt-1 line-clamp-2 text-xs text-white/75'
              }
            >
              {d.texto}
            </div>
          )}
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

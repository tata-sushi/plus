// Capa de introdução do desafio: título grande + frase de destaque.
// Padrão visual único pra todos os desafios; o texto dá a identidade de cada um.
export function IntroDesafio({ titulo, frase }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-5 py-7 text-center">
      {/* brilho suave no fundo, na cor da marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 150% at 50% -20%, rgb(var(--accent) / 0.16) 0%, rgb(var(--accent) / 0.05) 45%, transparent 75%)',
        }}
      />
      <h2 className="relative font-display text-2xl font-bold leading-tight">{titulo}</h2>
      {frase && <p className="relative mt-1.5 text-sm font-semibold text-accent">{frase}</p>}
    </div>
  )
}

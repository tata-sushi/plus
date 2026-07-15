// Capa de introdução do desafio: título grande + frase de destaque,
// com elementos abstratos suaves no fundo (padrão único; o texto dá a
// identidade de cada desafio). `variante` troca o arranjo dos elementos.
export function IntroDesafio({ titulo, frase, variante = 0 }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-12 text-center">
      <Fundo variante={variante} />
      <div className="relative">
        <h2 className="font-display text-[1.7rem] font-bold leading-tight">{titulo}</h2>
        {frase && (
          <p className="mx-auto mt-3 max-w-[22rem] whitespace-pre-line text-sm font-semibold leading-relaxed text-accent">
            {frase}
          </p>
        )}
      </div>
    </div>
  )
}

function Fundo({ variante }) {
  const v = variante % 3
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* brilho central na cor da marca */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 150% at 50% -10%, rgb(var(--accent) / 0.18) 0%, rgb(var(--accent) / 0.05) 45%, transparent 75%)',
        }}
      />
      {/* manchas abstratas desfocadas */}
      <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
      {/* formas geométricas leves — variam por desafio */}
      {v === 0 && (
        <>
          <div className="absolute -right-6 top-5 h-24 w-24 rounded-full border border-accent/20" />
          <div className="absolute left-5 bottom-5 h-14 w-14 rounded-full border border-accent/15" />
        </>
      )}
      {v === 1 && (
        <>
          <div className="absolute right-6 -top-4 h-20 w-20 rotate-12 rounded-2xl border border-accent/20" />
          <div className="absolute left-2 bottom-3 h-10 w-10 -rotate-12 rounded-lg border border-accent/15" />
        </>
      )}
      {v === 2 && (
        <>
          <div className="absolute right-4 top-8 h-16 w-16 rounded-full bg-accent/10" />
          <div className="absolute left-6 bottom-6 h-24 w-24 rounded-full border border-accent/15" />
        </>
      )}
    </div>
  )
}

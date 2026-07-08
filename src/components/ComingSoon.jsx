import { Construction } from 'lucide-react'

export function ComingSoon({ titulo, descricao }) {
  return (
    <div className="mx-5 mt-8 rounded-card border border-dashed border-white/10 bg-surface/60 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Construction size={26} />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold">{titulo}</h2>
      <p className="mt-2 text-sm text-muted">{descricao}</p>
      <span className="mt-4 inline-block pill bg-white/10 text-text">Em breve</span>
    </div>
  )
}

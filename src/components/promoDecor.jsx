import { Users, Star, Share2 } from 'lucide-react'

export function DesafiosDecor({ className }) {
  return <Users size={44} strokeWidth={1.5} className={className} />
}

export function RecompensasDecor({ className }) {
  return (
    <div className={className}>
      <div className="flex items-end gap-0.5">
        <Star size={22} strokeWidth={1.5} className="mb-1" />
        <Star size={30} strokeWidth={1.5} />
        <Star size={22} strokeWidth={1.5} className="mb-1" />
      </div>
    </div>
  )
}

export function ComunidadeDecor({ className }) {
  return <Share2 size={44} strokeWidth={1.5} className={className} />
}

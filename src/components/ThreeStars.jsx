import { Star } from 'lucide-react'

export function ThreeStars({ size = 28, strokeWidth = 2 }) {
  const big = Math.round(size * 0.72)
  const small = Math.round(size * 0.52)
  return (
    <span className="inline-flex items-end gap-[1px]">
      <Star size={small} strokeWidth={strokeWidth} className="mb-[3px]" />
      <Star size={big} strokeWidth={strokeWidth} />
      <Star size={small} strokeWidth={strokeWidth} className="mb-[3px]" />
    </span>
  )
}

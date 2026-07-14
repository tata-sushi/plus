import { cn } from '../lib/cn'

const styles = {
  urgente: 'bg-danger/15 text-danger',
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-fill text-text',
}

export function Badge({ children, variant = 'neutral', className }) {
  return (
    <span className={cn('pill', styles[variant] ?? styles.neutral, className)}>{children}</span>
  )
}

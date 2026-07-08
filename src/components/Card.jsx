import { cn } from '../lib/cn'

export function Card({ children, className, highlight = false, ...rest }) {
  return (
    <div
      className={cn(
        'card p-4',
        highlight && 'border-l-4 border-l-accent',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

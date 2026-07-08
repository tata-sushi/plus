import { cn } from '../lib/cn'

export function Section({ title, action, children, className }) {
  return (
    <section className={cn('px-5', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && (
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

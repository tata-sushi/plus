import { resolveIcon } from '../lib/icons.js'
import { cn } from '../lib/cn'

// Helpers e o cartão de um dia do cardápio, compartilhados entre
// /cardapio (semana) e /avaliar (avaliação do dia).
export const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
export const TIPO_INFO = {
  principal: { label: 'Prato principal', icon: 'UtensilsCrossed' },
  guarnicao: { label: 'Acompanhamento', icon: 'Salad' },
  salada: { label: 'Salada', icon: 'Salad' },
  sobremesa: { label: 'Sobremesa', icon: 'IceCreamBowl' },
  bebida: { label: 'Refresco', icon: 'Wine' },
  outro: { label: 'Outro', icon: 'Utensils' },
}
export const pad = (n) => String(n).padStart(2, '0')
export const isoLocal = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
export function mondayISO() {
  const h = new Date()
  const x = new Date(h.getFullYear(), h.getMonth(), h.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return isoLocal(x)
}
export function parseISO(s) {
  const p = String(s).split('-')
  return new Date(+p[0], +p[1] - 1, +p[2])
}
export const fmtDia = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
export function grupos(itens) {
  const ordem = ['principal', 'guarnicao', 'salada', 'sobremesa', 'bebida', 'outro']
  const by = {}
  ;(itens || []).forEach((it) => {
    ;(by[it.tipo] = by[it.tipo] || []).push(it.item)
  })
  return ordem.filter((t) => by[t]).map((t) => ({ ...(TIPO_INFO[t] || TIPO_INFO.outro), valor: by[t].join(', ') }))
}

export function DiaMenu({ dia, hoje }) {
  const gs = grupos(dia.itens)
  const temMenu = !!(dia.resumo || gs.length)
  return (
    <>
      <div className="hstack justify-between">
        <div>
          <div className="font-display text-base font-bold">{DIAS[(parseISO(dia.data).getDay() + 6) % 7]}</div>
          <div className="text-[11px] text-muted">{fmtDia(parseISO(dia.data))}</div>
        </div>
        {hoje && <span className="pill bg-accent-soft text-[10px] text-accent">Hoje</span>}
      </div>
      {!temMenu ? (
        <div className="mt-3 text-sm text-muted">Cardápio a definir.</div>
      ) : (
        <>
          {dia.resumo && <div className="mt-2 text-sm font-semibold">{dia.resumo}</div>}
          {gs.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {gs.map((g, idx) => {
                const Icon = resolveIcon(g.icon)
                return (
                  <div key={g.label} className={cn('hstack gap-3', idx > 0 && 'border-t border-line pt-3')}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-muted">{g.label}</div>
                      <div className="text-sm font-semibold">{g.valor}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}

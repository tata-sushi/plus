import { useEffect, useState } from 'react'
import { CalendarDays, Star } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { resolveIcon } from '../lib/icons.js'
import { cn } from '../lib/cn'
import { supabase } from '../lib/supabase.js'

const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
const TIPO_INFO = {
  principal: { label: 'Prato principal', icon: 'UtensilsCrossed' },
  guarnicao: { label: 'Acompanhamento', icon: 'Salad' },
  salada: { label: 'Salada', icon: 'Salad' },
  sobremesa: { label: 'Sobremesa', icon: 'IceCreamBowl' },
  bebida: { label: 'Bebida', icon: 'Wine' },
  outro: { label: 'Outro', icon: 'Utensils' },
}
const pad = (n) => String(n).padStart(2, '0')
const isoLocal = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
function mondayISO() {
  const h = new Date()
  const x = new Date(h.getFullYear(), h.getMonth(), h.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return isoLocal(x)
}
function parseISO(s) {
  const p = String(s).split('-')
  return new Date(+p[0], +p[1] - 1, +p[2])
}
const fmtDia = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
function grupos(itens) {
  const ordem = ['principal', 'guarnicao', 'salada', 'sobremesa', 'bebida', 'outro']
  const by = {}
  ;(itens || []).forEach((it) => {
    ;(by[it.tipo] = by[it.tipo] || []).push(it.item)
  })
  return ordem.filter((t) => by[t]).map((t) => ({ ...(TIPO_INFO[t] || TIPO_INFO.outro), valor: by[t].join(', ') }))
}

function Estrelas({ nota, onNota, salvando }) {
  return (
    <div className="hstack gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={salvando}
          onClick={() => onNota(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          className="tap"
        >
          <Star size={28} className={cn(n <= nota ? 'fill-accent text-accent' : 'text-muted-2')} />
        </button>
      ))}
    </div>
  )
}

function DiaMenu({ dia, isHoje }) {
  const gs = grupos(dia.itens)
  const temMenu = !!(dia.resumo || gs.length)
  return (
    <>
      <div className="hstack justify-between">
        <div>
          <div className="font-display text-base font-bold">{DIAS[(parseISO(dia.data).getDay() + 6) % 7]}</div>
          <div className="text-[11px] text-muted">{fmtDia(parseISO(dia.data))}</div>
        </div>
        {isHoje && <span className="pill bg-accent-soft text-[10px] text-accent">Hoje</span>}
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

export function Cardapio() {
  const [dias, setDias] = useState(null)
  const [aval, setAval] = useState({}) // data -> nota
  const [coment, setComent] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    supabase.rpc('cardapio_app', { p_inicio: mondayISO() }).then(({ data }) => {
      if (!ativo) return
      const arr = data || []
      setDias(arr)
      const a = {}
      arr.forEach((d) => {
        if (d.minha_nota != null) a[d.data] = d.minha_nota
      })
      setAval(a)
    })
    return () => {
      ativo = false
    }
  }, [])

  if (dias === null)
    return (
      <>
        <Header />
        <Voltar />
      </>
    )

  const hojeISO = isoLocal(new Date())
  const proximos = dias.filter((d) => d.data >= hojeISO)
  const hoje = dias.find((d) => d.data === hojeISO)

  async function salvarAval(n, c) {
    if (!hoje) return
    setSalvando(true)
    await supabase.rpc('avaliar_cardapio', { p_data: hoje.data, p_nota: n, p_comentario: c || null })
    setSalvando(false)
  }
  function avaliar(n) {
    setAval((a) => ({ ...a, [hoje.data]: n }))
    salvarAval(n, coment)
  }
  function salvarComent() {
    if (hoje && aval[hoje.data]) salvarAval(aval[hoje.data], coment)
  }

  return (
    <>
      <Header />
      <Voltar />

      <div className="mt-2 px-5">
        <div className="hstack justify-center gap-2 text-xs font-semibold text-muted">
          <CalendarDays size={15} className="text-accent" />
          Cardápio dos próximos dias
        </div>
      </div>

      <Section className="mt-4">
        <div className="flex flex-col gap-3">
          {proximos.length === 0 && (
            <Card className="reveal">
              <div className="text-sm text-muted">Sem cardápio para os próximos dias.</div>
            </Card>
          )}
          {proximos.map((d) => {
            const isHoje = d.data === hojeISO
            const temMenu = !!(d.resumo || (d.itens && d.itens.length))
            if (!isHoje)
              return (
                <Card key={d.data} className="reveal">
                  <DiaMenu dia={d} isHoje={false} />
                </Card>
              )
            return (
              <div key={d.data} className="hero-card reveal p-4">
                <DiaMenu dia={d} isHoje />
                {temMenu && (
                  <div className="mt-4 border-t border-line pt-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted">Sua avaliação</div>
                    <div className="mt-2 hstack justify-between">
                      <Estrelas nota={aval[d.data] || 0} onNota={avaliar} salvando={salvando} />
                      {aval[d.data] ? <span className="text-xs font-semibold text-accent">Obrigado! ✓</span> : null}
                    </div>
                    <input
                      value={coment}
                      onChange={(e) => setComent(e.target.value)}
                      onBlur={salvarComent}
                      placeholder="Comentário (opcional)"
                      className="mt-3 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-2"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>
    </>
  )
}

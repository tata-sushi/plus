import { Gift } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { currentUser, recompensasCatalogo } from '../lib/mockData.js'
import { useCountUp } from '../lib/useCountUp.js'

export function Recompensas() {
  const saldo = currentUser.pontosCarteira
  const saldoAnimado = useCountUp(saldo)
  return (
    <>
      <Header title="Recompensas" />

      <div className="px-5">
        <div className="hero-card reveal p-4">
          <div className="hstack justify-between">
            <div>
              <div className="text-xs text-muted">Seu saldo</div>
              <div className="font-display text-2xl font-bold text-accent">
                {saldoAnimado.toLocaleString('pt-BR')} pts
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <Gift size={22} />
            </div>
          </div>
        </div>
      </div>

      <Section className="reveal reveal-1 mt-5" title="Catálogo">
        <div className="grid grid-cols-2 gap-3">
          {recompensasCatalogo.map((r) => {
            const podeResgatar = saldo >= r.custo
            return (
              <Card key={r.id} className="!p-3">
                <div className="grid aspect-square place-items-center rounded-2xl bg-accent-soft text-5xl">
                  {r.emoji}
                </div>
                <div className="mt-2 text-sm font-semibold leading-tight">{r.titulo}</div>
                <div className="mt-1 text-xs text-accent">{r.custo.toLocaleString('pt-BR')} pts</div>
                <button
                  disabled={!podeResgatar}
                  className={
                    podeResgatar
                      ? 'btn-primary mt-2 w-full !py-2 text-xs'
                      : 'btn-ghost mt-2 w-full !py-2 text-xs text-muted'
                  }
                >
                  {podeResgatar ? 'Resgatar' : 'Pontos insuficientes'}
                </button>
              </Card>
            )
          })}
        </div>
      </Section>
    </>
  )
}

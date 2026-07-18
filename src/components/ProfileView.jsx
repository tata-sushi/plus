import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Clock } from 'lucide-react'
import { Header } from './Header.jsx'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { Avatar } from './Avatar.jsx'
import { ProgressBar } from './ProgressBar.jsx'
import { MeuPerfil } from './MeuPerfil.jsx'
import { Conquistas } from './Conquistas.jsx'
import { useCountUp } from '../lib/useCountUp.js'
import { supabase } from '../lib/supabase.js'

export function ProfileView({ colaborador, isSelf }) {
  // Resumo real: saldo, resgates e progresso de desafios.
  const [resumo, setResumo] = useState(null)

  useEffect(() => {
    if (!isSelf) return
    let ativo = true
    supabase.rpc('meu_resumo').then(({ data }) => {
      if (ativo) setResumo(data || null)
    })
    return () => {
      ativo = false
    }
  }, [isSelf])

  const feitos = resumo?.desafios_feitos ?? 0
  const total = resumo?.desafios_total ?? 0
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0
  const saldoAnimado = useCountUp(resumo?.saldo ?? 0)

  return (
    <>
      <Header title={isSelf ? 'Minha Jornada' : colaborador.nome} />

      {/* Identificação + progresso real dos desafios (sem níveis) */}
      <div className="px-5">
        <div className="hero-card reveal p-4">
          <div className="hstack gap-3">
            <Avatar name={colaborador.nome} src={colaborador.avatar} size={56} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{colaborador.nome}</div>
              <div className="text-xs text-muted">
                {colaborador.cargo} · {colaborador.loja}
              </div>
            </div>
          </div>
          <div className="mt-4 hstack justify-between text-xs">
            <span className="font-semibold text-muted">Progresso nos desafios</span>
            <span className="font-semibold text-accent">{pct}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={pct / 100} />
          </div>
        </div>
      </div>

      {/* Conquistas — logo abaixo da identificação */}
      {isSelf && <Conquistas />}

      {/* Meu perfil (Signo · DISC · em breve) */}
      {isSelf && <MeuPerfil />}

      {/* Carteira */}
      <Section className="reveal reveal-2 mt-5" title="Carteira de pontos">
        <Card>
          <div className="hstack justify-between">
            <div>
              <div className="text-xs text-muted">Saldo atual</div>
              <div className="font-display text-2xl font-bold text-accent">
                {saldoAnimado.toLocaleString('pt-BR')} pts
              </div>
            </div>
            {isSelf && (
              <Link to="/recompensas" className="btn-primary">
                <Gift size={16} /> Resgatar
              </Link>
            )}
          </div>
        </Card>
      </Section>

      {/* Indicadores — desafios realizados · recompensas resgatadas */}
      <Section className="reveal reveal-2 mt-5" title="Indicadores">
        <div className="grid grid-cols-2 gap-2">
          <Card className="!p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">
              Desafios realizados
            </div>
            <div className="mt-1 font-display text-base font-bold">
              {feitos}/{total}
            </div>
          </Card>
          <Card className="!p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">
              Recompensas resgatadas
            </div>
            <div className="mt-1 font-display text-base font-bold">{resumo?.resgates ?? 0}</div>
          </Card>
        </div>
      </Section>

      {/* Minhas ações — em breve */}
      {isSelf && (
        <Section className="reveal reveal-3 mt-5" title="Minhas ações">
          <Card className="hstack gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted-2">
              <Clock size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Em breve</div>
              <div className="text-xs text-muted">Novas ações chegando por aqui.</div>
            </div>
          </Card>
        </Section>
      )}
    </>
  )
}

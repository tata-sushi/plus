import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { Header } from './Header.jsx'
import { Voltar } from './Voltar.jsx'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { Avatar } from './Avatar.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import { MeuPerfil } from './MeuPerfil.jsx'
import { Conquistas } from './Conquistas.jsx'
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

  return (
    <>
      <Header title={isSelf ? 'Minha Jornada' : colaborador.nome} />
      {isSelf && <Voltar />}

      {/* Card de identificação — mesmo padrão da página Mais */}
      <div className="px-5 pt-2">
        <div className="card p-4">
          <div className="hstack gap-3">
            <Avatar name={colaborador.nome} src={colaborador.avatar} size={52} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{colaborador.nome}</div>
              <div className="text-xs text-muted">
                {colaborador.cargo}
                {colaborador.loja ? ` · ${colaborador.loja}` : ''}
              </div>
              <div className="mt-1 text-xs">
                <span className="text-muted">Carteira · </span>
                <span className="font-semibold text-accent">
                  {resumo == null
                    ? '—'
                    : `${Number(resumo.saldo || 0).toLocaleString('pt-BR')} pts`}
                </span>
              </div>
            </div>
            <ProgressRing value={pct / 100} size={54} stroke={5} />
          </div>
        </div>
      </div>

      {/* Conquistas — logo abaixo da identificação */}
      {isSelf && <Conquistas />}

      {/* Meu perfil (Signo · DISC · em breve) */}
      {isSelf && <MeuPerfil />}

      {/* Indicadores — formato tabela */}
      <Section className="reveal reveal-2 mt-5" title="Indicadores">
        <div className="card overflow-hidden">
          <div className="hstack justify-between px-4 py-3">
            <span className="text-sm text-muted">Desafios realizados</span>
            <span className="text-sm font-bold">
              {feitos}/{total}
            </span>
          </div>
          <div className="hstack justify-between border-t border-line px-4 py-3">
            <span className="text-sm text-muted">Recompensas resgatadas</span>
            <span className="text-sm font-bold">{resumo?.resgates ?? 0}</span>
          </div>
        </div>
      </Section>

      {/* Ações — em breve */}
      {isSelf && (
        <Section className="reveal reveal-3 mt-5" title="Ações">
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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ChevronRight } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { supabase } from '../lib/supabase.js'
import { DISC, ORDEM, dominanteDe } from '../lib/disc.js'

export function PerfilDisc() {
  // undefined = carregando · null = sem perfil · objeto = perfil atual
  const [perfil, setPerfil] = useState(undefined)

  useEffect(() => {
    let ativo = true
    supabase.rpc('meu_perfil').then(({ data }) => {
      if (!ativo) return
      setPerfil((data || []).find((p) => p.instrumento === 'disc') || null)
    })
    return () => {
      ativo = false
    }
  }, [])

  if (perfil === undefined) return null

  // Ainda não respondeu: convite pra fazer o teste.
  if (!perfil) {
    return (
      <Section className="reveal reveal-3 mt-5" title="Meu perfil">
        <Link to="/treinamentos" className="card hstack gap-3 p-4 tap">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Sparkles size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Descubra seu perfil (DISC)</div>
            <div className="text-xs text-muted">Responda o questionário no módulo Soft Skill.</div>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </Link>
      </Section>
    )
  }

  const pont = perfil.pontuacoes || {}
  const total = ORDEM.reduce((s, k) => s + (Number(pont[k]) || 0), 0) || 1
  const dominante = dominanteDe(pont)
  const d = DISC[dominante]
  // rótulo salvo: 'D', 'DI' (combinado) ou 'Equilibrado'
  const rotulo = perfil.perfil
  const combinado = rotulo && rotulo.length === 2 && DISC[rotulo[1]]
  const equilibrado = rotulo === 'Equilibrado'

  return (
    <Section className="reveal reveal-3 mt-5" title="Meu perfil">
      <Card>
        <div className="hstack gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold text-white"
            style={{ background: d.cor }}
          >
            {dominante}
          </span>
          <div className="min-w-0">
            <div className="text-xs text-muted">Seu perfil é</div>
            <div className="font-display text-base font-bold">
              {equilibrado
                ? 'Equilibrado'
                : combinado
                  ? `${DISC[rotulo[0]].nome} + ${DISC[rotulo[1]].nome}`
                  : d.nome}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {equilibrado ? 'Suas quatro tendências aparecem de forma bem próxima.' : d.desc}
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {ORDEM.map((k) => {
            const pct = Math.round(((Number(pont[k]) || 0) / total) * 100)
            return (
              <div key={k} className="hstack gap-2">
                <span className="w-4 text-[11px] font-bold" style={{ color: DISC[k].cor }}>
                  {k}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: DISC[k].cor }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] font-semibold text-muted">{pct}%</span>
              </div>
            )
          })}
        </div>
      </Card>
    </Section>
  )
}

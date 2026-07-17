import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Lock } from 'lucide-react'
import { Section } from './Section.jsx'
import { supabase } from '../lib/supabase.js'
import { DISC, dominanteDe } from '../lib/disc.js'
import { cn } from '../lib/cn'

// Instrumentos exibidos em "Meu perfil". disponivel=false → aparece como "Em
// breve" (o teste ainda não está nos desafios). Quando o teste entrar, basta
// marcar disponivel=true e adicionar o resumo correspondente em resumoDe().
const INSTRUMENTOS = [
  { chave: 'disc', nome: 'DISC', disponivel: true },
  { chave: 'mbti', nome: 'MBTI', disponivel: false },
  { chave: 'bigfive', nome: 'Big Five', disponivel: false },
]

// Resumo compacto para o quadradinho: { sigla, cor, rotulo }.
function resumoDe(chave, p) {
  if (chave === 'disc') {
    const dom = dominanteDe(p.pontuacoes || {})
    const r = p.perfil
    const sigla = r === 'Equilibrado' ? '≈' : r?.length === 2 ? r : dom
    const rotulo = r === 'Equilibrado' ? 'Equilibrado' : DISC[dom]?.nome
    return { sigla, cor: DISC[dom]?.cor, rotulo }
  }
  return { sigla: '•', cor: '#64748b', rotulo: 'Concluído' }
}

export function MeuPerfil() {
  const navigate = useNavigate()
  const [perfis, setPerfis] = useState(undefined) // undefined = carregando

  useEffect(() => {
    let ativo = true
    supabase.rpc('meu_perfil').then(({ data }) => {
      if (!ativo) return
      const map = {}
      ;(data || []).forEach((p) => {
        map[p.instrumento] = p
      })
      setPerfis(map)
    })
    return () => {
      ativo = false
    }
  }, [])

  if (perfis === undefined) return null

  return (
    <Section className="reveal reveal-3 mt-5" title="Meu perfil">
      <div className="grid grid-cols-3 gap-2">
        {INSTRUMENTOS.map((inst) => {
          const p = perfis[inst.chave]
          const feito = !!p
          const r = feito ? resumoDe(inst.chave, p) : null

          return (
            <button
              key={inst.chave}
              onClick={() => {
                if (!inst.disponivel) return
                navigate(feito ? '/perfil-disc' : '/treinamentos')
              }}
              disabled={!inst.disponivel}
              className={cn(
                'card flex flex-col items-center gap-1.5 px-2 py-3.5 text-center tap',
                !inst.disponivel && 'opacity-60',
              )}
            >
              {feito ? (
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl font-display text-sm font-bold text-white"
                  style={{ background: r.cor }}
                >
                  {r.sigla}
                </span>
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted">
                  {inst.disponivel ? (
                    <Sparkles size={16} className="text-accent" />
                  ) : (
                    <Lock size={14} />
                  )}
                </span>
              )}
              <span className="text-xs font-semibold leading-none">{inst.nome}</span>
              <span className="text-[10px] leading-tight text-muted">
                {feito ? r.rotulo : inst.disponivel ? 'Fazer teste' : 'Em breve'}
              </span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

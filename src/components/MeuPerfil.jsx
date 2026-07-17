import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Lock } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { supabase } from '../lib/supabase.js'
import { DISC, dominanteDe } from '../lib/disc.js'
import { signoDe } from '../lib/signo.js'
import { cn } from '../lib/cn'

// Seletor de variação "texto" (U+FE0E): símbolo do signo monocromático (cítrico).
const VS_TEXTO = String.fromCharCode(0xfe0e)

// Instrumentos de perfil. disponivel=false → "Em breve" (teste ainda não está
// nos desafios). Ligar depois é só marcar true e tratar o resumo em resumoDe().
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
  const [signo, setSigno] = useState(null)
  const [signoAberto, setSignoAberto] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([supabase.rpc('meu_perfil'), supabase.rpc('minha_jornada_extra')]).then(
      ([pr, er]) => {
        if (!ativo) return
        const map = {}
        ;(pr.data || []).forEach((p) => {
          map[p.instrumento] = p
        })
        setPerfis(map)
        setSigno(signoDe(er.data?.data_nascimento))
      },
    )
    return () => {
      ativo = false
    }
  }, [])

  if (perfis === undefined) return null

  return (
    <Section className="reveal reveal-3 mt-5" title="Meu perfil">
      <div className="grid grid-cols-4 gap-2">
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
                'card flex flex-col items-center gap-1.5 px-1.5 py-3.5 text-center tap',
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

        {/* Signo — na mesma linha das análises de perfil; abre a leitura ao tocar */}
        <button
          onClick={() => signo && setSignoAberto((v) => !v)}
          disabled={!signo}
          className={cn(
            'card flex flex-col items-center gap-1.5 px-1.5 py-3.5 text-center tap',
            signoAberto && 'ring-1 ring-accent',
          )}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-lg leading-none text-accent">
            {signo ? signo.emoji + VS_TEXTO : '—'}
          </span>
          <span className="text-xs font-semibold leading-none">Signo</span>
          <span className="text-[10px] leading-tight text-muted">{signo ? signo.nome : '—'}</span>
        </button>
      </div>

      {signoAberto && signo && (
        <Card className="mt-2">
          <div className="hstack gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl leading-none text-accent">
              {signo.emoji + VS_TEXTO}
            </span>
            <div className="min-w-0">
              <div className="font-display text-base font-bold">{signo.nome}</div>
              <div className="text-xs text-muted">Elemento {signo.elemento}</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">{signo.review}</p>
        </Card>
      )}
    </Section>
  )
}

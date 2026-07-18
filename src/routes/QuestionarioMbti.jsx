import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Desafio "A Missão dos Desbravadores" (16 personalidades). O cálculo do tipo
// entra quando o mapa das afirmações estiver completo (responder_perfil_mbti).
// const MBTI_TREINO_ID = '2c170b08-6368-47ab-92c0-04c58a9fb45e'
const FUNDO = 'https://aoqsbusfrffapjglpqjk.supabase.co/storage/v1/object/public/desafios/d7.png'

const ESCALA = [
  { v: 1, t: 'Discordo totalmente' },
  { v: 2, t: 'Discordo' },
  { v: 3, t: 'Nem concordo, nem discordo' },
  { v: 4, t: 'Concordo' },
  { v: 5, t: 'Concordo totalmente' },
]

// Moldura com o fundo d7 + um véu para o texto ficar legível (componente estável).
function Fundo({ children }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${FUNDO})` }} />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}

export function QuestionarioMbti() {
  const navigate = useNavigate()
  const [perguntas, setPerguntas] = useState(null) // null = carregando
  const [idx, setIdx] = useState(0)
  const [respostas, setRespostas] = useState({})
  const [feito, setFeito] = useState(false)

  useEffect(() => {
    supabase.rpc('perfil_questionario', { p_instrumento: 'mbti' }).then(({ data }) => {
      setPerguntas(data || [])
    })
  }, [])

  if (perguntas === null) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-black">
        <Loader2 size={24} className="animate-spin text-white/60" />
      </div>
    )
  }

  if (feito) {
    return (
      <Fundo>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-accent text-black">
            <Check size={30} />
          </span>
          <div className="mt-4 font-display text-xl font-bold">Respostas registradas!</div>
          <p className="mt-2 max-w-sm text-sm text-white/80">
            Seu tipo (as 16 personalidades) vai aparecer aqui assim que finalizarmos o mapa das
            afirmações.
          </p>
          <button onClick={() => navigate(-1)} className="btn-primary mt-6 !px-6 !py-3 text-sm">
            Concluir
          </button>
        </div>
      </Fundo>
    )
  }

  const total = perguntas.length
  const q = perguntas[idx]
  const escolhida = respostas[q.ordem]
  const ultima = idx + 1 >= total

  function escolher(v) {
    tapHaptic()
    setRespostas((r) => ({ ...r, [q.ordem]: v }))
  }

  return (
    <Fundo>
      {/* topo: sair + progresso */}
      <div className="px-5 pt-3">
        <div className="hstack justify-between">
          <button
            onClick={() => (idx > 0 ? setIdx((i) => i - 1) : navigate(-1))}
            className="hstack gap-1 text-sm text-white/80 tap"
          >
            <ArrowLeft size={16} /> {idx > 0 ? 'Anterior' : 'Sair'}
          </button>
          <span className="text-xs font-semibold text-white/70">
            {idx + 1} de {total}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* afirmação + escala, centralizado */}
      <div className="flex flex-1 flex-col justify-center px-5 pb-8">
        <h2 className="text-center font-display text-lg font-bold leading-snug text-white drop-shadow">
          {q.enunciado}
        </h2>
        <div className="mt-6 flex flex-col gap-2">
          {ESCALA.map((o) => (
            <button
              key={o.v}
              onClick={() => escolher(o.v)}
              className={
                'rounded-card border px-4 py-3.5 text-center text-sm tap backdrop-blur transition-colors ' +
                (escolhida === o.v
                  ? 'border-accent bg-accent font-semibold text-black'
                  : 'border-white/25 bg-black/35 text-white')
              }
            >
              {o.t}
            </button>
          ))}
        </div>

        <button
          onClick={() => (ultima ? setFeito(true) : setIdx((i) => i + 1))}
          disabled={!escolhida}
          className="btn-primary mt-6 w-full !py-3.5 text-sm disabled:pointer-events-none disabled:opacity-40"
        >
          {ultima ? 'Ver meu resultado' : 'Próxima'}
        </button>
        <p className="mt-3 text-center text-[11px] text-white/60">
          Escolha o quanto você concorda. Não há resposta certa ou errada.
        </p>
      </div>
    </Fundo>
  )
}

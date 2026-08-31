import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Flame, Grid3x3, Route, Type, Layers } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'

// Hub dos jogos diários. Cada card leva ao jogo e mostra a ofensiva atual.
// beta: true → em testes, aparece só para o dono (mat 7) até ir pra produção.
const JOGOS = [
  { to: '/jogo', jogo: 'tatatango', nome: 'Tatá Tango', desc: 'Lógica diária com 🍙 e 🍣', icon: Grid3x3 },
  { to: '/rota-sushi', jogo: 'rotasushi', nome: 'Rota do Sushi', desc: 'Trace a rota da entrega', icon: Route },
  { to: '/termo', jogo: 'termo', nome: 'Termo Tatá', desc: 'Descubra a palavra do dia', icon: Type },
  { to: '/memoria', jogo: 'memoria', nome: 'Memória Tatá', desc: 'Ache os pares do dia', icon: Layers, beta: true },
]

export function Passatempos() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [estados, setEstados] = useState({})
  // jogos em beta só aparecem para o dono (mat 7) enquanto não vão pra produção
  const jogos = JOGOS.filter((j) => !j.beta || String(usuario?.matricula) === '7')

  useEffect(() => {
    let ativo = true
    jogos.forEach((j) =>
      supabase.rpc('jogo_estado', { p_jogo: j.jogo }).then(({ data }) => {
        if (ativo) setEstados((e) => ({ ...e, [j.jogo]: data }))
      }),
    )
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.matricula])

  return (
    <div className="min-h-[100dvh] bg-bg">
      <Header />
      <div className="px-5 pt-2">
        <button
          onClick={() => {
            tapHaptic()
            navigate(-1)
          }}
          className="hstack gap-1 text-sm font-medium text-muted tap"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      <div className="mx-auto w-full max-w-[420px] px-5 pt-4">
        <div className="mb-5 text-center">
          <div className="font-display text-[19px] font-bold leading-tight">Passatempos</div>
          <div className="mt-1 text-xs text-muted">Um desafio novo por dia · mantenha a ofensiva 🔥</div>
        </div>

        <div className="flex flex-col gap-3">
          {jogos.map((j) => {
            const est = estados[j.jogo]
            const Icon = j.icon
            return (
              <Link key={j.to} to={j.to} className="card hstack items-center gap-3 p-4 tap">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-bold">{j.nome}</div>
                  <div className="truncate text-xs text-muted">{j.desc}</div>
                </div>
                <div className="shrink-0 text-right">
                  {est?.jogou_hoje ? (
                    <span className="text-[11px] font-semibold text-accent">✓ hoje</span>
                  ) : (
                    <span className="text-[11px] text-muted-2">jogar</span>
                  )}
                  <div className="mt-0.5 hstack justify-end gap-1 text-[11px] text-muted">
                    <Flame size={12} className="text-accent" /> {est?.streak ?? 0}
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-carbon" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

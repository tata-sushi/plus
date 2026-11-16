import { useEffect, useState } from 'react'
import { PartyPopper, Check } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { cn } from '../lib/cn'

// Pergunta de presença na confraternização de fim de ano (Sim/Não).
// Em teste: renderizado só pra matrícula 7 (gating feito na Home). Grava a
// resposta por colaborador via confra_responder() e lê via confra_minha_resposta().
export function ConfraCard() {
  const [vai, setVai] = useState(undefined) // undefined=carregando · null=sem resposta · true/false
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    supabase.rpc('confra_minha_resposta').then(({ data }) => {
      if (ativo) setVai(data === null || data === undefined ? null : data)
    })
    return () => {
      ativo = false
    }
  }, [])

  async function responder(v) {
    if (salvando || vai === v) return
    tapHaptic()
    const anterior = vai
    setVai(v)
    setSalvando(true)
    const { error } = await supabase.rpc('confra_responder', { p_vai: v })
    setSalvando(false)
    if (error) setVai(anterior)
  }

  if (vai === undefined) return null // carregando: não pisca

  const respondido = vai === true || vai === false

  return (
    <section className="reveal reveal-1 mt-4 hsm:mt-3 px-5">
      <div className="card p-4">
        <div className="hstack gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <PartyPopper size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-bold">Confraternização de fim de ano</div>
            <div className="mt-0.5 text-[12px] text-muted">
              {respondido ? (
                <>
                  {vai ? 'Presença confirmada! ' : 'Você marcou que não vai. '}
                  <span className="text-muted-2">Toque pra mudar.</span>
                </>
              ) : (
                'Você vai participar?'
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 hstack gap-2">
          <button
            type="button"
            onClick={() => responder(true)}
            aria-pressed={vai === true}
            className={cn(
              'flex-1 rounded-pill py-2.5 text-sm font-bold tap',
              vai === true ? 'bg-accent text-black' : 'bg-surface-2 text-text',
            )}
          >
            {vai === true && <Check size={15} className="mr-1 inline" />}Sim, eu vou
          </button>
          <button
            type="button"
            onClick={() => responder(false)}
            aria-pressed={vai === false}
            className={cn(
              'flex-1 rounded-pill py-2.5 text-sm font-bold tap',
              vai === false ? 'bg-surface-3 text-text ring-2 ring-muted-2' : 'bg-surface-2 text-text',
            )}
          >
            Não vou
          </button>
        </div>
      </div>
    </section>
  )
}

export default ConfraCard

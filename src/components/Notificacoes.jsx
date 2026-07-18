import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, X, CheckCircle2, XCircle, Info, Loader2, BellOff } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// tempo relativo curtinho: agora, há 5 min, há 3 h, ontem, dd/mm
function tempoRel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  if (diff < 172800) return 'ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function visual(n) {
  if (n.categoria === 'envio') {
    const negado = /não aprovado/i.test(n.titulo || '')
    return negado
      ? { Icon: XCircle, cls: 'bg-danger/10 text-danger' }
      : { Icon: CheckCircle2, cls: 'bg-accent-soft text-accent' }
  }
  return { Icon: Info, cls: 'bg-surface-2 text-carbon' }
}

export function Notificacoes() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [naoLidas, setNaoLidas] = useState(0)
  const [itens, setItens] = useState(null)

  const contar = useCallback(() => {
    supabase.rpc('contar_notificacoes').then(({ data }) => setNaoLidas(Number(data) || 0))
  }, [])

  useEffect(() => {
    contar()
    const aoFocar = () => contar()
    window.addEventListener('focus', aoFocar)
    return () => window.removeEventListener('focus', aoFocar)
  }, [contar])

  async function abrir() {
    tapHaptic()
    setAberto(true)
    setItens(null)
    const { data } = await supabase.rpc('minhas_notificacoes')
    const lista = data || []
    setItens(lista)
    if (lista.some((n) => !n.lida)) {
      await supabase.rpc('marcar_notificacoes_lidas', { p_ids: null })
    }
    setNaoLidas(0)
  }

  function fechar() {
    setAberto(false)
    contar()
  }

  function irPara(n) {
    fechar()
    if (n.referencia_tipo === 'treinamento') navigate('/treinamentos')
  }

  return (
    <>
      <button
        onClick={abrir}
        className="relative grid h-9 w-9 place-items-center rounded-full text-text tap"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-bg">
            <div className="safe-top hstack justify-between border-b border-line px-5 py-3">
              <span className="font-display text-lg font-bold">Notificações</span>
              <button
                onClick={fechar}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-carbon tap"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {itens === null ? (
                <div className="hstack justify-center py-16 text-muted-2">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : itens.length === 0 ? (
                <div className="grid place-items-center px-8 py-20 text-center text-muted">
                  <BellOff size={30} className="text-muted-2" />
                  <p className="mt-3 text-sm">Nenhuma notificação por aqui ainda.</p>
                </div>
              ) : (
                itens.map((n) => {
                  const v = visual(n)
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'border-b border-line px-5 py-4',
                        !n.lida && 'bg-accent-soft/25',
                      )}
                    >
                      <div className="hstack items-start gap-3">
                        <span
                          className={cn(
                            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full',
                            v.cls,
                          )}
                        >
                          <v.Icon size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="hstack items-start justify-between gap-2">
                            <span className="text-sm font-semibold leading-snug">{n.titulo}</span>
                            <span className="shrink-0 text-[11px] text-muted-2">
                              {tempoRel(n.criado_em)}
                            </span>
                          </div>
                          {n.texto && <p className="mt-1 text-sm leading-snug text-muted">{n.texto}</p>}
                          {n.referencia_tipo === 'treinamento' && (
                            <button
                              onClick={() => irPara(n)}
                              className="mt-2 text-xs font-semibold text-accent tap"
                            >
                              Ver desafio →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Check } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { resolveIcon } from '../lib/icons.js'
import { tapHaptic } from '../lib/haptics.js'
import { governancaCatalogo, MAX_PAGINAS_FIXADAS } from '../lib/mockData.js'
import { ATALHOS_KEY, loadPinned } from '../components/AtalhosGovernanca.jsx'
import { cn } from '../lib/cn'

// Gerenciar atalhos da Governança — acessível pelo Mais (só quem tem governança).
// Fixa/desafixa até MAX_PAGINAS_FIXADAS páginas do portal; a seleção fica salva
// neste aparelho (localStorage) e aparece na seção "Atalhos" da Início.
export function GerenciarAtalhos() {
  const navigate = useNavigate()
  const [pinned, setPinned] = useState(loadPinned)

  useEffect(() => {
    try {
      localStorage.setItem(ATALHOS_KEY, JSON.stringify(pinned))
    } catch {
      /* ignore */
    }
  }, [pinned])

  const atingiuLimite = pinned.length >= MAX_PAGINAS_FIXADAS

  function toggle(id) {
    tapHaptic()
    setPinned((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= MAX_PAGINAS_FIXADAS) return prev
      return [...prev, id]
    })
  }

  return (
    <>
      <Header />

      <div className="hstack gap-2 px-5 pt-1 text-sm">
        <button onClick={() => navigate('/mais')} className="hstack gap-1 text-muted tap">
          <ArrowLeft size={16} /> Mais
        </button>
      </div>

      <Section className="mt-3">
        <p className="mb-3 text-sm text-muted">
          Fixe até {MAX_PAGINAS_FIXADAS} páginas do portal de governança para acesso rápido.
        </p>
        <div className="card overflow-hidden">
          <div className="border-b border-line px-4 py-2.5 text-[11px] font-semibold text-muted-2">
            Suas páginas · {pinned.length}/{MAX_PAGINAS_FIXADAS}
          </div>
          {governancaCatalogo.map((item, idx) => {
            const Icon = resolveIcon(item.icon)
            const ativo = pinned.includes(item.id)
            const bloqueado = !ativo && atingiuLimite
            return (
              <button
                key={item.id}
                onClick={() => !bloqueado && toggle(item.id)}
                disabled={bloqueado}
                className={cn(
                  'hstack w-full gap-3 px-4 py-3 text-left tap',
                  idx > 0 && 'border-t border-line',
                  bloqueado && 'opacity-40',
                )}
              >
                <Icon size={16} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                    ativo ? 'border-accent bg-accent text-black' : 'border-line text-muted',
                  )}
                >
                  {ativo ? <Check size={12} /> : <Plus size={12} />}
                </span>
              </button>
            )
          })}
        </div>
      </Section>
    </>
  )
}

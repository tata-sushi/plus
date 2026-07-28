import { useEffect, useState } from 'react'
import { Plus, Check, ShieldCheck } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { resolveIcon } from '../lib/icons.js'
import { tapHaptic } from '../lib/haptics.js'
import { governancaCatalogo, MAX_PAGINAS_FIXADAS } from '../lib/mockData.js'
import { ATALHOS_KEY, loadPinned } from '../components/AtalhosGovernanca.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { cn } from '../lib/cn'

// Gerenciar atalhos da Governança — acessível pelo Mais (só quem tem governança).
// Fixa/desafixa até MAX_PAGINAS_FIXADAS páginas do portal; a seleção fica salva
// neste aparelho (localStorage) e aparece na seção "Atalhos" da Início.
// Duas listas na MESMA tela: "Geral" (todo líder) e "Administradores" (páginas
// marcadas admin no catálogo, só aparecem pra quem tem perfil admin).
export function GerenciarAtalhos() {
  const { usuario } = useAuth()
  const isAdmin = (usuario?.perfil || '').toLowerCase() === 'admin'
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

  const gerais = governancaCatalogo.filter((c) => !c.admin)
  const doAdmin = governancaCatalogo.filter((c) => c.admin)

  const renderLista = (itens) => (
    <div className="card overflow-hidden">
      {itens.map((item, idx) => {
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
  )

  return (
    <>
      <Header />
      <Voltar />

      <Section className="mt-3">
        <p className="mb-3 text-center text-sm text-muted">
          Fixe até {MAX_PAGINAS_FIXADAS} páginas do portal de governança para acesso rápido.
        </p>

        {/* Lista geral — todo mundo */}
        <div className="mb-1.5 hstack items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
            Geral
          </span>
          <span className="text-[11px] font-semibold text-muted-2">
            {pinned.length}/{MAX_PAGINAS_FIXADAS} fixadas
          </span>
        </div>
        {renderLista(gerais)}

        {/* Lista de administradores — só aparece pra quem é admin */}
        {isAdmin && doAdmin.length > 0 && (
          <>
            <div className="mb-1.5 mt-5 hstack items-center gap-1.5 px-1">
              <ShieldCheck size={13} className="shrink-0 text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Administradores
              </span>
            </div>
            {renderLista(doAdmin)}
          </>
        )}
      </Section>
    </>
  )
}

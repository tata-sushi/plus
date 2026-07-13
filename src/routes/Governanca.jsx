import { useEffect, useState } from 'react'
import { Landmark, Plus, Check, Settings2, Pin } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { IconTile } from '../components/IconTile.jsx'
import { resolveIcon } from '../lib/icons.js'
import { tapHaptic } from '../lib/haptics.js'
import {
  governancaPortal,
  governancaCatalogo,
  MAX_PAGINAS_FIXADAS,
} from '../lib/mockData.js'

const STORAGE_KEY = 'tata_gov_pinned'

function loadPinned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function Governanca() {
  const [pinned, setPinned] = useState(loadPinned)
  const [managing, setManaging] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned))
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

  const paginasFixadas = pinned
    .map((id) => governancaCatalogo.find((c) => c.id === id))
    .filter(Boolean)

  return (
    <>
      <Header title="Governança de Processos" />

      {/* Entrada no portal */}
      <div className="px-5 pt-1">
        <div className="card p-4">
          <div className="hstack gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Landmark size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-bold leading-tight">
                {governancaPortal.titulo}
              </div>
              <div className="mt-0.5 text-xs text-muted">{governancaPortal.descricao}</div>
            </div>
          </div>
          <button className="btn-primary mt-4 w-full">Entrar no portal</button>
        </div>
      </div>

      {/* Acesso rápido personalizável */}
      <Section
        className="mt-6"
        title="Acesso rápido"
        action={
          <button
            onClick={() => {
              tapHaptic()
              setManaging((m) => !m)
            }}
            className="hstack gap-1 text-xs font-semibold text-accent tap"
          >
            <Settings2 size={14} /> {managing ? 'Concluir' : 'Gerenciar'}
          </button>
        }
      >
        {paginasFixadas.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {paginasFixadas.map((p) => (
              <IconTile key={p.id} icon={p.icon} label={p.label} onClick={tapHaptic} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-white/10 bg-surface/60 p-6 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent">
              <Pin size={20} />
            </div>
            <p className="text-sm text-muted">
              Fixe até {MAX_PAGINAS_FIXADAS} páginas para acesso rápido.
            </p>
            <button
              onClick={() => {
                tapHaptic()
                setManaging(true)
              }}
              className="btn-ghost mt-1 !py-2 text-xs"
            >
              <Plus size={14} /> Adicionar páginas
            </button>
          </div>
        )}
      </Section>

      {/* Painel de gerenciamento */}
      {managing && (
        <Section
          className="mt-5"
          title={`Escolha suas páginas · ${pinned.length}/${MAX_PAGINAS_FIXADAS}`}
        >
          <div className="card overflow-hidden">
            {governancaCatalogo.map((item, idx) => {
              const Icon = resolveIcon(item.icon)
              const ativo = pinned.includes(item.id)
              const bloqueado = !ativo && atingiuLimite
              return (
                <button
                  key={item.id}
                  onClick={() => !bloqueado && toggle(item.id)}
                  disabled={bloqueado}
                  className={`hstack w-full gap-3 px-4 py-3 text-left tap ${
                    idx > 0 ? 'border-t border-white/5' : ''
                  } ${bloqueado ? 'opacity-40' : ''}`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                      ativo
                        ? 'border-accent bg-accent text-black'
                        : 'border-white/20 text-transparent'
                    }`}
                  >
                    {ativo ? <Check size={14} /> : <Plus size={14} className="text-muted" />}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted">
            Lista de exemplo — as páginas oficiais serão liberadas em breve. Sua seleção fica salva
            neste aparelho por enquanto.
          </p>
        </Section>
      )}
    </>
  )
}

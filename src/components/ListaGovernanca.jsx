import { useEffect, useMemo, useState } from 'react'
import { Loader2, ChevronRight, FolderOpen } from 'lucide-react'
import { Section } from './Section.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

const LIDERES_ORIGIN = 'https://lideres.tatasushi.tech'
const ESCALAS_ORIGIN = 'https://escalas.tatasushi.tech'

// Prefixa a url relativa do catálogo com o domínio certo.
export function urlGovAbsoluta(u) {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return (u.startsWith('/escalas') ? ESCALAS_ORIGIN : LIDERES_ORIGIN) + u
}

// Lista das páginas de Governança que o usuário pode ver (ao vivo, gov_meus_acessos),
// agrupada por seção. `onAbrir(pagina)` decide como abrir (rota no mobile, canvas no desktop).
export function ListaGovernanca({ onAbrir }) {
  const [paginas, setPaginas] = useState(null)

  useEffect(() => {
    let ativo = true
    supabase.rpc('gov_meus_acessos').then(({ data }) => {
      if (ativo) setPaginas(data || [])
    })
    return () => {
      ativo = false
    }
  }, [])

  const grupos = useMemo(() => {
    const g = []
    const idx = {}
    for (const p of paginas || []) {
      const chave = `${p.secao}›${p.sub || ''}`
      if (!(chave in idx)) {
        idx[chave] = g.length
        g.push({ secao: p.secao, sub: p.sub || '', itens: [] })
      }
      g[idx[chave]].itens.push(p)
    }
    return g
  }, [paginas])

  if (paginas === null) {
    return (
      <div className="hstack justify-center py-16 text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }
  if (paginas.length === 0) {
    return (
      <div className="px-5 pt-6">
        <div className="card p-8 text-center text-sm text-muted">
          Você ainda não tem páginas liberadas na governança.
        </div>
      </div>
    )
  }

  return (
    <>
      {grupos.map((gr) => (
        <Section
          key={`${gr.secao}-${gr.sub}`}
          className="mt-4"
          title={gr.secao + (gr.sub ? ` · ${gr.sub}` : '')}
        >
          <div className="flex flex-col gap-2">
            {gr.itens.map((p) => (
              <button
                key={p.pagina_id}
                onClick={() => {
                  tapHaptic()
                  onAbrir(p)
                }}
                className="tap text-left"
              >
                <div className="card hstack gap-3 !py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <FolderOpen size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.label}</span>
                  <ChevronRight size={16} className="shrink-0 text-muted-2" />
                </div>
              </button>
            ))}
          </div>
        </Section>
      ))}
    </>
  )
}

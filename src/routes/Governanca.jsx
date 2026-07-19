import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ChevronRight, FolderOpen } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// Governança de Processos (modelo novo): lista nativa das páginas que o usuário
// pode ver (ao vivo, gov_meus_acessos). Cada uma abre no visualizador in-app
// (/painel/:id), que passa o token da sessão pra página checar o acesso na hora.
export function Governanca() {
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

  return (
    <>
      <Header title="Governança de Processos" />

      {paginas === null ? (
        <div className="hstack justify-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : paginas.length === 0 ? (
        <div className="px-5 pt-6">
          <div className="card p-8 text-center text-sm text-muted">
            Você ainda não tem páginas liberadas na governança.
          </div>
        </div>
      ) : (
        grupos.map((gr) => (
          <Section
            key={`${gr.secao}-${gr.sub}`}
            className="mt-4"
            title={gr.secao + (gr.sub ? ` · ${gr.sub}` : '')}
          >
            <div className="flex flex-col gap-2">
              {gr.itens.map((p) => (
                <Link key={p.pagina_id} to={`/painel/${p.pagina_id}`} onClick={tapHaptic} className="tap">
                  <div className="card hstack gap-3 !py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                      <FolderOpen size={16} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.label}</span>
                    <ChevronRight size={16} className="shrink-0 text-muted-2" />
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        ))
      )}
    </>
  )
}

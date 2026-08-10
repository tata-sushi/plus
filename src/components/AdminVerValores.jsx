import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Coins } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { Avatar } from './Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// Seletor de quem pode ver os VALORES (financeiros) da governança. Um cheque
// único por pessoa: ligado = vê tudo (grava a liberação 'geral'); desligado =
// não vê nada (remove qualquer liberação). A máscara de verdade é no servidor
// (a RPC de leitura devolve null); aqui é só o cadastro de quem pode.
export function AdminVerValores() {
  const [pessoas, setPessoas] = useState(null)
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(null) // matrícula em gravação
  const [erro, setErro] = useState('')

  function carregar() {
    supabase.rpc('perm_valores_listar').then(({ data }) => setPessoas(data || []))
  }
  useEffect(carregar, [])

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return pessoas || []
    return (pessoas || []).filter((p) =>
      [p.nome, p.cargo, p.unidade, p.matricula].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(t),
      ),
    )
  }, [pessoas, busca])

  const comAcesso = (pessoas || []).filter((p) => p.tem_geral).length

  async function alternar(pessoa) {
    if (salvando) return
    const novo = !pessoa.tem_geral
    setErro('')
    setSalvando(pessoa.matricula)
    tapHaptic()
    // otimista: reflete na hora e reverte se a RPC falhar. Desligar também zera
    // qtd_areas (a RPC apaga todas as liberações da pessoa).
    setPessoas((prev) =>
      prev.map((p) =>
        p.matricula === pessoa.matricula
          ? { ...p, tem_geral: novo, qtd_areas: novo ? Math.max(1, p.qtd_areas || 0) : 0 }
          : p,
      ),
    )
    const { error } = await supabase.rpc('perm_valores_set_geral', {
      p_matricula: pessoa.matricula,
      p_liberado: novo,
    })
    setSalvando(null)
    if (error) {
      setPessoas((prev) =>
        prev.map((p) => (p.matricula === pessoa.matricula ? { ...p, tem_geral: !novo } : p)),
      )
      setErro('Não foi possível salvar. Tente de novo.')
    }
  }

  if (pessoas === null) {
    return (
      <div className="hstack justify-center py-16 text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="px-5 pt-4">
        <Card className="hstack gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Coins size={20} />
          </span>
          <div className="text-xs leading-relaxed text-muted">
            Quem estiver <b className="text-text">ligado</b> vê os{' '}
            <b className="text-text">valores financeiros</b> da governança. Desligado, a pessoa
            acessa as páginas, mas os valores nem chegam no aparelho dela.
          </div>
        </Card>

        <Card className="mt-3 !p-3">
          <div className="hstack gap-2 rounded-card bg-surface-2 px-3 py-2">
            <Search size={16} className="shrink-0 text-muted-2" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cargo, loja…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            />
          </div>
        </Card>
        <p className="mt-2 px-1 text-xs text-muted">{comAcesso} com acesso aos valores</p>
        {erro && <p className="mt-1 px-1 text-xs font-medium text-danger">{erro}</p>}
      </div>

      <Section className="mt-2" title={`Colaboradores (${filtradas.length})`}>
        <div className="flex flex-col gap-2">
          {filtradas.map((p) => {
            const on = !!p.tem_geral
            const busy = salvando === p.matricula
            return (
              <Card key={p.matricula} className="hstack gap-3 !py-3">
                <Avatar name={p.nome} src={p.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.nome}</div>
                  <div className="truncate text-xs text-muted">
                    {p.cargo}
                    {p.unidade ? ` · ${p.unidade}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => alternar(p)}
                  disabled={busy}
                  className={cn(
                    'relative h-6 w-10 shrink-0 rounded-full transition-colors tap',
                    on ? 'bg-accent' : 'bg-surface-2',
                    busy && 'opacity-60',
                  )}
                  aria-label={
                    on ? `Ocultar valores para ${p.nome}` : `Liberar valores para ${p.nome}`
                  }
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                      on ? 'left-[18px]' : 'left-0.5',
                    )}
                  />
                </button>
              </Card>
            )
          })}
          {filtradas.length === 0 && (
            <div className="card p-8 text-center text-sm text-muted">
              Ninguém encontrado com “{busca}”.
            </div>
          )}
        </div>
      </Section>
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Search, Coins, X, ChevronRight, ShieldCheck } from 'lucide-react'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { Avatar } from './Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// Áreas de valores que o cadastro (dp_rh.perm_ver_valores) reconhece. 'geral' é
// o acesso total (o pode_ver_valores libera qualquer área quando tem 'geral').
// As demais são liberações pontuais, por página/recurso. Se o outro agente criar
// uma área nova, ela ainda aparece no editor como "extra" (nada fica escondido).
const AREAS = [
  {
    key: 'geral',
    label: 'Todos os valores',
    desc: 'Acesso total — enxerga os valores de todas as áreas.',
  },
  {
    key: 'cargos',
    label: 'Cargos e salários',
    desc: 'Salários, insalubridade, periculosidade, pisos e valor do ponto.',
  },
  {
    key: 'vagas',
    label: 'Vagas',
    desc: 'Faixas e valores das vagas de recrutamento.',
  },
]

// Interruptor no padrão do painel de governança.
function Switch({ on, busy, onClick, aria }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={aria}
      className={cn(
        'relative h-6 w-10 shrink-0 rounded-full transition-colors tap',
        on ? 'bg-accent' : 'bg-surface-2',
        busy && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
          on ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

// Editor por pessoa: um interruptor por área. Salva na hora (cada área é uma
// linha independente na tabela) e reverte se a RPC falhar.
function EditorValores({ pessoa, onFechar }) {
  const [areas, setAreas] = useState(null) // Set de áreas liberadas · null = carregando
  const [salvando, setSalvando] = useState(null) // área em gravação
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    supabase.rpc('perm_valores_areas', { p_matricula: pessoa.matricula }).then(({ data }) => {
      if (ativo) setAreas(new Set((data || []).map((r) => r.area)))
    })
    return () => {
      ativo = false
    }
  }, [pessoa.matricula])

  // Catálogo + quaisquer áreas já liberadas que não estejam no catálogo fixo.
  const linhas = useMemo(() => {
    const extras = [...(areas || [])]
      .filter((a) => !AREAS.some((x) => x.key === a))
      .map((a) => ({ key: a, label: a, desc: 'Área personalizada.' }))
    return [...AREAS, ...extras]
  }, [areas])

  const temGeral = !!areas && areas.has('geral')

  async function alternar(area) {
    if (salvando || areas === null) return
    const novo = !areas.has(area)
    setErro('')
    setSalvando(area)
    tapHaptic()
    setAreas((prev) => {
      const n = new Set(prev)
      novo ? n.add(area) : n.delete(area)
      return n
    })
    const { error } = await supabase.rpc('perm_valores_set', {
      p_matricula: pessoa.matricula,
      p_area: area,
      p_liberado: novo,
    })
    setSalvando(null)
    if (error) {
      setAreas((prev) => {
        const n = new Set(prev)
        novo ? n.delete(area) : n.add(area)
        return n
      })
      setErro('Não foi possível salvar. Tente de novo.')
    }
  }

  function fechar() {
    onFechar(areas ? { tem_geral: areas.has('geral'), qtd_areas: areas.size } : null)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="safe-top shrink-0 border-b border-line bg-surface">
        <div className="hstack gap-3 px-5 py-3">
          <button onClick={fechar} className="shrink-0 text-muted tap" aria-label="Fechar">
            <X size={22} />
          </button>
          <Avatar name={pessoa.nome} src={pessoa.avatar_url} size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-bold">{pessoa.nome}</div>
            <div className="truncate text-xs text-muted">
              {pessoa.cargo}
              {pessoa.unidade ? ` · ${pessoa.unidade}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-3 px-1 text-xs leading-relaxed text-muted">
          Ligue as áreas em que esta pessoa pode ver os <b className="text-text">valores</b>. Cada
          liberação salva na hora.
        </p>

        {areas === null ? (
          <div className="hstack justify-center py-16 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <Card className="!p-0">
            {linhas.map((a, i) => {
              const ehGeral = a.key === 'geral'
              const on = areas.has(a.key)
              // Áreas específicas ficam cobertas quando 'Todos os valores' está ligado.
              const coberta = !ehGeral && temGeral
              return (
                <div key={a.key} className={cn('hstack gap-3 px-4 py-3', i > 0 && 'border-t border-line')}>
                  <div className="min-w-0 flex-1">
                    <div className="hstack gap-2">
                      <span className="text-sm font-semibold">{a.label}</span>
                      {ehGeral && (
                        <span className="pill bg-accent-soft text-[9px] uppercase text-accent">
                          <ShieldCheck size={10} /> Total
                        </span>
                      )}
                      {coberta && on === false && (
                        <span className="rounded-pill bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-2">
                          coberta pelo total
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-muted">{a.desc}</div>
                  </div>
                  <Switch
                    on={on}
                    busy={salvando === a.key}
                    onClick={() => alternar(a.key)}
                    aria={on ? `Desligar ${a.label}` : `Liberar ${a.label}`}
                  />
                </div>
              )
            })}
          </Card>
        )}
        {erro && <p className="mt-2 px-1 text-xs font-medium text-danger">{erro}</p>}
      </div>

      <div className="safe-bottom shrink-0 border-t border-line bg-surface px-5 py-3">
        <button onClick={fechar} className="btn-primary w-full !py-3.5">
          Concluir
        </button>
      </div>
    </div>,
    document.body,
  )
}

// Seletor de quem pode ver os VALORES (financeiros) das páginas de governança.
// Escreve em dp_rh.perm_ver_valores (por área) pelas RPCs admin
// perm_valores_listar / perm_valores_areas / perm_valores_set. A máscara de
// verdade é no servidor (a RPC de leitura devolve null); aqui é só o cadastro.
export function AdminVerValores() {
  const [pessoas, setPessoas] = useState(null)
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(null)

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

  const comAcesso = (pessoas || []).filter((p) => p.tem_geral || (p.qtd_areas || 0) > 0).length

  function aoFechar(resumo) {
    if (resumo) {
      setPessoas((prev) =>
        prev.map((p) =>
          p.matricula === sel.matricula
            ? { ...p, tem_geral: resumo.tem_geral, qtd_areas: resumo.qtd_areas }
            : p,
        ),
      )
    }
    setSel(null)
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
            Libere por <b className="text-text">área</b> quem pode ver os{' '}
            <b className="text-text">valores financeiros</b>. Sem liberação, a pessoa acessa as
            páginas, mas os valores nem chegam no aparelho dela.
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
        <p className="mt-2 px-1 text-xs text-muted">{comAcesso} com acesso a valores</p>
      </div>

      <Section className="mt-2" title={`Colaboradores (${filtradas.length})`}>
        <div className="flex flex-col gap-2">
          {filtradas.map((p) => (
            <button
              key={p.matricula}
              onClick={() => {
                tapHaptic()
                setSel(p)
              }}
              className="tap text-left"
            >
              <Card className="hstack gap-3 !py-3">
                <Avatar name={p.nome} src={p.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.nome}</div>
                  <div className="truncate text-xs text-muted">
                    {p.cargo}
                    {p.unidade ? ` · ${p.unidade}` : ''}
                  </div>
                </div>
                {p.tem_geral ? (
                  <span className="pill shrink-0 bg-accent-soft text-[10px] uppercase text-accent">
                    <ShieldCheck size={11} /> Vê tudo
                  </span>
                ) : (p.qtd_areas || 0) > 0 ? (
                  <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
                    {p.qtd_areas} {p.qtd_areas > 1 ? 'áreas' : 'área'}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-medium text-muted-2">sem acesso</span>
                )}
                <ChevronRight size={16} className="shrink-0 text-muted-2" />
              </Card>
            </button>
          ))}
          {filtradas.length === 0 && (
            <div className="card p-8 text-center text-sm text-muted">
              Ninguém encontrado com “{busca}”.
            </div>
          )}
        </div>
      </Section>

      {sel && <EditorValores pessoa={sel} onFechar={aoFechar} />}
    </>
  )
}

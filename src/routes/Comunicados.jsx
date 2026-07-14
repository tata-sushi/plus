import { useCallback, useEffect, useState } from 'react'
import { Eye, Plus, Send, X, Loader2, Trash2, Calendar } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { dataCurta, dataBR } from '../lib/tempo.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export function Comunicados() {
  const { usuario } = useAuth()
  const matricula = usuario?.matricula
  const admin = !!usuario?.podePublicar

  const [comunicados, setComunicados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [dataEvento, setDataEvento] = useState('')
  const [publicando, setPublicando] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('comunicados_feed').select('*')
    if (error) {
      setErro('Não foi possível carregar os comunicados.')
      setCarregando(false)
      return
    }
    const lista = data || []
    // reflete a própria visualização já na tela (os ainda não lidos contam +1)
    setComunicados(
      lista.map((c) => (c.lido ? c : { ...c, lido: true, visualizacoes: c.visualizacoes + 1 })),
    )
    setErro('')
    setCarregando(false)
    // registra a leitura no banco (dedup no servidor, identidade via JWT)
    if (lista.length) supabase.rpc('registrar_leituras')
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function publicar() {
    const t = titulo.trim()
    const c = corpo.trim()
    if (!t || !c || publicando || !matricula) return
    tapHaptic()
    setPublicando(true)
    const { data, error } = await supabase
      .from('comunicados')
      .insert({ titulo: t, corpo: c, autor_matricula: matricula, data_evento: dataEvento || null })
      .select('id, created_at')
      .single()
    setPublicando(false)
    if (error) {
      setErro('Não foi possível publicar.')
      return
    }
    setComunicados((prev) => [
      {
        id: data.id,
        titulo: t,
        corpo: c,
        autor_matricula: matricula,
        autor_nome: usuario?.nome,
        created_at: data.created_at,
        data_evento: dataEvento || null,
        visualizacoes: 0,
        lido: true,
      },
      ...prev,
    ])
    setTitulo('')
    setCorpo('')
    setDataEvento('')
    setForm(false)
  }

  async function excluir(id) {
    tapHaptic()
    const { error } = await supabase.from('comunicados').delete().eq('id', id)
    if (!error) setComunicados((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <>
      <Header />

      {/* Botão de publicar — só admin */}
      {admin && (
        <div className="px-5 pt-2">
          {!form ? (
            <button
              onClick={() => setForm(true)}
              className="btn-primary w-full !py-3 text-sm"
            >
              <Plus size={16} /> Novo comunicado
            </button>
          ) : (
            <Card>
              <div className="hstack justify-between">
                <span className="font-display text-sm font-bold">Novo comunicado</span>
                <button onClick={() => setForm(false)} className="text-muted tap" aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título"
                className="mt-3 w-full rounded-card border border-white/10 bg-surface px-4 py-3 text-sm font-semibold outline-none placeholder:text-muted-2"
              />
              <textarea
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                placeholder="Escreva o comunicado…"
                rows={4}
                className="mt-2 w-full resize-none rounded-card border border-white/10 bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />
              <label className="mt-2 hstack gap-3 rounded-card border border-white/10 bg-surface px-4 py-3">
                <Calendar size={16} className="shrink-0 text-muted" />
                <span className="text-sm text-muted">Data do evento</span>
                <input
                  type="date"
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                  className="ml-auto bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                />
                {dataEvento && (
                  <button
                    type="button"
                    onClick={() => setDataEvento('')}
                    className="text-muted-2 tap"
                    aria-label="Limpar data"
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <button
                onClick={publicar}
                disabled={!titulo.trim() || !corpo.trim() || publicando}
                className={cn(
                  'btn-primary mt-3 w-full !py-3 text-sm',
                  (!titulo.trim() || !corpo.trim() || publicando) && 'opacity-50',
                )}
              >
                {publicando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={15} /> Publicar
                  </>
                )}
              </button>
            </Card>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3 px-5">
        {carregando && (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!carregando && erro && (
          <div className="rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-center text-xs font-medium text-danger">
            {erro}
          </div>
        )}

        {!carregando && !erro && comunicados.length === 0 && (
          <div className="py-10 text-center text-sm text-muted">Nenhum comunicado por enquanto.</div>
        )}

        {comunicados.map((c) => (
          <Card key={c.id} className="reveal">
            <div className="hstack items-start justify-between gap-2">
              <h3 className="font-display text-base font-bold leading-snug">{c.titulo}</h3>
              {admin && (
                <button
                  onClick={() => excluir(c.id)}
                  className="shrink-0 text-muted-2 tap"
                  aria-label="Excluir comunicado"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{c.corpo}</p>
            {c.data_evento && (
              <div className="mt-2 hstack w-fit gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
                <Calendar size={12} /> Evento · {dataBR(c.data_evento)}
              </div>
            )}
            <div className="mt-3 hstack justify-between text-[11px] text-muted">
              <span>{dataCurta(c.created_at)}</span>
              <span className="hstack gap-1">
                <Eye size={12} /> {c.visualizacoes}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

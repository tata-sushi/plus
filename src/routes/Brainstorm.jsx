import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lightbulb, Send, Loader2, CheckCircle2, Lock } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Card } from '../components/Card.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { cn } from '../lib/cn'

// Página "Compartilhar palavra" (brainstorm). Escreve na MESMA base do portal
// (dp_rh.brainstorm_palavras) via a RPC brainstorm_add. Acesso liberado por
// pessoa no painel admin (aba Aplicativo) — guard: usuario.podeBrainstorm.
const SESSAO = 'Brainstorm Geral'
const CATEGORIAS = ['Ações', 'Dores/Problemas', 'Emoções', 'Forças']

export function Brainstorm() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [palavra, setPalavra] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  async function compartilhar() {
    const p = palavra.trim()
    if (!p) return setErro('Escreva uma palavra.')
    if (!categoria) return setErro('Escolha uma categoria.')
    tapHaptic()
    setEnviando(true)
    setErro('')
    const { error } = await supabase.rpc('brainstorm_add', {
      p_sessao: SESSAO,
      p_palavra: p,
      p_autor: usuario?.nome || null,
      p_descricao: descricao.trim() || null,
      p_categoria: categoria,
    })
    setEnviando(false)
    if (error) return setErro('Não foi possível enviar. Tente de novo.')
    setOk(true)
    setPalavra('')
    setDescricao('')
    setCategoria(null)
  }

  function aoDigitar(setter) {
    return (e) => {
      setter(e.target.value)
      if (ok) setOk(false)
      if (erro) setErro('')
    }
  }

  return (
    <div className="min-h-[100dvh] bg-bg">
      <Header />
      <div className="px-5 pt-2">
        <button
          onClick={() => {
            tapHaptic()
            navigate(-1)
          }}
          className="hstack gap-1 text-sm font-medium text-muted tap"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      <div className="mx-auto w-full max-w-[520px] px-5 pb-28 pt-4">
        <div className="mb-4 hstack items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Lightbulb size={18} />
          </span>
          <div>
            <div className="font-display text-[19px] font-bold leading-tight">Reunião de Líderes</div>
            <div className="text-[13px] text-muted">Uma palavra que resume o que você quer trazer.</div>
          </div>
        </div>

        {usuario?.podeBrainstorm === false ? (
          <Card className="hstack items-start gap-2.5 text-sm text-muted">
            <Lock size={17} className="mt-0.5 shrink-0 text-muted-2" />
            <span>Você não tem acesso a esta página. Fale com o RH se precisar participar.</span>
          </Card>
        ) : usuario?.podeBrainstorm == null ? (
          <div className="hstack justify-center py-20 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <Card className="flex flex-col gap-4">
            {ok && (
              <div className="hstack items-center gap-2 rounded-card border border-accent/40 bg-accent-soft px-3.5 py-2.5 text-sm font-semibold text-accent">
                <CheckCircle2 size={17} className="shrink-0" /> Palavra compartilhada! Pode enviar outra.
              </div>
            )}

            {/* Palavra */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Palavra
              </label>
              <input
                value={palavra}
                onChange={aoDigitar(setPalavra)}
                maxLength={40}
                placeholder="Ex.: União"
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Categoria
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIAS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      tapHaptic()
                      setCategoria(c)
                      if (erro) setErro('')
                    }}
                    className={cn(
                      'rounded-pill border px-3.5 py-2 text-[13px] font-semibold tap',
                      categoria === c
                        ? 'border-accent bg-accent text-black'
                        : 'border-line bg-surface text-muted',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
                Descrição <span className="normal-case text-muted-2">(opcional)</span>
              </label>
              <textarea
                value={descricao}
                onChange={aoDigitar(setDescricao)}
                rows={3}
                maxLength={280}
                placeholder="Explique em poucas palavras o que essa palavra representa."
                className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2"
              />
            </div>

            {erro && <p className="text-xs font-medium text-danger">{erro}</p>}

            <button
              onClick={compartilhar}
              disabled={enviando}
              className={cn('btn-primary w-full !py-3.5 text-sm', enviando && 'opacity-60')}
            >
              {enviando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={17} /> Compartilhar
                </>
              )}
            </button>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Brainstorm

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, ArrowLeft, ChevronRight } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'

export function BuscarPessoas() {
  const navigate = useNavigate()
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const t = termo.trim()
    if (t.length < 2) {
      setResultados([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    const timer = setTimeout(() => {
      let ativo = true
      supabase.rpc('buscar_colaboradores', { p_termo: t }).then(({ data }) => {
        if (!ativo) return
        setResultados(data || [])
        setCarregando(false)
      })
      return () => {
        ativo = false
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [termo])

  const curto = termo.trim().length < 2

  return (
    <>
      <Header />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="relative mt-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" />
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar pessoa pelo nome…"
            className="w-full rounded-full border border-line bg-surface py-3 pl-10 pr-4 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="mt-4 px-5">
        {carregando ? (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : curto ? (
          <p className="py-10 text-center text-sm text-muted">Digite ao menos 2 letras para buscar.</p>
        ) : resultados.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Ninguém encontrado.</p>
        ) : (
          <div className="card overflow-hidden">
            {resultados.map((c, i) => (
              <button
                key={c.matricula}
                onClick={() => navigate(`/perfil/${c.matricula}`)}
                className={`hstack w-full gap-3 px-4 py-3 text-left tap ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <Avatar name={c.nome} src={c.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.nome}</div>
                  <div className="truncate text-[11px] text-muted">
                    {c.cargo}
                    {c.cargo && c.unidade ? ' · ' : ''}
                    {c.unidade}
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

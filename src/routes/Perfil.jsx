import { useEffect, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Send, Check, Cake } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { GradeEmblemas } from '../components/GradeEmblemas.jsx'
import { AnalisesPerfil } from '../components/AnalisesPerfil.jsx'
import { avaliarCatalogo } from '../lib/emblemas.js'
import { signoDe } from '../lib/signo.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR')
const LIMITE = 500

const ERROS = {
  saldo_insuficiente: 'Saldo insuficiente para essa transferência.',
  valor_invalido: 'Informe um valor válido.',
  acima_do_limite: `O limite é ${LIMITE} pts por transferência.`,
  destino_invalido: 'Não é possível transferir para você mesmo.',
  destino_inexistente: 'Colaborador não encontrado.',
  sem_acesso: 'Sessão expirada. Entre novamente.',
}

export function Perfil() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const ehEu = !!usuario?.matricula && id === usuario.matricula

  const [perfil, setPerfil] = useState(undefined) // undefined = carregando · null = não encontrado
  const [catalogo, setCatalogo] = useState([])
  const [saldo, setSaldo] = useState(null)
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(null) // { pontos } após concluir

  useEffect(() => {
    if (ehEu) return
    let ativo = true
    supabase.rpc('perfil_publico', { p_matricula: id }).then(({ data }) => {
      if (ativo) setPerfil(data || null)
    })
    supabase.rpc('meu_saldo').then(({ data }) => {
      if (ativo) setSaldo(Number(data || 0))
    })
    supabase.rpc('catalogo_emblemas').then(({ data }) => {
      if (ativo) setCatalogo(data || [])
    })
    return () => {
      ativo = false
    }
  }, [id, ehEu])

  // O próprio perfil abre na Minha jornada.
  if (ehEu) return <Navigate to="/jornada" replace />

  if (perfil === undefined) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Loader2 size={24} className="animate-spin text-muted-2" />
      </div>
    )
  }

  if (!perfil) {
    return (
      <>
        <Header />
        <div className="px-5 pt-4">
          <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
            <ArrowLeft size={16} /> Voltar
          </button>
          <p className="mt-10 text-center text-sm text-muted">Perfil não encontrado.</p>
        </div>
      </>
    )
  }

  const primeiro = (perfil.nome || '').split(' ')[0]
  const proximo = perfil.proximo_pontos
  const progresso = proximo ? Math.min(1, Number(perfil.pontos) / Number(proximo)) : 1
  const falta = proximo ? Number(proximo) - Number(perfil.pontos) : 0
  const signo = signoDe(perfil.data_nascimento)
  const emb = avaliarCatalogo(catalogo, perfil)
  const aniversario = perfil.data_nascimento
    ? new Date(perfil.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
    : null

  async function transferir() {
    const n = Math.floor(Number(valor))
    if (!n || n <= 0) {
      setErro('Informe um valor válido.')
      return
    }
    if (n > LIMITE) {
      setErro(`O limite é ${LIMITE} pts por transferência.`)
      return
    }
    if (saldo != null && n > saldo) {
      setErro('Saldo insuficiente para essa transferência.')
      return
    }
    setEnviando(true)
    setErro('')
    const { data, error } = await supabase.rpc('transferir_pontos', { p_destino: id, p_pontos: n })
    setEnviando(false)
    if (error || !data?.ok) {
      setErro(ERROS[data?.erro] || 'Não foi possível transferir agora. Tente de novo.')
      return
    }
    setSaldo(data.saldo)
    setFeito({ pontos: data.pontos })
    setAberto(false)
    setValor('')
  }

  return (
    <>
      <Header />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      {/* Identidade */}
      <div className="mt-3 px-5">
        <div className="hero-card reveal p-4">
          <div className="hstack gap-3">
            <Avatar name={perfil.nome} src={perfil.avatar_url} size={56} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{perfil.nome}</div>
              <div className="text-xs text-muted">
                {perfil.departamento}
                {perfil.departamento && perfil.unidade ? ' · ' : ''}
                {perfil.unidade}
              </div>
              {aniversario && (
                <div className="mt-0.5 hstack gap-1 text-[11px] text-muted-2">
                  <Cake size={12} /> Aniversário · {aniversario}
                </div>
              )}
            </div>
          </div>

          {/* Progresso no ranking */}
          <div className="mt-4 hstack justify-between text-xs">
            <span className="font-semibold text-accent">{fmt(perfil.pontos)} pts</span>
            <span className="font-semibold text-muted">#{perfil.posicao} no ranking</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={progresso} />
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {proximo ? `Faltam ${fmt(falta)} pts para o #${perfil.posicao - 1}` : 'Líder do ranking 🏆'}
          </div>
        </div>
      </div>

      {/* Transferir saldo */}
      <Section className="reveal reveal-1 mt-5" title="Carteira">
        {feito ? (
          <Card>
            <div className="hstack gap-2 text-sm font-semibold text-accent">
              <Check size={18} className="shrink-0" />
              {fmt(feito.pontos)} pts compartilhados com {primeiro}.
            </div>
            <div className="mt-1 text-xs text-muted">Seu novo saldo: {fmt(saldo)} pts.</div>
          </Card>
        ) : aberto ? (
          <Card>
            <div className="text-xs text-muted">
              Seu saldo: <b className="text-text">{fmt(saldo)} pts</b>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max={LIMITE}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={`Quantos pontos? (máx. ${LIMITE})`}
              className="mt-2 w-full rounded-card border border-line bg-surface px-3.5 py-3 text-sm outline-none focus:border-accent"
            />
            {erro && <p className="mt-2 text-xs font-medium text-danger">{erro}</p>}
            <div className="mt-3 hstack gap-2">
              <button
                onClick={() => {
                  setAberto(false)
                  setErro('')
                }}
                className="btn-ghost flex-1 !py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={transferir}
                disabled={enviando}
                className="btn-primary flex-1 !py-3 text-sm disabled:opacity-60"
              >
                {enviando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                `Compartilhar com ${primeiro}`
              )}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-2">
              Máx. {LIMITE} pts por transferência. Entra na carteira do colega e não conta no
              ranking.
            </p>
          </Card>
        ) : (
          <button onClick={() => setAberto(true)} className="btn-primary w-full !py-3.5 text-sm">
            <Send size={16} /> Compartilhar pontos
          </button>
        )}
      </Section>

      {/* Conquistas */}
      <Section
        className="reveal reveal-2 mt-5"
        title="Conquistas"
        action={
          <span className="text-xs font-semibold text-muted">
            {emb.total}/{emb.existentes}
          </span>
        }
      >
        <Card>
          <GradeEmblemas catalogo={catalogo} dados={perfil} />
        </Card>
      </Section>

      {/* Características */}
      <Section className="reveal reveal-3 mt-5" title="Características">
        <AnalisesPerfil disc={perfil.disc} signo={signo} />
      </Section>
    </>
  )
}

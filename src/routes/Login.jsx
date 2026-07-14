import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { useAuth } from '../lib/AuthContext.jsx'

export function Login() {
  const { session, signIn, motivoBloqueio, limparBloqueio } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (session) return <Navigate to="/" replace />

  const podeEntrar = email.trim() !== '' && senha.trim() !== '' && !enviando
  const avisoInativo = motivoBloqueio === 'inativo' && !erro

  async function entrar(e) {
    e.preventDefault()
    if (!podeEntrar) return
    tapHaptic()
    limparBloqueio()
    setErro('')
    setEnviando(true)
    const { error } = await signIn(email, senha)
    setEnviando(false)
    if (error) {
      setErro(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Tente novamente.',
      )
    }
    // sucesso: a sessão atualiza e o app redireciona automaticamente
  }

  return (
    <div className="safe-top safe-bottom flex min-h-screen flex-col px-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {/* Marca */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/icons/icon-192.png"
            alt="Tatá"
            className="h-20 w-20 rounded-2xl"
            width={80}
            height={80}
          />
          <div className="mt-4 font-display text-2xl font-bold tracking-tight">
            TATÁ<span className="text-accent"> PLUS</span>
          </div>
          <div className="mt-1 text-sm text-muted">Portal do colaborador</div>
        </div>

        {/* Formulário */}
        <form onSubmit={entrar} className="mt-8 flex flex-col gap-3">
          <label className="hstack gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
            <Mail size={18} className="shrink-0 text-muted" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            />
          </label>

          <label className="hstack gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
            <Lock size={18} className="shrink-0 text-muted" />
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="shrink-0 text-muted tap"
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          <button type="button" className="self-center text-xs font-semibold text-accent tap">
            Esqueci minha senha
          </button>

          {erro && (
            <div className="rounded-card border border-danger/30 bg-danger/10 px-4 py-2.5 text-center text-xs font-medium text-danger">
              {erro}
            </div>
          )}

          {avisoInativo && (
            <div className="rounded-card border border-danger/30 bg-danger/10 px-4 py-2.5 text-center text-xs font-medium text-danger">
              Acesso disponível apenas para colaboradores ativos.
            </div>
          )}

          <button
            type="submit"
            disabled={!podeEntrar}
            className={cn('btn-primary mt-2 w-full !py-3.5', !podeEntrar && 'opacity-50')}
          >
            {enviando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Entrar <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

      </div>

      <div className="flex flex-col items-center gap-1 pb-2 text-center text-[11px] text-muted-2">
        <span>TATÁ PLUS · 2.0 - Uso interno</span>
        <span>TATÁ Sushi | TATÁ Poke | 2016 – 2026</span>
      </div>
    </div>
  )
}

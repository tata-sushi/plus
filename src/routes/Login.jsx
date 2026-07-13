import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { isLoggedIn, login } from '../lib/auth.js'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  if (isLoggedIn()) return <Navigate to="/" replace />

  const podeEntrar = email.trim() !== '' && senha.trim() !== ''

  function entrar(e) {
    e.preventDefault()
    if (!podeEntrar) return
    tapHaptic()
    login()
    navigate('/', { replace: true })
  }

  return (
    <div className="safe-top safe-bottom flex min-h-screen flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
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
          <label className="hstack gap-3 rounded-card border border-white/10 bg-surface px-4 py-3.5">
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

          <label className="hstack gap-3 rounded-card border border-white/10 bg-surface px-4 py-3.5">
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

          <button
            type="submit"
            disabled={!podeEntrar}
            className={cn('btn-primary mt-2 w-full !py-3.5', !podeEntrar && 'opacity-50')}
          >
            Entrar <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-1 text-center text-[11px] text-muted-2">
          <span>Uso interno · v2.0</span>
          <span>Tatá Sushi / Tatá Book / 2016 – 2026</span>
        </div>
      </div>
    </div>
  )
}

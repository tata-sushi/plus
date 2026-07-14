import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'

const AuthContext = createContext(null)

const INTERVALO_RECHECK = 3 * 60 * 1000 // 3 min

function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || ''
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [motivoBloqueio, setMotivoBloqueio] = useState('') // '' | 'inativo'
  const bloqueando = useRef(false)
  const location = useLocation()

  const limparBloqueio = useCallback(() => setMotivoBloqueio(''), [])

  // Derruba o acesso de quem não está Ativo
  const derrubarInativo = useCallback(async () => {
    if (bloqueando.current) return
    bloqueando.current = true
    setProfile(null)
    setMotivoBloqueio('inativo')
    await supabase.auth.signOut()
    bloqueando.current = false
  }, [])

  // Busca o perfil e valida o status ao vivo.
  // - erro de rede: não derruba (fail-open)
  // - sem linha (RLS bloqueou) ou status != Ativo: derruba
  const verificarPerfil = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('matricula, nome, cargo, unidade, departamento, perfil, status, avatar_url')
      .maybeSingle()
    if (error) return
    if (!data || data.status !== 'Ativo') {
      await derrubarInativo()
      return
    }
    setProfile(data)
  }, [derrubarInativo])

  // Sessão do Supabase
  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s)
      if (evento === 'SIGNED_IN') setMotivoBloqueio('')
    })
    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Ao (re)abrir a sessão: valida o perfil/status
  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    verificarPerfil()
  }, [session, verificarPerfil])

  // Re-checa quando o app volta ao foco e periodicamente,
  // para derrubar quem virou Inativo com a sessão já aberta.
  useEffect(() => {
    if (!session?.user) return
    function aoVoltar() {
      if (document.visibilityState === 'visible') verificarPerfil()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    const timer = setInterval(verificarPerfil, INTERVALO_RECHECK)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      clearInterval(timer)
    }
  }, [session, verificarPerfil])

  // Re-checa a cada navegação (qualquer troca de tela revalida o status)
  useEffect(() => {
    if (session?.user) verificarPerfil()
  }, [location.pathname, session, verificarPerfil])

  const usuario = profile
    ? {
        id: profile.matricula,
        matricula: profile.matricula,
        nome: profile.nome,
        primeiroNome: primeiroNome(profile.nome),
        cargo: profile.cargo,
        loja: profile.unidade,
        unidade: profile.unidade,
        departamento: profile.departamento,
        perfil: profile.perfil,
        status: profile.status,
        avatarUrl: profile.avatar_url,
      }
    : session?.user
      ? {
          id: session.user.id,
          nome: session.user.email,
          primeiroNome: primeiroNome(session.user.email),
          cargo: '',
          loja: '',
          departamento: '',
        }
      : null

  const value = {
    session,
    usuario,
    loading,
    motivoBloqueio,
    limparBloqueio,
    signIn: (email, senha) =>
      supabase.auth.signInWithPassword({ email: email.trim(), password: senha }),
    signOut: () => supabase.auth.signOut(),
    updatePassword: (novaSenha) => supabase.auth.updateUser({ password: novaSenha }),
    // Atualiza a foto de perfil (grava no profiles + estado local)
    definirAvatar: async (url) => {
      const mat = profile?.matricula
      if (!mat) return { error: new Error('sem matrícula') }
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('matricula', mat)
      if (!error) setProfile((p) => (p ? { ...p, avatar_url: url } : p))
      return { error }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

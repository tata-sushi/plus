import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const AuthContext = createContext(null)

function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || ''
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sessão do Supabase
  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s)
    })
    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Perfil (identidade) do usuário logado — RLS retorna só a própria linha
  useEffect(() => {
    const email = session?.user?.email
    if (!email) {
      setProfile(null)
      return
    }
    let ativo = true
    supabase
      .from('profiles')
      .select('matricula, nome, cargo, unidade, departamento, perfil')
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setProfile(data ?? null)
      })
    return () => {
      ativo = false
    }
  }, [session])

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
    signIn: (email, senha) =>
      supabase.auth.signInWithPassword({ email: email.trim(), password: senha }),
    signOut: () => supabase.auth.signOut(),
    updatePassword: (novaSenha) => supabase.auth.updateUser({ password: novaSenha }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

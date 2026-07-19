import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'
import { prefetchAoAbrir } from './prefetch.js'

const AuthContext = createContext(null)

const INTERVALO_RECHECK = 3 * 60 * 1000 // 3 min

function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || ''
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [podePublicar, setPodePublicar] = useState(false)
  const [govTipo, setGovTipo] = useState(null) // tipo de acesso à governança (ou null)
  const [loading, setLoading] = useState(true)
  const [motivoBloqueio, setMotivoBloqueio] = useState('') // '' | 'inativo'
  const bloqueando = useRef(false)
  const prefetchou = useRef(false)
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
      .select('matricula, nome, cargo, unidade, departamento, perfil, status')
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

  // Busca a própria foto de perfil (avatar mora em auth_users, exposto via
  // colaboradores_publicos). Roda quando a matrícula muda.
  useEffect(() => {
    const mat = profile?.matricula
    if (!mat) {
      setAvatarUrl(null)
      setPodePublicar(false)
      setGovTipo(null)
      return
    }
    let ativo = true
    supabase
      .from('colaboradores_publicos')
      .select('avatar_url')
      .eq('matricula', mat)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setAvatarUrl(data?.avatar_url ?? null)
      })
    supabase.rpc('pode_publicar').then(({ data }) => {
      if (ativo) setPodePublicar(data === true)
    })
    supabase.rpc('acesso_governanca').then(({ data }) => {
      if (ativo) setGovTipo(data || null)
    })
    return () => {
      ativo = false
    }
  }, [profile?.matricula])

  // Prefetch silencioso após o login: aquece as imagens das telas pesadas
  // (recompensas) uma vez, com um atraso pra não brigar com a carga inicial.
  useEffect(() => {
    if (!profile?.matricula || prefetchou.current) return
    prefetchou.current = true
    const t = setTimeout(prefetchAoAbrir, 1500)
    return () => clearTimeout(t)
  }, [profile?.matricula])

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
        avatarUrl,
        podePublicar,
        governanca: { tem: !!govTipo, tipo: govTipo },
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
    // Atualiza a foto de perfil (grava em auth_users via função SECURITY DEFINER)
    definirAvatar: async (url) => {
      const { error } = await supabase.rpc('definir_meu_avatar', { url })
      if (!error) setAvatarUrl(url)
      return { error }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

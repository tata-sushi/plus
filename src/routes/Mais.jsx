import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Trophy,
  GraduationCap,
  ClipboardList,
  Gift,
  HeartHandshake,
  Sparkles,
  Wrench,
  LogOut,
  ChevronRight,
  Camera,
  Loader2,
  Megaphone,
  UtensilsCrossed,
  Sun,
  Moon,
  ShieldCheck,
  Ear,
  Pin,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { ProgressRing } from '../components/ProgressRing.jsx'
import { SocialLinks } from '../components/SocialLinks.jsx'
import { currentUser, redesSociais } from '../lib/mockData.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { getTheme, applyTheme } from '../lib/theme.js'
import { cn } from '../lib/cn'

const TEMAS = [
  { v: 'light', label: 'Claro', Icon: Sun },
  { v: 'dark', label: 'Escuro', Icon: Moon },
]

const itens = [
  { to: '/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/comunicados', label: 'Comunicados', icon: Megaphone },
  { to: '/jornada', label: 'Minha jornada', icon: Trophy },
  { to: '/treinamentos', label: 'Treinamentos', icon: GraduationCap },
  { to: '/procedimentos', label: 'Procedimentos', icon: ClipboardList },
  { to: '/recompensas', label: 'Recompensas', icon: Gift },
  { to: '/rh', label: 'RH Fácil', icon: HeartHandshake },
  { to: '/assistente', label: 'Assistente IA', icon: Sparkles },
  { to: '/manutencao', label: 'Painel de manutenção', icon: Wrench },
]

const TAM_MAX = 8 * 1024 * 1024 // 8 MB

export function Mais() {
  const navigate = useNavigate()
  const { usuario, signOut, definirAvatar } = useAuth()
  const nome = usuario?.nome || currentUser.nome
  const cargo = usuario?.cargo || currentUser.cargo
  const loja = usuario?.loja || currentUser.loja
  // quem vê Governança na barra reveza com a Ouvidoria — então a Ouvidoria
  // entra aqui no menu, para essa pessoa não perder o acesso ao canal.
  const navItens = usuario?.governanca?.tem
    ? [
        ...itens,
        { to: '/ouvidoria', label: 'Ouvidoria', icon: Ear },
        { to: '/atalhos-governanca', label: 'Gerenciar atalhos', icon: Pin },
      ]
    : itens

  const inputFoto = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [saldo, setSaldo] = useState(null)
  const [progresso, setProgresso] = useState(null)
  const [tema, setTema] = useState(getTheme)

  useEffect(() => {
    let ativo = true
    supabase.rpc('meu_saldo').then(({ data }) => {
      if (ativo) setSaldo(Number(data) || 0)
    })
    supabase.rpc('meu_progresso_desafios').then(({ data }) => {
      if (ativo) setProgresso(data?.[0] ?? null)
    })
    return () => {
      ativo = false
    }
  }, [])

  function trocarTema(t) {
    tapHaptic()
    setTema(applyTheme(t))
  }

  async function trocarFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !usuario?.matricula) return
    if (!f.type.startsWith('image/')) {
      setErro('Selecione uma imagem.')
      return
    }
    if (f.size > TAM_MAX) {
      setErro('Imagem muito grande (máx. 8 MB).')
      return
    }
    tapHaptic()
    setErro('')
    setEnviando(true)
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const caminho = `${usuario.matricula}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('avatares')
      .upload(caminho, f, { cacheControl: '3600', contentType: f.type })
    if (upErr) {
      setEnviando(false)
      setErro('Não foi possível enviar a foto.')
      return
    }
    const url = supabase.storage.from('avatares').getPublicUrl(caminho).data.publicUrl
    const { error } = await definirAvatar(url)
    setEnviando(false)
    if (error) setErro('Não foi possível salvar a foto.')
  }

  async function sair() {
    tapHaptic()
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <Header title="Mais" />

      <div className="px-5">
        <div className="card p-4">
          <div className="hstack gap-3">
            <button
              onClick={() => inputFoto.current?.click()}
              className="relative tap"
              aria-label="Trocar foto de perfil"
            >
              <Avatar name={nome} src={usuario?.avatarUrl} size={52} />
              <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-black ring-2 ring-surface">
                {enviando ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Camera size={11} />
                )}
              </span>
            </button>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              onChange={trocarFoto}
              className="hidden"
            />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{nome}</div>
              <div className="text-xs text-muted">
                {cargo}
                {loja ? ` · ${loja}` : ''}
              </div>
              <div className="mt-1 text-xs">
                <span className="text-muted">Carteira · </span>
                <span className="font-semibold text-accent">
                  {saldo == null ? '—' : `${saldo.toLocaleString('pt-BR')} pts`}
                </span>
              </div>
            </div>
            <ProgressRing value={(progresso?.pct ?? 0) / 100} size={54} stroke={5} />
          </div>
          {erro && <div className="mt-2 text-[11px] font-medium text-danger">{erro}</div>}
        </div>
      </div>

      <Section className="mt-5" title="Navegação">
        <div className="card overflow-hidden">
          {navItens.map((i, idx) => {
            const Icon = i.icon
            return (
              <Link
                key={i.to}
                to={i.to}
                className={`hstack gap-3 px-4 py-3.5 tap ${
                  idx > 0 ? 'border-t border-line' : ''
                }`}
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon size={18} />
                </div>
                <span className="flex-1 text-sm font-semibold">{i.label}</span>
                <ChevronRight size={16} className="text-muted" />
              </Link>
            )
          })}
        </div>
      </Section>

      {usuario?.podePublicar && (
        <Section className="mt-5" title="Administração">
          <Link to="/admin" className="card hstack gap-3 px-4 py-3.5 tap">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
              <ShieldCheck size={18} />
            </div>
            <span className="flex-1 text-sm font-semibold">Painel de administração</span>
            <ChevronRight size={16} className="text-muted" />
          </Link>
        </Section>
      )}

      <Section className="mt-5" title="Aparência">
        <div className="card grid grid-cols-2 gap-1.5 p-1.5">
          {TEMAS.map(({ v, label, Icon }) => (
            <button
              key={v}
              onClick={() => trocarTema(v)}
              className={cn(
                'hstack justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold tap',
                tema === v ? 'bg-accent text-black' : 'text-muted',
              )}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </Section>

      <Section className="mt-5" title="Redes sociais da Tatá">
        <SocialLinks items={redesSociais} />
      </Section>

      <Section className="mt-5">
        <button
          onClick={sair}
          className="hstack w-full justify-center gap-2 rounded-card bg-surface p-3.5 text-sm font-semibold text-danger tap"
        >
          <LogOut size={16} /> Sair
        </button>
      </Section>

      <footer className="mt-8 flex flex-col items-center gap-0.5 px-5 text-center text-[11px] text-muted-2">
        <span className="font-semibold">TATÁ PLUS · versão 2.0</span>
        <span>Desenvolvido por Victor Carvalho · Gestão e Inovação</span>
      </footer>
    </>
  )
}

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
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { SocialLinks } from '../components/SocialLinks.jsx'
import { currentUser, redesSociais } from '../lib/mockData.js'
import { logout } from '../lib/auth.js'
import { tapHaptic } from '../lib/haptics.js'

const itens = [
  { to: '/jornada', label: 'Minha jornada', icon: Trophy },
  { to: '/treinamentos', label: 'Treinamentos', icon: GraduationCap },
  { to: '/procedimentos', label: 'Procedimentos', icon: ClipboardList },
  { to: '/recompensas', label: 'Recompensas', icon: Gift },
  { to: '/rh', label: 'RH Fácil', icon: HeartHandshake },
  { to: '/assistente', label: 'Assistente IA', icon: Sparkles },
  { to: '/manutencao', label: 'Painel de manutenção', icon: Wrench },
]

export function Mais() {
  const navigate = useNavigate()

  function sair() {
    tapHaptic()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <Header title="Mais" />

      <div className="px-5">
        <div className="card p-4">
          <div className="hstack gap-3">
            <Avatar name={currentUser.nome} size={52} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{currentUser.nome}</div>
              <div className="text-xs text-muted">
                {currentUser.cargo} · {currentUser.loja}
              </div>
              <div className="mt-1 text-xs">
                <span className="text-muted">Carteira · </span>
                <span className="font-semibold text-accent">
                  {currentUser.pontosCarteira.toLocaleString('pt-BR')} pts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Section className="mt-5" title="Navegação">
        <div className="card overflow-hidden">
          {itens.map((i, idx) => {
            const Icon = i.icon
            return (
              <Link
                key={i.to}
                to={i.to}
                className={`hstack gap-3 px-4 py-3.5 tap ${
                  idx > 0 ? 'border-t border-white/5' : ''
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
    </>
  )
}

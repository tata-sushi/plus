import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UserRound,
  Wrench,
  LogOut,
  ChevronRight,
  Camera,
  Loader2,
  Megaphone,
  UtensilsCrossed,
  ShieldCheck,
  MessageSquareWarning,
  Pin,
  Search,
  KanbanSquare,
  CalendarClock,
  SprayCan,
  Settings2,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { ProgressRing } from '../components/ProgressRing.jsx'
import { SocialLinks } from '../components/SocialLinks.jsx'
import { redesSociais } from '../lib/mockData.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { useDesktop } from '../lib/useDesktop.js'
import { useDesktopCanvas } from '../lib/desktopCanvas.js'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// No desktop estas rotas abrem no quadrante central em vez de navegar no painel.
const ROTA_CANVAS = { '/ouvidoria': 'ouvidoria' }

// gov: true → só aparece para quem tem acesso à Governança.
// quadros: true → só para quem tem acesso a Quadros (liberado no painel de admin).
// admin: true → só para perfil admin.
const itens = [
  { to: '/jornada', label: 'Meu perfil', icon: UserRound },
  { to: '/buscar', label: 'Buscar colaborador', icon: Search },
  { to: '/comunicados', label: 'Comunicados', icon: Megaphone },
  { to: '/ouvidoria', label: 'Ouvidoria', icon: MessageSquareWarning, gov: true },
  { to: '/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/quadros', label: 'Kanban Tatá (beta)', icon: KanbanSquare, quadros: true },
  { to: '/escala', label: 'Escala', icon: CalendarClock, escala: true },
  { to: '/limpeza', label: 'Limpeza de banheiros', icon: SprayCan, limpeza: true },
  { to: '/limpeza-admin', label: 'Gerenciar banheiros', icon: Settings2, admin: true },
  { to: '/manutencao', label: 'Painel de Ajustes', icon: Wrench },
  { to: '/atalhos-governanca', label: 'Atalhos', icon: Pin, gov: true },
]

const TAM_MAX = 8 * 1024 * 1024 // 8 MB

// Abrevia os nomes do meio pra caber numa linha (mantém 1º e último inteiros):
// "Victor Augusto Di Sessa Carvalho" -> "Victor A. D. S. Carvalho".
function abreviarNome(nome) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (partes.length <= 2) return partes.join(' ')
  const meio = partes.slice(1, -1).map((p) => p.charAt(0).toUpperCase() + '.')
  return [partes[0], ...meio, partes[partes.length - 1]].join(' ')
}

export function Mais() {
  const navigate = useNavigate()
  const { usuario, signOut, definirAvatar } = useAuth()
  const desktop = useDesktop()
  const { setCanvas } = useDesktopCanvas()
  const nome = usuario?.nome || 'Colaborador'
  const cargo = usuario?.cargo || ''
  const loja = usuario?.loja || ''
  // Ouvidoria e Gerenciar atalhos só para quem tem acesso à Governança.
  // Quadros só aparece para quem foi liberado no painel de admin.
  const ehAdmin = (usuario?.perfil || '').toLowerCase() === 'admin'
  const navItens = itens.filter(
    (i) =>
      (!i.gov || usuario?.governanca?.tem) &&
      (!i.quadros || usuario?.podeQuadros) &&
      (!i.escala || usuario?.podeEscala) &&
      (!i.limpeza || usuario?.podeLimpeza) &&
      (!i.admin || ehAdmin),
  )

  const inputFoto = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [saldo, setSaldo] = useState(null)
  const [progresso, setProgresso] = useState(null)

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

      <div className="px-5 pt-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            tapHaptic()
            navigate('/carteira')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              tapHaptic()
              navigate('/carteira')
            }
          }}
          aria-label="Abrir carteira"
          className="card cursor-pointer p-4 tap"
        >
          <div className="hstack gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                inputFoto.current?.click()
              }}
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
              <div className="truncate font-display text-base font-bold">{abreviarNome(nome)}</div>
              <div className="truncate text-xs text-muted">
                {cargo}
                {loja ? ` · ${loja}` : ''}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs">
                <span className="text-muted">Carteira · </span>
                <span className="font-semibold text-accent">
                  {saldo == null ? '—' : `${saldo.toLocaleString('pt-BR')} pts`}
                </span>
                <ChevronRight size={12} className="text-muted-2" />
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
            const centro = desktop && ROTA_CANVAS[i.to]
            const cls = `hstack gap-3 px-4 py-3.5 tap ${idx > 0 ? 'border-t border-line' : ''}`
            const inner = (
              <>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon size={18} />
                </div>
                <span className="flex-1 text-sm font-semibold">{i.label}</span>
                <ChevronRight size={16} className="text-carbon" />
              </>
            )
            return centro ? (
              <button key={i.to} onClick={() => setCanvas(centro)} className={`w-full text-left ${cls}`}>
                {inner}
              </button>
            ) : (
              <Link key={i.to} to={i.to} className={cls}>
                {inner}
              </Link>
            )
          })}
        </div>
      </Section>

      {usuario?.podePublicar && (
        <Section className="mt-5" title="Administração">
          {desktop ? (
            <button
              onClick={() => setCanvas('admin')}
              className="card hstack w-full gap-3 px-4 py-3.5 text-left tap"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
                <ShieldCheck size={18} />
              </div>
              <span className="flex-1 text-sm font-semibold">Painel de administração</span>
              <ChevronRight size={16} className="text-carbon" />
            </button>
          ) : (
            <Link to="/admin" className="card hstack gap-3 px-4 py-3.5 tap">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
                <ShieldCheck size={18} />
              </div>
              <span className="flex-1 text-sm font-semibold">Painel de administração</span>
              <ChevronRight size={16} className="text-carbon" />
            </Link>
          )}
        </Section>
      )}

      <Section className="mt-5">
        <SocialLinks items={redesSociais} />
      </Section>

      <Section className="mt-8">
        <button
          onClick={sair}
          className="hstack w-full justify-center gap-2 rounded-card bg-surface p-3.5 text-sm font-semibold text-danger tap"
        >
          <LogOut size={16} /> Sair
        </button>
      </Section>

      <footer className="mt-8 flex flex-col items-center gap-0.5 px-5 text-center text-[11px] text-muted-2">
        <span className="font-semibold">TATÁ PLUS · 2.0</span>
        <span>Desenvolvido por Victor Carvalho</span>
      </footer>
    </>
  )
}

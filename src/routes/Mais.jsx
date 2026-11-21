import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import {
  UserRound,
  Wrench,
  LogOut,
  ChevronRight,
  Camera,
  Loader2,
  Megaphone,
  ShieldCheck,
  MessageSquareWarning,
  Search,
  X,
  Check,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { ProgressRing } from '../components/ProgressRing.jsx'
import { PhotoCropper } from '../components/PhotoCropper.jsx'
import { SocialLinks } from '../components/SocialLinks.jsx'
import { redesSociais } from '../lib/mockData.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { useDesktop } from '../lib/useDesktop.js'
import { useDesktopCanvas } from '../lib/desktopCanvas.js'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

// No desktop estas rotas abrem no quadrante central em vez de navegar no painel.
const ROTA_CANVAS = { '/ouvidoria': 'ouvidoria' }

// A Navegação do "Mais" lista só o que NÃO está nas Sugestões da Home (sem duplicar).
// Tudo o que é atalho de Sugestões (Lojinha, Ranking, Agenda, Check-in, Kanban,
// Brainstorm, Cardápio, Documentos, Holerite, Organograma, Avaliações, Passatempos)
// foi tirado daqui.
const itens = [
  { to: '/jornada', label: 'Meu perfil', icon: UserRound },
  { to: '/buscar', label: 'Encontrar colegas', icon: Search },
  { to: '/comunicados', label: 'Comunicados', icon: Megaphone },
  { to: '/ouvidoria', label: 'Ouvidoria', icon: MessageSquareWarning },
  { to: '/manutencao', label: 'Ajustes gerais', icon: Wrench },
]

// Teto de segurança só pra barrar um arquivo absurdo antes de abrir no enquadrador;
// o recorte final sai como um JPEG pequeno, bem abaixo do limite do bucket.
const TAM_MAX = 25 * 1024 * 1024 // 25 MB

// Hora do build (injetada pelo Vite em vite.config.js) formatada em SP —
// ex.: "20/08 20:01". Serve como conferência rápida da versão no rodapé.
function versaoBuild() {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(__BUILD_TIME__))
  } catch {
    return '—'
  }
}

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

  const inputFoto = useRef(null)
  const cropperRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState('') // foto escolhida, aberta no enquadrador
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [saldo, setSaldo] = useState(null)
  const [progresso, setProgresso] = useState(null)

  // Nada gated aqui (os gated — Kanban/Brainstorm — vivem nas Sugestões).
  // "Meu perfil" fica fixo no topo; o resto segue em ordem alfabética.
  const navItens = (() => {
    const perfil = itens.find((i) => i.to === '/jornada')
    const resto = itens
      .filter((i) => i.to !== '/jornada')
      .sort((a, b) => a.label.localeCompare(b.label, 'pt', { sensitivity: 'base' }))
    return perfil ? [perfil, ...resto] : resto
  })()

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

  // 1) Só valida e abre o enquadrador. Nada de decodificar a foto em alta aqui —
  // o <img> do cropper mostra a imagem reduzida; o recorte pesado só acontece no
  // "Salvar", com o app já estável (evita o reload do PWA no iOS ao voltar do seletor).
  function escolherFoto(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !usuario?.matricula) return
    if (!f.type.startsWith('image/')) {
      setErro('Selecione uma imagem.')
      return
    }
    if (f.size > TAM_MAX) {
      setErro('Imagem muito grande (máx. 25 MB).')
      return
    }
    setErro('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
  }

  function fecharCropper() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setErro('')
  }

  // 2) Recorta o enquadramento (quadrado 512px, via o mesmo cropper do feed) e sobe.
  async function salvarFoto() {
    if (!usuario?.matricula || enviando) return
    tapHaptic()
    setErro('')
    setEnviando(true)
    const blob = await cropperRef.current?.getBlob()
    if (!blob) {
      setEnviando(false)
      setErro('Não foi possível preparar essa imagem. Tente outra foto.')
      return
    }
    const caminho = `${usuario.matricula}/${crypto.randomUUID()}.jpg`
    const { error: upErr } = await supabase.storage
      .from('avatares')
      .upload(caminho, blob, { cacheControl: '3600', contentType: 'image/jpeg' })
    if (upErr) {
      setEnviando(false)
      setErro('Não foi possível enviar a foto.')
      return
    }
    const url = supabase.storage.from('avatares').getPublicUrl(caminho).data.publicUrl
    const { error } = await definirAvatar(url)
    setEnviando(false)
    if (error) {
      setErro('Não foi possível salvar a foto.')
      return
    }
    fecharCropper()
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
              onChange={escolherFoto}
              // Sem isso, o click() programático no input "sobe" até o card da
              // carteira e dispara a navegação pra /carteira ao escolher a foto.
              onClick={(e) => e.stopPropagation()}
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

      <Section className="mt-5" title="Acesse">
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
              <span className="flex-1 text-sm font-semibold">Painel Admin</span>
              <ChevronRight size={16} className="text-carbon" />
            </button>
          ) : (
            <Link to="/admin" className="card hstack gap-3 px-4 py-3.5 tap">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
                <ShieldCheck size={18} />
              </div>
              <span className="flex-1 text-sm font-semibold">Painel Admin</span>
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
        <span>
          Desenvolvido por{' '}
          <Link
            to="/perfil/7"
            className="text-inherit transition-colors hover:text-accent"
            aria-label="Perfil de Victor Carvalho"
          >
            Victor Carvalho
          </Link>
        </span>
        <span className="mt-0.5 opacity-70">versão de {versaoBuild()}</span>
      </footer>

      {/* Enquadrador da foto de perfil (mesmo cropper do feed). Portal no body pra
          ficar por cima de tudo e fora de qualquer container transformado. */}
      {previewUrl &&
        createPortal(
          <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-5 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-surface p-4 shadow-xl">
              <div className="mb-3 text-center font-display text-base font-bold">Enquadre sua foto</div>
              <PhotoCropper ref={cropperRef} src={previewUrl} out={512} />
              {erro && <div className="mt-2 text-center text-[12px] font-medium text-danger">{erro}</div>}
              <div className="mt-4 hstack gap-2">
                <button
                  type="button"
                  onClick={fecharCropper}
                  disabled={enviando}
                  className="flex-1 hstack justify-center gap-1.5 rounded-pill bg-surface-2 py-2.5 text-sm font-bold text-text tap disabled:opacity-50"
                >
                  <X size={16} /> Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarFoto}
                  disabled={enviando}
                  className="flex-1 hstack justify-center gap-1.5 rounded-pill bg-accent py-2.5 text-sm font-bold text-black tap disabled:opacity-60"
                >
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {enviando ? 'Enviando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

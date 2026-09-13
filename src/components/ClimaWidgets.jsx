import { useEffect, useState } from 'react'
import { ArrowLeft, Lock, Hand } from 'lucide-react'
import { cn } from '../lib/cn'

// Widgets do desafio "Pesquisa de Clima" (Avaliações & Feedbacks).
//   [[whatsapp-clima]]  → a Sara envia o link pelo WhatsApp e a pessoa recebe
//   [[pagina-clima]]    → o link abre pesquisa.tatasushi.tech (visual da página real)
//   [[perguntas-clima]] → exemplos de perguntas com a escala 1 a 5 (Nada → Muito)

// Avatar real da Sara (RH), com fallback pra inicial se a foto não carregar.
const SARA_FOTO = 'https://aoqsbusfrffapjglpqjk.supabase.co/storage/v1/object/public/avatares/7272.jpg'
function SaraAvatar() {
  const [erro, setErro] = useState(false)
  if (erro) {
    return (
      <div className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">
        S
      </div>
    )
  }
  return (
    <img
      src={SARA_FOTO}
      alt="Sara"
      onError={() => setErro(true)}
      className="h-7 w-7 rounded-full object-cover"
    />
  )
}

// mãozinha de "toque" pulsando
function Toque({ className }) {
  return (
    <span className={cn('pointer-events-none absolute', className)}>
      <span className="absolute inset-0 -m-1 animate-ping rounded-full bg-accent/40" />
      <span className="relative grid h-6 w-6 place-items-center rounded-full bg-accent text-black shadow">
        <Hand size={13} />
      </span>
    </span>
  )
}

// ── 1. O convite chega no WhatsApp ───────────────────────────────────────────
function WhatsappClima() {
  const [step, setStep] = useState(0) // 0 digitando · 1 mensagem · 2 toque no link
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 1600)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">O convite chega no WhatsApp</p>
      <p className="mt-0.5 text-xs text-muted">A Sara, do Tatá, te manda o link:</p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        {/* cabeçalho do WhatsApp */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#075E54' }}>
          <ArrowLeft size={15} className="text-white/90" />
          <SaraAvatar />
          <div className="min-w-0 leading-tight">
            <div className="text-[13px] font-semibold text-white">Sara · Tatá</div>
            <div className="text-[10px] text-white/70">{step === 0 ? 'digitando…' : 'online'}</div>
          </div>
        </div>

        {/* corpo da conversa */}
        <div className="flex h-[132px] flex-col justify-end px-3 py-3" style={{ background: '#ECE5DD' }}>
          {step === 0 ? (
            <div className="w-fit rounded-lg rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9aa0a6]"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-[86%] rounded-lg rounded-tl-sm bg-white px-2.5 py-2 shadow-sm">
              <p className="text-[12px] leading-snug text-[#111]">
                Oi! 💚 Bora dar uma força? Responde a Pesquisa de Clima, é rapidinho e anônimo:
              </p>
              <div className="relative mt-1.5 rounded-md px-2 py-1.5" style={{ background: '#F1F1F1' }}>
                <span className="text-[12px] font-semibold" style={{ color: '#027EB5' }}>
                  pesquisa.tatasushi.tech
                </span>
                {step === 2 && <Toque className="-right-1 -top-2" />}
              </div>
              <div className="mt-1 text-right text-[9px] text-[#8a8a8a]">22:59 ✓✓</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 2. O link abre a página da pesquisa ──────────────────────────────────────
function PaginaClima() {
  const [step, setStep] = useState(0) // 0 carregando · 1..3 página
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 900)
    return () => clearInterval(t)
  }, [])
  const carregando = step === 0

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Ao tocar, abre a página</p>
      <p className="mt-0.5 text-xs text-muted">É segura, sem login e anônima:</p>

      <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: '#E2E2E2' }}>
        {/* barra do navegador */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ background: '#E7E7E8' }}>
          <span className="flex gap-1">
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <span key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />
            ))}
          </span>
          <div className="hstack flex-1 items-center gap-1 rounded-md bg-white px-2 py-1">
            <Lock size={10} style={{ color: '#1A5C2A' }} />
            <span className="truncate text-[10px]" style={{ color: '#555' }}>
              pesquisa.tatasushi.tech
            </span>
          </div>
        </div>

        {/* conteúdo da página (cores reais da pesquisa) */}
        <div className="h-[150px] px-3 py-3" style={{ background: '#F4F4F4' }}>
          {carregando ? (
            <div className="grid h-full place-items-center">
              <div className="h-1 w-24 overflow-hidden rounded-full" style={{ background: '#E2E2E2' }}>
                <div className="h-full w-1/3 animate-pulse rounded-full" style={{ background: '#35383F' }} />
              </div>
            </div>
          ) : (
            <div key={step} className="animate-page">
              <span
                className="inline-block rounded px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest"
                style={{ background: '#35383F', color: '#CFFF00' }}
              >
                PESQUISA DE CLIMA
              </span>
              <p className="mt-2 font-display text-[15px] font-extrabold leading-tight" style={{ color: '#111' }}>
                Como estão as coisas no TATÁ?
              </p>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: '#555' }}>
                Queremos ouvir sua opinião pra melhorar o dia a dia do TATÁ.
              </p>
              <span
                className="mt-2 inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold"
                style={{ background: '#EAF4ED', color: '#1A5C2A' }}
              >
                <Lock size={10} /> Confidencial e anônima
              </span>
              <div className="mt-2 h-1 w-10 rounded-full" style={{ background: '#CFFF00' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 3. Perguntas-modelo com a escala 1 a 5 (Nada → Muito) ────────────────────
const LABELS = ['Nada', '', '', '', 'Muito']
const EXEMPLOS = [
  'O quanto o ambiente de trabalho está colaborativo?',
  'O quanto você se sente respeitado(a) no ambiente de trabalho?',
  'O quanto você se sente apoiado(a) pelos colegas quando precisa de ajuda?',
]

function PerguntaLinha({ texto }) {
  const [sel, setSel] = useState(null)
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-3">
      <p className="text-[13px] leading-snug">{texto}</p>
      <div className="mt-2.5 flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSel(n)}
            aria-label={`${n}${LABELS[n - 1] ? ` · ${LABELS[n - 1]}` : ''}`}
            className={cn(
              'grid h-10 w-10 place-items-center rounded-xl border text-sm font-bold tap',
              sel === n ? 'border-accent bg-accent text-black' : 'border-line bg-surface-2 text-muted',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1.5 h-4 text-center text-[11px] font-semibold text-accent">
        {sel ? LABELS[sel - 1] : ''}
      </p>
    </div>
  )
}

function PerguntasClima() {
  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Como são as perguntas</p>
      <p className="mt-0.5 text-xs text-muted">Você responde de 1 a 5 — toque para experimentar:</p>
      <div className="mt-2 hstack justify-between text-[11px] font-medium text-muted-2">
        <span>1 Nada</span>
        <span>5 Muito</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {EXEMPLOS.map((t) => (
          <PerguntaLinha key={t} texto={t} />
        ))}
      </div>
    </div>
  )
}

// Dispatcher pelos tokens do conteúdo.
export function ClimaWidget({ tipo }) {
  if (tipo === 'whatsapp-clima') return <WhatsappClima />
  if (tipo === 'pagina-clima') return <PaginaClima />
  if (tipo === 'perguntas-clima') return <PerguntasClima />
  return null
}

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Lock, Hand, Video, Phone, MoreVertical, Link2, Home, Plus, ShieldCheck } from 'lucide-react'
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
// Reproduz o WhatsApp real da Sara (RH): identificação, prévia do link e a
// mensagem enviada — só sem o nome da pessoa (é genérico para qualquer colega).
function WhatsappClima() {
  const [step, setStep] = useState(0) // 0 digitando · 1 mensagem
  useEffect(() => {
    const t = setTimeout(() => setStep(1), 1300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">O convite chega no WhatsApp</p>
      <p className="mt-0.5 text-xs text-muted">A Sara, do Tatá, te manda o link:</p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        {/* cabeçalho — contato não salvo: aparece o número + identificação */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#202C33' }}>
          <ArrowLeft size={16} style={{ color: '#8696A0' }} />
          <SaraAvatar />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold" style={{ color: '#E9EDEF' }}>
              +55 11 94103-7811
            </div>
            <div className="truncate text-[10px]" style={{ color: '#8696A0' }}>
              ~ TATÁ SUSHI | Sara
            </div>
          </div>
          <Video size={16} style={{ color: '#8696A0' }} />
          <Phone size={15} style={{ color: '#8696A0' }} />
          <MoreVertical size={16} style={{ color: '#8696A0' }} />
        </div>

        {/* corpo da conversa */}
        <div
          className="flex min-h-[120px] flex-col justify-end gap-2 px-3 py-3"
          style={{ background: '#0B141A' }}
        >
          {step === 0 ? (
            <div className="w-fit rounded-lg rounded-tl-sm px-3 py-2.5" style={{ background: '#202C33' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ background: '#8696A0', animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              className="animate-page max-w-[92%] overflow-hidden rounded-lg rounded-tl-sm"
              style={{ background: '#202C33' }}
            >
              {/* prévia do link */}
              <div className="px-2 pt-2">
                <div className="rounded-md px-2.5 py-2" style={{ background: '#1B2831' }}>
                  <p className="text-[11px] font-bold" style={{ color: '#E9EDEF' }}>
                    Pesquisa de Clima — TATÁ Sushi
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug" style={{ color: '#8696A0' }}>
                    Queremos ouvir você! Rápida (menos de 1 min) e 100% anônima. 💚
                  </p>
                  <p className="mt-1 hstack items-center gap-1 text-[10px]" style={{ color: '#8696A0' }}>
                    <Link2 size={10} /> pesquisa.tatasushi.tech
                  </p>
                </div>
              </div>
              {/* texto da mensagem (sem o nome da pessoa) */}
              <div className="px-2.5 pb-1.5 pt-2 text-[12px] leading-snug" style={{ color: '#E9EDEF' }}>
                <p>Olá! Aqui é a Sara do TATÁ Sushi. 🍣</p>
                <p className="mt-2">
                  Estamos com a <strong className="font-semibold">Pesquisa de Clima</strong> e queremos
                  ouvir você — é rapidinha (menos de 1 min) e{' '}
                  <strong className="font-semibold">confidencial</strong>: o RH vê só os resultados do
                  grupo, nunca respostas individuais.
                </p>
                <p className="mt-2">O link expira em 24h:</p>
                <div className="relative mt-0.5 pr-6">
                  <span className="break-all underline" style={{ color: '#53BDEB' }}>
                    https://pesquisa.tatasushi.tech/?t=d82d7606-30ad-4838-b939-4862a2d1d9e5
                  </span>
                  <Toque className="-bottom-1 right-0" />
                </div>
                <p className="mt-1 text-right text-[9px]" style={{ color: '#8696A0' }}>
                  12:15
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 2. O link abre a página da pesquisa ──────────────────────────────────────
function PaginaClima() {
  const innerRef = useRef(null)
  useEffect(() => {
    const el = innerRef.current
    const outer = el?.parentElement
    if (!el || !outer) return
    let raf
    let y = 0
    let dir = 1
    let pause = 45
    const step = () => {
      const max = Math.max(0, el.offsetHeight - outer.clientHeight)
      if (pause > 0) {
        pause--
      } else {
        y += 0.8 * dir
        if (y >= max) {
          y = max
          dir = -1
          pause = 55
        } else if (y <= 0) {
          y = 0
          dir = 1
          pause = 55
        }
      }
      el.style.transform = `translateY(${-y}px)`
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="my-5 rounded-card border border-line bg-surface p-4">
      <p className="text-sm font-bold">Ao tocar, abre a página</p>
      <p className="mt-0.5 text-xs text-muted">É segura, sem login e anônima:</p>

      <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: '#2A2D33' }}>
        {/* barra do navegador (escura, estilo Chrome) */}
        <div className="flex items-center gap-2 px-2.5 py-1.5" style={{ background: '#202124' }}>
          <Home size={13} className="shrink-0 text-white/70" />
          <div className="hstack flex-1 items-center gap-1 rounded-full px-2 py-1" style={{ background: '#35363A' }}>
            <Lock size={9} className="text-white/60" />
            <span className="truncate text-[10px] text-white/80">pesquisa.tatasushi.tech/?t=db…</span>
          </div>
          <Plus size={13} className="shrink-0 text-white/70" />
          <span
            className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border text-[8px] font-bold text-white/70"
            style={{ borderColor: 'rgba(255,255,255,.45)' }}
          >
            3
          </span>
          <MoreVertical size={13} className="shrink-0 text-white/70" />
        </div>

        {/* página real (rola sozinha) */}
        <div className="relative h-[240px] overflow-hidden" style={{ background: '#35383F' }}>
          <div ref={innerRef} className="will-change-transform">
            {/* cabeçalho: logo oficial da página (hexágono + TATÁ SUSHI) */}
            <div className="flex justify-center px-4 pt-4">
              <img src="/icons/pesquisa-tata.png" alt="TATÁ SUSHI" className="h-24 w-auto" />
            </div>
            <p
              className="px-4 pt-2 text-center font-display text-2xl font-extrabold leading-none"
              style={{ color: '#CFFF00' }}
            >
              Pesquisa de Clima
            </p>

            {/* cartão: intro + como responder + confidencial */}
            <div className="mx-3 mt-4 rounded-2xl bg-white p-3">
              <p className="font-display text-[13px] font-extrabold" style={{ color: '#111' }}>
                Como estão as coisas no TATÁ?
              </p>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: '#555' }}>
                Queremos ouvir sua opinião sobre alguns temas para que possamos melhorar o dia a dia do
                TATÁ. Bora lá?
              </p>
              <div className="my-2.5 h-px" style={{ background: '#E2E2E2' }} />
              <p className="text-[12px] font-extrabold" style={{ color: '#111' }}>
                Como responder?
              </p>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: '#555' }}>
                Responda as perguntas escolhendo de 1 a 5, onde 1 é{' '}
                <strong style={{ color: '#111' }}>Nada</strong> (avaliação muito ruim) e 5 é{' '}
                <strong style={{ color: '#111' }}>Muito</strong> (avaliação muito boa).
              </p>
              <div
                className="mt-2.5 flex gap-2 rounded-lg px-2.5 py-2"
                style={{ background: '#F6FBDF', borderLeft: '3px solid #CFFF00' }}
              >
                <ShieldCheck size={13} className="mt-0.5 shrink-0" style={{ color: '#35383F' }} />
                <p className="text-[10px] leading-snug" style={{ color: '#3a3d33' }}>
                  <strong style={{ color: '#111' }}>Confidencial:</strong> o que você responder é sigiloso
                  e ninguém vê. No final, gera um resultado único, sem nome ou identificação.
                </p>
              </div>
            </div>

            {/* cartão: uma pergunta */}
            <div className="mx-3 mt-3 rounded-2xl bg-white p-3 pb-14">
              <p className="text-[12px] font-semibold leading-snug" style={{ color: '#111' }}>
                O quanto você percebe comportamentos alinhados aos valores do Tatá?
              </p>
              <div className="mt-2.5 flex justify-between gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="grid h-8 flex-1 place-items-center rounded-lg border text-[12px] font-bold"
                    style={{ borderColor: '#E2E2E2', color: '#555' }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* botão fixo de enviar (com degradê pra não sobrepor o texto) */}
          <div
            className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-8"
            style={{ background: 'linear-gradient(to top, #35383F 62%, rgba(53,56,63,0))' }}
          >
            <div
              className="grid place-items-center rounded-full py-2.5 text-[11px] font-extrabold uppercase tracking-wide"
              style={{ background: '#A6B62E', color: '#2b2f16' }}
            >
              ✓ Enviar respostas
            </div>
          </div>
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

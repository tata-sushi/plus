import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Check, ClipboardList, ChevronRight, Users } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { tapHaptic } from '../lib/haptics.js'
import { cn } from '../lib/cn'

// Escala de Percepção (1 Nada/Muito baixo → 5 Totalmente/Excelente).
const PERCEPCAO = [
  { v: 1, label: 'Nada' },
  { v: 2, label: 'Pouco' },
  { v: 3, label: 'Moderado' },
  { v: 4, label: 'Muito' },
  { v: 5, label: 'Totalmente' },
]

const tituloAvaliacao = (p) =>
  p === 1 ? 'Avaliação 1º período' : p === 2 ? 'Avaliação 2º período' : `Avaliação ${p}º período`

const introAvaliacao = (p) =>
  p === 2
    ? 'Bem-vindo(a) ao nosso sistema Avaliações & Feedback. Conta pra gente como está sendo sua experiência até aqui.'
    : 'Esse é seu primeiro contato com nosso sistema de Avaliações & Feedback. Conta pra gente como está sendo sua experiência até aqui. Suas respostas ajudam a melhorar nosso processo de integração.'

function dataCurta(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

// Uma pergunta de escala: 5 botões (Percepção).
function LinhaEscala({ item, valor, onEscolher }) {
  return (
    <div>
      <p className="text-sm leading-snug">{item.texto}</p>
      <div className="mt-2 flex justify-center gap-2">
        {PERCEPCAO.map(({ v }) => (
          <button
            key={v}
            onClick={() => {
              tapHaptic()
              onEscolher(item.id, v)
            }}
            aria-label={`${v} · ${PERCEPCAO[v - 1].label}`}
            className={cn(
              'h-11 w-11 rounded-xl border text-sm font-bold tap',
              valor === v
                ? 'border-accent bg-accent text-black'
                : 'border-line bg-surface text-text',
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

// Rótulos de frequência da Avaliação de liderança (mesma escala 1..5, só a
// legenda muda: 1 Raramente · 3 Às vezes · 5 Sempre).
const FREQUENCIA_LEGENDA = [
  { v: 1, label: 'Raramente' },
  { v: 3, label: 'Às vezes' },
  { v: 5, label: 'Sempre' },
]

export function MinhaExperiencia() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const ehAdmin = (usuario?.perfil || '').toLowerCase() === 'admin'
  const [pendentes, setPendentes] = useState(null) // null = carregando
  const [minhas, setMinhas] = useState([])
  const [respondendo, setRespondendo] = useState(null) // { periodo, form }
  const [respostas, setRespostas] = useState({})
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  // Avaliação de liderança (feedback ascendente) — entra na mesma lista "Para responder".
  const [lid, setLid] = useState(null)
  const [mantem, setMantem] = useState('')
  const [melhorar, setMelhorar] = useState('')

  const carregar = useCallback(async () => {
    const [{ data: p }, { data: m }, { data: l }] = await Promise.all([
      supabase.rpc('av_experiencia_colab_pendentes'),
      supabase.rpc('av_experiencia_colab_minhas'),
      supabase.rpc('av_lideranca_pendente'),
    ])
    setPendentes(p || [])
    setMinhas(m || [])
    setLid(l || { pendente: false })
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  function abrir(pend) {
    setRespostas({})
    setTexto('')
    setErro('')
    setRespondendo({ periodo: pend.periodo, form: pend.form })
    window.scrollTo(0, 0)
  }

  // Pré-visualização (admin): abre o formulário de um período sem gravar nada.
  async function abrirPreview(periodo) {
    const { data: form } = await supabase.rpc('av_experiencia_colab_form', { p_periodo: periodo })
    if (!form) return
    setRespostas({})
    setTexto('')
    setErro('')
    setRespondendo({ periodo, form, preview: true })
    window.scrollTo(0, 0)
  }

  const itens = respondendo?.form?.itens || []
  const escalas = useMemo(() => itens.filter((i) => i.tipo === 'escala'), [itens])
  const aberta = useMemo(() => itens.find((i) => i.tipo === 'aberta'), [itens])

  const respondidas = escalas.filter((i) => respostas[i.id]).length
  const completo = respondidas === escalas.length && escalas.length > 0

  async function enviar() {
    if (!completo || enviando) return
    tapHaptic()
    setEnviando(true)
    setErro('')
    const { data, error } = await supabase.rpc('av_experiencia_colab_salvar', {
      p_periodo: respondendo.periodo,
      p_respostas: respostas,
      p_texto: aberta ? texto.trim() || null : null,
    })
    setEnviando(false)
    if (error || !data) {
      setErro(error?.message || 'Não foi possível enviar agora. Tente de novo.')
      return
    }
    setRespondendo(null)
    carregar()
    window.scrollTo(0, 0)
  }

  // Avaliação de liderança: abre o form do líder-alvo (resolvido no servidor).
  async function abrirLid() {
    const { data: form } = await supabase.rpc('av_lideranca_form')
    if (!form) return
    setRespostas({})
    setMantem('')
    setMelhorar('')
    setErro('')
    setRespondendo({ tipo: 'lideranca', form, lider_nome: lid?.lider_nome })
    window.scrollTo(0, 0)
  }

  async function enviarLid() {
    if (!completo || enviando) return
    tapHaptic()
    setEnviando(true)
    setErro('')
    const { data, error } = await supabase.rpc('av_lideranca_salvar', {
      p_respostas: respostas, // só as 8 escala (1..5)
      p_mantem: mantem.trim() || null,
      p_melhorar: melhorar.trim() || null,
    })
    setEnviando(false)
    if (error || !data) {
      setErro(error?.message || 'Não foi possível enviar agora. Tente de novo.')
      return
    }
    setRespondendo(null)
    carregar()
    window.scrollTo(0, 0)
  }

  // ---------- FORMULÁRIO: LIDERANÇA (feedback ascendente, anônimo) ----------
  if (respondendo?.tipo === 'lideranca') {
    const aMantem = itens.find((i) => i.id === 'mantem')
    const aMelhorar = itens.find((i) => i.id === 'melhorar')
    return (
      <>
        <Header title="Avaliações" />
        <div className="px-5 pt-4">
          <button
            onClick={() => setRespondendo(null)}
            className="hstack gap-1 text-sm text-muted tap"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>

        <div className="mt-3 px-5">
          <h2 className="font-display text-base font-bold">Avaliar Liderança</h2>
          <p className="mt-0.5 text-xs text-muted">
            Avalie sua liderança{respondendo.lider_nome ? ` ${respondendo.lider_nome}` : ''} de forma
            totalmente anônima. Sua liderança não tem acesso às suas respostas.
          </p>

          {/* Legenda da escala (frequência, 1 a 5) */}
          <div className="mt-3 rounded-card border border-line bg-surface px-3 py-2 text-center">
            <div className="text-[11px] font-semibold text-muted">
              Responda de 1 a 5 com que frequência acontece
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-2">
              {FREQUENCIA_LEGENDA.map(({ v, label }) => (
                <span key={v}>
                  <b className="text-text">{v}</b> {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Section className="mt-5">
          <Card>
            <div className="flex flex-col gap-5">
              {escalas.map((item) => (
                <LinhaEscala
                  key={item.id}
                  item={item}
                  valor={respostas[item.id]}
                  onEscolher={(id, v) => setRespostas((r) => ({ ...r, [id]: v }))}
                />
              ))}
            </div>
          </Card>
        </Section>

        <Section className="mt-5" title="Para finalizar">
          <Card>
            {aMantem && (
              <div>
                <p className="text-sm leading-snug">{aMantem.texto}</p>
                <textarea
                  value={mantem}
                  onChange={(e) => setMantem(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="Escreva aqui (opcional)…"
                  className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-3.5 py-3 text-sm outline-none focus:border-accent"
                />
              </div>
            )}
            {aMelhorar && (
              <div className="mt-4">
                <p className="text-sm leading-snug">{aMelhorar.texto}</p>
                <textarea
                  value={melhorar}
                  onChange={(e) => setMelhorar(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="Escreva aqui (opcional)…"
                  className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-3.5 py-3 text-sm outline-none focus:border-accent"
                />
              </div>
            )}
          </Card>
        </Section>

        <div className="mt-5 px-5 pb-28">
          {erro && <p className="mb-2 text-xs font-medium text-danger">{erro}</p>}
          <button
            onClick={enviarLid}
            disabled={!completo || enviando}
            className="btn-primary w-full !py-3.5 text-sm disabled:opacity-50"
          >
            {enviando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : completo ? (
              <>
                <Check size={16} /> Enviar avaliação
              </>
            ) : (
              `Responda todas (${respondidas}/${escalas.length})`
            )}
          </button>
        </div>
      </>
    )
  }

  // ---------- FORMULÁRIO ----------
  if (respondendo) {
    return (
      <>
        <Header title="Avaliações" />
        <div className="px-5 pt-4">
          <button
            onClick={() => setRespondendo(null)}
            className="hstack gap-1 text-sm text-muted tap"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>

        <div className="mt-3 px-5">
          <h2 className="font-display text-base font-bold">
            {tituloAvaliacao(respondendo.periodo)}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{introAvaliacao(respondendo.periodo)}</p>
          {respondendo.preview && (
            <div className="mt-2 rounded-card border border-accent/40 bg-accent-soft px-3 py-2 text-xs font-semibold text-accent">
              Pré-visualização (admin) — nada será gravado.
            </div>
          )}

          {/* Legenda da escala */}
          <div className="mt-3 rounded-card border border-line bg-surface px-3 py-2 text-center">
            <div className="text-[11px] font-semibold text-muted">Escala</div>
            <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-2">
              {PERCEPCAO.map(({ v, label }) => (
                <span key={v}>
                  <b className="text-text">{v}</b> {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de perguntas (sem separar por dimensão) */}
        <Section className="mt-5">
          <Card>
            <div className="flex flex-col gap-5">
              {escalas.map((item) => (
                <LinhaEscala
                  key={item.id}
                  item={item}
                  valor={respostas[item.id]}
                  onEscolher={(id, v) => setRespostas((r) => ({ ...r, [id]: v }))}
                />
              ))}
            </div>
          </Card>
        </Section>

        {/* Pergunta aberta (60 dias) */}
        {aberta && (
          <Section className="mt-5" title="Para finalizar">
            <Card>
              <p className="text-sm leading-snug">{aberta.texto}</p>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, 1000))}
                rows={4}
                placeholder="Escreva aqui (opcional)…"
                className="mt-2 w-full resize-none rounded-card border border-line bg-surface px-3.5 py-3 text-sm outline-none focus:border-accent"
              />
              <div className="mt-1 text-right text-[11px] text-muted-2">{texto.length}/1000</div>
            </Card>
          </Section>
        )}

        <div className="mt-5 px-5 pb-28">
          {respondendo.preview ? (
            <button
              onClick={() => setRespondendo(null)}
              className="btn-ghost w-full !py-3.5 text-sm"
            >
              Sair da pré-visualização
            </button>
          ) : (
            <>
              {erro && <p className="mb-2 text-xs font-medium text-danger">{erro}</p>}
              <button
                onClick={enviar}
                disabled={!completo || enviando}
                className="btn-primary w-full !py-3.5 text-sm disabled:opacity-50"
              >
                {enviando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : completo ? (
                  <>
                    <Check size={16} /> Enviar avaliação
                  </>
                ) : (
                  `Responda todas (${respondidas}/${escalas.length})`
                )}
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  // ---------- LISTA (pendentes + histórico) ----------
  const carregando = pendentes === null
  const lidPendente = !!lid?.pendente && !lid?.ja_respondeu
  const lidRespondeu = !!lid?.ja_respondeu
  const vazio =
    !carregando &&
    pendentes.length === 0 &&
    minhas.length === 0 &&
    !ehAdmin &&
    !lidPendente &&
    !lidRespondeu

  return (
    <>
      <Header title="Avaliações" />
      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      {carregando ? (
        <div className="grid place-items-center py-16 text-muted-2">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <>
          {(pendentes.length > 0 || lidPendente) && (
            <Section className="mt-3" title="Para responder">
              <div className="flex flex-col gap-2">
                {pendentes.map((pend) => (
                  <button
                    key={pend.periodo}
                    onClick={() => abrir(pend)}
                    className="card hstack items-center gap-3 p-4 text-left tap"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                      <ClipboardList size={18} />
                    </span>
                    <div className="min-w-0 flex-1 text-sm font-semibold">
                      {tituloAvaliacao(pend.periodo)}
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-carbon" />
                  </button>
                ))}
                {lidPendente && (
                  <button
                    onClick={abrirLid}
                    className="card hstack items-center gap-3 p-4 text-left tap"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                      <Users size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">Avaliar Liderança</div>
                      <div className="text-[11px] text-muted">
                        {lid?.lider_nome || 'toque para responder'}
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-carbon" />
                  </button>
                )}
              </div>
            </Section>
          )}

          {(minhas.length > 0 || lidRespondeu) && (
            <Section className="mt-5" title="Respondidas">
              <Card className="!p-0">
                <div className="divide-y divide-line">
                  {minhas.map((m) => (
                    <div key={m.periodo} className="hstack items-center gap-3 px-4 py-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                        <Check size={15} />
                      </span>
                      <div className="min-w-0 flex-1 text-sm">
                        {tituloAvaliacao(m.periodo)}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-2">
                        {m.enviada_em ? `respondido em ${dataCurta(m.enviada_em)}` : 'respondido'}
                      </span>
                    </div>
                  ))}
                  {lidRespondeu && (
                    <div className="hstack items-center gap-3 px-4 py-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                        <Check size={15} />
                      </span>
                      <div className="min-w-0 flex-1 text-sm">Avaliar Liderança</div>
                      <span className="shrink-0 text-[11px] text-muted-2">
                        {lid?.respondido_em
                          ? `respondido em ${dataCurta(lid.respondido_em)}`
                          : 'respondida'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </Section>
          )}

          {ehAdmin && (
            <Section className="mt-5" title="Pré-visualização (admin)">
              <p className="mb-2 text-xs text-muted">
                Veja os formulários como o colaborador vê. Nada é gravado.
              </p>
              <div className="flex flex-col gap-2">
                {[1, 2].map((p) => (
                  <button
                    key={p}
                    onClick={() => abrirPreview(p)}
                    className="card hstack items-center gap-3 p-4 text-left tap"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                      <ClipboardList size={18} />
                    </span>
                    <div className="min-w-0 flex-1 text-sm font-semibold">{tituloAvaliacao(p)}</div>
                    <ChevronRight size={16} className="shrink-0 text-carbon" />
                  </button>
                ))}
              </div>
            </Section>
          )}

          {vazio && (
            <div className="px-8 py-16 text-center text-sm text-muted">
              Nenhuma avaliação de experiência no momento. Elas aparecem aqui aos 14 e 60 dias de
              casa. 🌱
            </div>
          )}
        </>
      )}
    </>
  )
}

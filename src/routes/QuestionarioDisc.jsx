import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { DISC, ORDEM, dominanteDe } from '../lib/disc.js'

// Desafio DISC no módulo Soft Skill (marca conclusão + 10 pts ao terminar).
const DISC_TREINO_ID = 'e3df3ef3-790a-45d7-8b49-de2f1d350936'

function Resultado({ resultado, onVoltar }) {
  const pont = resultado.pontuacoes || {}
  const total = ORDEM.reduce((s, k) => s + (Number(pont[k]) || 0), 0) || 1
  const dominante = dominanteDe(pont)
  const d = DISC[dominante]
  const rotulo = resultado.perfil
  const combinado = rotulo && rotulo.length === 2 && DISC[rotulo[1]]
  const equilibrado = rotulo === 'Equilibrado'

  return (
    <div className="px-5 pb-10 pt-4">
      <div className="grid place-items-center pt-4 text-center">
        <span
          className="grid h-20 w-20 place-items-center rounded-3xl font-display text-3xl font-bold text-white"
          style={{ background: d.cor }}
        >
          {dominante}
        </span>
        <div className="mt-3 text-sm text-muted">Seu perfil é</div>
        <div className="font-display text-xl font-bold">
          {equilibrado
            ? 'Equilibrado'
            : combinado
              ? `${DISC[rotulo[0]].nome} + ${DISC[rotulo[1]].nome}`
              : d.nome}
        </div>
        <p className="mt-2 max-w-sm text-sm text-muted">
          {equilibrado
            ? 'Suas quatro tendências apareceram de forma bem próxima — você transita bem entre elas.'
            : d.desc}
        </p>
      </div>

      <div className="mt-6 card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
          Distribuição
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          {ORDEM.map((k) => {
            const pct = Math.round(((Number(pont[k]) || 0) / total) * 100)
            return (
              <div key={k}>
                <div className="hstack justify-between text-xs font-semibold">
                  <span style={{ color: DISC[k].cor }}>{DISC[k].nome}</span>
                  <span className="text-muted">{pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: DISC[k].cor }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-2">
        Seu perfil fica salvo em <b>Minha jornada</b>. Não existe perfil certo ou errado — ele só
        mostra suas tendências.
      </p>

      <button onClick={onVoltar} className="btn-primary mt-5 w-full !py-3.5 text-sm">
        Concluir
      </button>
    </div>
  )
}

export function QuestionarioDisc() {
  const navigate = useNavigate()
  const [perguntas, setPerguntas] = useState(null) // null = carregando
  const [idx, setIdx] = useState(0)
  const [respostas, setRespostas] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    supabase.rpc('perfil_questionario', { p_instrumento: 'disc' }).then(({ data }) => {
      setPerguntas(data || [])
    })
  }, [])

  if (perguntas === null) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Loader2 size={24} className="animate-spin text-muted-2" />
      </div>
    )
  }

  if (resultado) {
    return (
      <>
        <div className="hstack items-center gap-2 px-5 pt-3">
          <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
        <Resultado resultado={resultado} onVoltar={() => navigate(-1)} />
      </>
    )
  }

  const total = perguntas.length
  const q = perguntas[idx]
  const escolhida = respostas[q.ordem]

  async function enviar(todas) {
    setEnviando(true)
    setErro('')
    const { data, error } = await supabase.rpc('responder_perfil_disc', { p_respostas: todas })
    if (error || !data) {
      setEnviando(false)
      setErro('Não foi possível enviar agora. Tente de novo.')
      return
    }
    // marca o desafio como concluído (pontos) — não bloqueia o resultado
    await supabase.rpc('concluir_treinamento', { p_treino: DISC_TREINO_ID }).catch(() => {})
    setEnviando(false)
    setResultado(data)
  }

  function escolher(opcaoId) {
    tapHaptic()
    const todas = { ...respostas, [q.ordem]: opcaoId }
    setRespostas(todas)
    if (idx + 1 < total) {
      setTimeout(() => setIdx((i) => i + 1), 160)
    } else {
      enviar(todas)
    }
  }

  if (enviando) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-8 text-center">
        <div>
          <Loader2 size={26} className="mx-auto animate-spin text-accent" />
          <div className="mt-3 text-sm text-muted">Calculando seu perfil…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* topo: voltar + progresso */}
      <div className="px-5 pt-3">
        <div className="hstack justify-between">
          <button
            onClick={() => (idx > 0 ? setIdx((i) => i - 1) : navigate(-1))}
            className="hstack gap-1 text-sm text-muted tap"
          >
            <ArrowLeft size={16} /> {idx > 0 ? 'Anterior' : 'Sair'}
          </button>
          <span className="text-xs font-semibold text-muted-2">
            {idx + 1} de {total}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* pergunta */}
      <div className="flex flex-1 flex-col px-5 pt-6">
        <h2 className="font-display text-lg font-bold leading-snug">{q.enunciado}</h2>
        <div className="mt-4 flex flex-col gap-2.5">
          {q.opcoes.map((o) => (
            <button
              key={o.id}
              onClick={() => escolher(o.id)}
              className={
                'rounded-card border px-4 py-3.5 text-left text-sm tap transition-colors ' +
                (escolhida === o.id
                  ? 'border-accent bg-accent-soft font-semibold text-accent'
                  : 'border-line bg-surface text-text')
              }
            >
              {o.texto}
            </button>
          ))}
        </div>

        {erro && (
          <div className="mt-4">
            <p className="text-center text-xs font-medium text-danger">{erro}</p>
            <button
              onClick={() => enviar(respostas)}
              className="btn-primary mt-2 w-full !py-3 text-sm"
            >
              <RotateCcw size={15} /> Tentar de novo
            </button>
          </div>
        )}

        <p className="mt-auto py-5 text-center text-[11px] text-muted-2">
          Escolha a alternativa que mais combina com você. Não há resposta certa ou errada.
        </p>
      </div>
    </div>
  )
}

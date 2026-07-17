import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'
import { DISC, ORDEM, dominanteDe } from '../lib/disc.js'

// Desafio DISC no módulo Soft Skill (marca conclusão + 10 pts ao terminar).
const DISC_TREINO_ID = 'e3df3ef3-790a-45d7-8b49-de2f1d350936'

// Corta a espera se a rede do celular engolir a resposta (evita travar em "Calculando").
function comTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ])
}

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
    try {
      const { data, error } = await comTimeout(
        supabase.rpc('responder_perfil_disc', { p_respostas: todas }),
        15000,
      )
      if (error) throw error
      if (data) {
        // mostra o resultado na hora; marcar o desafio (pontos) roda em segundo plano
        supabase.rpc('concluir_treinamento', { p_treino: DISC_TREINO_ID }).catch(() => {})
        setResultado(data)
        return
      }
      throw new Error('sem_dados')
    } catch {
      // a resposta pode ter se perdido no caminho mesmo tendo salvo — recupera o perfil salvo
      const { data: perfis } = await comTimeout(supabase.rpc('meu_perfil'), 10000).catch(() => ({
        data: null,
      }))
      const disc = (perfis || []).find((p) => p.instrumento === 'disc')
      if (disc) {
        setResultado({ perfil: disc.perfil, pontuacoes: disc.pontuacoes })
        return
      }
      setErro('Não foi possível calcular agora. Verifique sua conexão e toque novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // Seleciona a alternativa. NÃO avança sozinho — a pessoa usa o botão abaixo.
  function escolher(opcaoId) {
    tapHaptic()
    setRespostas((r) => ({ ...r, [q.ordem]: opcaoId }))
  }

  const ultima = idx + 1 >= total

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

      {/* pergunta + respostas + botão, tudo junto e centralizado na vertical */}
      <div className="flex flex-1 flex-col justify-center px-5 pb-8">
        <h2 className="font-display text-lg font-bold leading-snug">{q.enunciado}</h2>
        <div className="mt-5 flex flex-col gap-2.5">
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

        {erro && <p className="mt-4 text-center text-xs font-medium text-danger">{erro}</p>}

        <button
          onClick={() => (ultima ? enviar(respostas) : setIdx((i) => i + 1))}
          disabled={!escolhida}
          className="btn-primary mt-6 w-full !py-3.5 text-sm disabled:pointer-events-none disabled:opacity-40"
        >
          {ultima ? 'Ver meu perfil' : 'Próxima'}
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-2">
          Escolha a alternativa que mais combina com você. Não há resposta certa ou errada.
        </p>
      </div>
    </div>
  )
}

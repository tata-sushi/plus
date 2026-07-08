import { useState } from 'react'
import { Play, Filter, CheckCircle2, Route } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Tabs } from '../components/Tabs.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { ProgressBar } from '../components/ProgressBar.jsx'
import { ProgressRing } from '../components/ProgressRing.jsx'
import { treinamentos } from '../lib/mockData.js'

const abas = [
  { value: 'andamento', label: 'Em andamento' },
  { value: 'trilhas', label: 'Trilhas' },
  { value: 'concluidos', label: 'Concluídos' },
]

function TreinoRow({ t }) {
  const isCompleto = t.progresso >= 1
  return (
    <Card className="reveal mb-2">
      <div className="hstack justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{t.titulo}</div>
          <div className="text-xs text-muted">{t.trilha}</div>
          <div className="mt-2">
            <ProgressBar value={t.progresso} />
          </div>
        </div>
        {isCompleto ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <CheckCircle2 size={20} />
          </span>
        ) : (
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-black tap"
            aria-label="Continuar"
          >
            <Play size={16} fill="currentColor" />
          </button>
        )}
      </div>
    </Card>
  )
}

export function Treinamentos() {
  const [tab, setTab] = useState('andamento')
  const { progressoGeral, continueAssistindo, obrigatorios } = treinamentos

  const todos = [...continueAssistindo, ...obrigatorios]
  const emAndamento = obrigatorios.filter((t) => t.progresso < 1)
  const concluidos = todos.filter((t) => t.progresso >= 1)

  const trilhas = Object.values(
    todos.reduce((acc, t) => {
      const key = t.trilha
      acc[key] ??= { nome: key, cursos: 0, soma: 0 }
      acc[key].cursos += 1
      acc[key].soma += t.progresso
      return acc
    }, {}),
  ).map((tr) => ({ ...tr, media: tr.soma / tr.cursos }))

  return (
    <>
      <Header
        title="Treinamentos"
        right={
          <button className="grid h-9 w-9 place-items-center rounded-full bg-surface tap" aria-label="Filtrar">
            <Filter size={18} />
          </button>
        }
      />
      <Tabs tabs={abas} value={tab} onChange={setTab} />

      {tab === 'andamento' && (
        <>
          <Section className="reveal mt-2" title="Seu progresso geral">
            <Card>
              <div className="hstack gap-4">
                <ProgressRing
                  value={progressoGeral.percentual}
                  size={104}
                  stroke={9}
                  sublabel={`${progressoGeral.concluidos}/${progressoGeral.total}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-muted">
                    Você já concluiu{' '}
                    <span className="font-semibold text-text">
                      {progressoGeral.concluidos} de {progressoGeral.total}
                    </span>{' '}
                    treinamentos.
                  </div>
                  <button className="btn-ghost mt-3 !py-2 text-xs">Ver minha trilha</button>
                </div>
              </div>
            </Card>
          </Section>

          {continueAssistindo.length > 0 && (
            <Section className="reveal reveal-1 mt-5" title="Continue assistindo">
              {continueAssistindo.map((t) => (
                <TreinoRow key={t.id} t={t} />
              ))}
            </Section>
          )}

          <Section className="reveal reveal-2 mt-5" title="Treinamentos obrigatórios">
            {emAndamento.map((t) => (
              <TreinoRow key={t.id} t={t} />
            ))}
          </Section>
        </>
      )}

      {tab === 'trilhas' && (
        <Section className="mt-2" title="Trilhas de aprendizado">
          {trilhas.map((tr) => (
            <Card key={tr.nome} className="reveal mb-2">
              <div className="hstack gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Route size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{tr.nome}</div>
                  <div className="text-xs text-muted">
                    {tr.cursos} {tr.cursos === 1 ? 'curso' : 'cursos'}
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={tr.media} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </Section>
      )}

      {tab === 'concluidos' && (
        <Section className="mt-2" title="Concluídos">
          {concluidos.length > 0 ? (
            concluidos.map((t) => <TreinoRow key={t.id} t={t} />)
          ) : (
            <p className="mt-4 text-center text-sm text-muted">Nenhum treinamento concluído ainda.</p>
          )}
        </Section>
      )}
    </>
  )
}

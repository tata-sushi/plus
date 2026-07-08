import { Play, Filter } from 'lucide-react'
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
    <Card className="mb-2">
      <div className="hstack justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{t.titulo}</div>
          <div className="text-xs text-muted">{t.trilha}</div>
          <div className="mt-2">
            <ProgressBar value={t.progresso} />
          </div>
        </div>
        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-black tap"
          aria-label={isCompleto ? 'Rever' : 'Continuar'}
        >
          <Play size={16} fill="currentColor" />
        </button>
      </div>
    </Card>
  )
}

export function Treinamentos() {
  const { progressoGeral, continueAssistindo, obrigatorios } = treinamentos
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
      <Tabs tabs={abas} defaultValue="andamento" />

      {/* Progresso geral */}
      <Section className="mt-2" title="Seu progresso geral">
        <Card>
          <div className="hstack justify-between gap-4">
            <ProgressRing
              value={progressoGeral.percentual}
              sublabel={`${progressoGeral.concluidos}/${progressoGeral.total} conclusões`}
            />
            <div className="min-w-0 flex-1 text-right">
              <button className="btn-ghost text-sm">Ver minha trilha</button>
            </div>
          </div>
        </Card>
      </Section>

      {continueAssistindo.length > 0 && (
        <Section className="mt-5" title="Continue assistindo">
          {continueAssistindo.map((t) => (
            <TreinoRow key={t.id} t={t} />
          ))}
        </Section>
      )}

      <Section className="mt-5" title="Treinamentos obrigatórios">
        {obrigatorios.map((t) => (
          <TreinoRow key={t.id} t={t} />
        ))}
      </Section>
    </>
  )
}

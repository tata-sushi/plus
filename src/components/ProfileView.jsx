import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, X, Loader2 } from 'lucide-react'
import { Header } from './Header.jsx'
import { Voltar } from './Voltar.jsx'
import { Section } from './Section.jsx'
import { Card } from './Card.jsx'
import { Avatar } from './Avatar.jsx'
import { ProgressRing } from './ProgressRing.jsx'
import { MeuPerfil } from './MeuPerfil.jsx'
import { RestricoesAlimentares } from './RestricoesAlimentares.jsx'
import { Conquistas } from './Conquistas.jsx'
import { RadarChart } from './RadarChart.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

// DEMO (dados fake) — radar de feedback líder × liderado. Temporário, só p/ visual.
const RADAR_EIXOS = ['Comunicação', 'Colaboração', 'Proatividade', 'Organização', 'Técnica', 'Liderança']
const RADAR_SERIES = [
  { label: 'Feedback do líder', color: '#4ade80', values: [4, 5, 3, 4, 4, 5] },
  { label: 'Autoavaliação (liderado)', color: '#a78bfa', values: [5, 4, 4, 3, 5, 4] },
]

export function ProfileView({ colaborador, isSelf }) {
  const { usuario } = useAuth()
  // Demo do radar só no meu usuário (matrícula 7), sem afetar os outros.
  const demoRadar = isSelf && usuario?.matricula === '7'
  const ehDev = usuario?.matricula === '7' // perfil do dev → tema dourado
  // Resumo real: saldo, resgates e progresso de desafios.
  const [resumo, setResumo] = useState(null)
  // Lista dos desafios que o próprio já concluiu (só na Minha Jornada).
  const [concluidos, setConcluidos] = useState(null)
  // Foto ampliada (lightbox) ao tocar no avatar, quando há foto de verdade.
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    if (!isSelf) return
    let ativo = true
    supabase.rpc('meu_resumo').then(({ data }) => {
      if (ativo) setResumo(data || null)
    })
    supabase.rpc('meus_desafios_concluidos').then(({ data }) => {
      if (ativo) setConcluidos(data || [])
    })
    return () => {
      ativo = false
    }
  }, [isSelf])

  const feitos = resumo?.desafios_feitos ?? 0
  const total = resumo?.desafios_total ?? 0
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0

  return (
    <div className={ehDev ? 'tema-dev' : undefined}>
      <Header title={isSelf ? 'Minha Jornada' : colaborador.nome} />
      {isSelf && <Voltar />}

      {/* Card de identificação — mesmo padrão da página Mais */}
      <div className="px-5 pt-2">
        <div className="card p-4">
          <div className="hstack gap-3">
            {colaborador.avatar ? (
              <button
                type="button"
                onClick={() => setZoom(true)}
                aria-label="Ampliar foto"
                className="shrink-0 rounded-full tap"
              >
                <Avatar name={colaborador.nome} src={colaborador.avatar} size={52} />
              </button>
            ) : (
              <Avatar name={colaborador.nome} src={colaborador.avatar} size={52} />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-bold">{colaborador.nome}</div>
              <div className="text-xs text-muted">
                {colaborador.cargo}
                {colaborador.loja ? ` · ${colaborador.loja}` : ''}
              </div>
              <div className="mt-1 text-xs">
                <span className="text-muted">Carteira · </span>
                <span className="font-semibold text-accent">
                  {resumo == null
                    ? '—'
                    : `${Number(resumo.saldo || 0).toLocaleString('pt-BR')} pts`}
                </span>
              </div>
            </div>
            <ProgressRing value={pct / 100} size={54} stroke={5} />
          </div>
        </div>
      </div>

      {/* Conquistas — logo abaixo da identificação */}
      {isSelf && <Conquistas />}

      {/* Meu perfil (Signo · DISC · em breve) */}
      {isSelf && <MeuPerfil />}

      {/* Restrições alimentares */}
      {isSelf && <RestricoesAlimentares />}

      {/* Indicadores — formato tabela */}
      <Section className="reveal reveal-2 mt-5" title="Indicadores">
        <div className="card overflow-hidden">
          <div className="hstack justify-between px-4 py-3">
            <span className="text-sm text-muted">Desafios realizados</span>
            <span className="text-sm font-bold">
              {feitos}/{total}
            </span>
          </div>
          <div className="hstack justify-between border-t border-line px-4 py-3">
            <span className="text-sm text-muted">Recompensas resgatadas</span>
            <span className="text-sm font-bold">{resumo?.resgates ?? 0}</span>
          </div>
        </div>
      </Section>

      {/* DEMO — radar de feedback (dados fake, só no meu usuário) — abaixo dos Indicadores */}
      {demoRadar && (
        <Section className="reveal reveal-3 mt-5" title="Feedback 360º (demo)">
          <Card className="p-4">
            <RadarChart axes={RADAR_EIXOS} series={RADAR_SERIES} max={5} size={280} />
            <p className="mt-3 text-center text-[11px] text-muted-2">
              Dados de exemplo — visualização do gráfico.
            </p>
          </Card>
        </Section>
      )}

      {/* Ações — em breve */}
      {isSelf && (
        <Section className="reveal reveal-3 mt-5" title="Ações">
          <Card className="hstack gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted-2">
              <Clock size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Em breve</div>
              <div className="text-xs text-muted">Novas ações chegando por aqui.</div>
            </div>
          </Card>
        </Section>
      )}

      {/* Desafios realizados — última seção: lista dos que o próprio concluiu (histórico) */}
      {isSelf && (
        <Section
          className="reveal reveal-3 mt-5"
          title="Desafios realizados"
          action={
            concluidos != null && (
              <span className="text-xs font-semibold text-muted">{concluidos.length}</span>
            )
          }
        >
          {concluidos == null ? (
            <Card className="hstack justify-center py-6 text-muted-2">
              <Loader2 size={20} className="animate-spin" />
            </Card>
          ) : concluidos.length === 0 ? (
            <Card className="py-6 text-center text-sm text-muted">
              Você ainda não concluiu nenhum desafio.
            </Card>
          ) : (
            <div className="card overflow-hidden">
              {concluidos.map((d, i) => (
                <div
                  key={d.id}
                  className={cn('hstack items-center gap-3 px-4 py-3', i > 0 && 'border-t border-line')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.titulo}</div>
                    <div className="truncate text-[11px] text-muted-2">
                      {d.trilha}
                      {d.concluido_em
                        ? ` · ${new Date(d.concluido_em).toLocaleDateString('pt-BR')}`
                        : ''}
                    </div>
                  </div>
                  {d.pontos > 0 && (
                    <span className="shrink-0 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                      +{d.pontos}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Foto ampliada — portal no body pra ficar fixa na tela toda (fora do
          contexto da página animada). Toca fora ou no X pra fechar. */}
      {zoom &&
        colaborador.avatar &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={() => setZoom(false)}
          >
            <img
              src={colaborador.avatar}
              alt={colaborador.nome}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85dvh] max-w-full rounded-3xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setZoom(false)}
              aria-label="Fechar"
              className="absolute right-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur tap"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
            >
              <X size={18} />
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}

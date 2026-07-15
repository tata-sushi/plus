import { useState } from 'react'
import {
  ChevronDown,
  Lock,
  Check,
  X,
  Play,
  CheckCircle2,
  Star,
  CalendarDays,
  Calendar,
  PartyPopper,
  Gift,
  Ban,
  Info,
} from 'lucide-react'
import { cn } from '../lib/cn'

// rótulo curto do tempo de casa: 6 → "6 meses", 12 → "1 ano", 24 → "2 anos"…
const tempoLabel = (m) =>
  m == null ? '' : m < 12 ? `${m} meses` : `${m / 12} ${m / 12 === 1 ? 'ano' : 'anos'}`

// competência (folha 21→20) = mês de início do período (2 meses antes da janela).
// Ex.: janela abre 01/08 (período 21/06–20/07) → competência 06/2026.
function competencia(di) {
  if (!di) return ''
  const d = new Date(`${di}T00:00:00`)
  d.setDate(1)
  d.setMonth(d.getMonth() - 2)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Regras completas da série (sem datas — valem pra todos os meses). Ficam no topo
// da bancada, sempre acessíveis, para que cada mês possa ter um texto curtinho.
const COMO_FUNCIONA = {
  '100% de Presença': `
    <p>Sua pontualidade e comprometimento valem muito e aqui no TATÁ Plus valem pontos! Todo mês em que você tiver <strong>100% de presença</strong> (presença por dias trabalhados), você ganha <strong>100 pontos extras</strong>. Sem sorteio, sem mistério e sem enrolação!</p>
    <p><strong>Como funciona:</strong></p>
    <ul>
      <li>O desafio é liberado <strong>todo mês, após o fechamento do mês</strong>, sempre com o período de <strong>21 a 20</strong>. <em>Ex.: a competência de maio vai de 21/05 a 20/06.</em></li>
      <li>Cada competência fica aberta <strong>do dia 01 ao dia 10</strong> do mês seguinte ao fechamento. Depois disso, fecha. <em>Ex.: a competência de maio fica disponível de 01/07 a 10/07.</em></li>
      <li>No aplicativo RHiD, confira seu cartão de ponto, assine, tire um print e anexe aqui no desafio do respectivo mês.</li>
      <li>Os pontos são liberados só para cartões <strong>assinados, sem faltas ou atestados</strong> no período. <em>Ex.: 1 falta já tira a pontuação daquela competência.</em></li>
    </ul>
  `,
}

// Submódulo dentro de uma trilha (ex.: dentro de "Especiais"). Recolhível.
// Série mensal de envio (ex.: 100% de Presença) → bancada de calendários (mês/ano),
// no estilo do TATÁ NEWS. Demais → lista simples de desafios.
export function Submodulo({ nome, itens, onAbrir, admin = false }) {
  const [aberto, setAberto] = useState(false)
  const [sobre, setSobre] = useState(false)
  const ehSerie = itens.length > 0 && itens.every((i) => i.tipo === 'envio')
  const ehRec = itens.length > 0 && itens.every((i) => i.tipo === 'reconhecimento')
  const feitos = itens.filter((i) => i.concluido).length
  const temAcao =
    itens.some((i) => i.janela_estado === 'aberto' && !i.concluido) ||
    itens.some((i) => i.estado_reconhecimento === 'disponivel')
  const HeaderIcon = ehSerie ? CalendarDays : PartyPopper
  // o ativo (aberto / disponível) vem primeiro; o resto mantém a sequência (sort estável)
  const ativo = (i) =>
    (i.janela_estado === 'aberto' && !i.concluido) || i.estado_reconhecimento === 'disponivel'
      ? 1
      : 0
  const itensOrdenados = [...itens].sort((a, b) => ativo(b) - ativo(a))

  return (
    <div className="border-t border-line">
      <button
        onClick={() => setAberto((a) => !a)}
        className="hstack w-full gap-3 px-4 py-3 text-left tap"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <HeaderIcon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{nome}</span>
          <span className="text-[11px] text-muted-2">
            {feitos}/{itens.length} {ehRec ? 'resgatados' : 'concluídos'}
            {temAcao ? ' · disponível' : ''}
          </span>
        </span>
        {temAcao && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-muted transition-transform', aberto && 'rotate-180')}
        />
      </button>

      {/* Série mensal → bancada de calendários (mês/ano) */}
      {aberto && ehSerie && (
        <div className="bg-surface-2/40">
          {COMO_FUNCIONA[nome] && (
            <div className="border-b border-line/60">
              <button
                onClick={() => setSobre((s) => !s)}
                className="hstack w-full gap-2 px-4 py-2.5 text-left tap"
              >
                <Info size={14} className="shrink-0 text-muted" />
                <span className="flex-1 text-xs font-semibold text-muted">Como funciona</span>
                <ChevronDown
                  size={14}
                  className={cn('shrink-0 text-muted transition-transform', sobre && 'rotate-180')}
                />
              </button>
              {sobre && (
                <div
                  className="conteudo px-4 pb-4 text-[13px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: COMO_FUNCIONA[nome] }}
                />
              )}
            </div>
          )}
          <div className="grid grid-cols-4 gap-3 p-4">
            {itensOrdenados.map((item) => {
            const concl = item.concluido
            const estado = concl ? 'concluido' : item.janela_estado
            const abertoAgora = estado === 'aberto' // atual → citric marcante, sem selo
            const pode = abertoAgora || concl || admin
            // já passou (pegou ou não) = segundo verde · aberto = citric · futuro = cinza
            const jaPassou = concl || estado === 'encerrado'
            const corIcone = jaPassou ? 'text-accent-dim' : abertoAgora ? 'text-accent' : 'text-muted-2'
            const recuar = estado === 'em_breve' && !admin // futuro recua um pouco
            return (
              <button
                key={item.id}
                onClick={() => pode && onAbrir(item)}
                disabled={!pode}
                aria-label={`Presença ${competencia(item.data_inicio)}`}
                className="flex flex-col items-center gap-1 py-1.5 tap"
              >
                {/* ícone + selo encostado no canto (modelo TATÁ NEWS) */}
                <span className="relative">
                  <span className={cn('block', corIcone, recuar && 'opacity-50')}>
                    <Calendar size={23} strokeWidth={1.5} />
                  </span>
                  {/* V = pegou → check vazado citric */}
                  {concl && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-accent-soft text-accent-dim">
                      <Check size={9} strokeWidth={2.5} />
                    </span>
                  )}
                  {/* X = não pegou → citric */}
                  {estado === 'encerrado' && (
                    <span className="absolute -right-1.5 -top-1.5 text-accent">
                      <X size={11} strokeWidth={2.5} />
                    </span>
                  )}
                  {/* cadeado = próximos, ainda fechados → cinza */}
                  {estado === 'em_breve' && (
                    <span className="absolute -right-1.5 -top-1.5 text-muted-2">
                      <Lock size={10} />
                    </span>
                  )}
                </span>
                <span className={cn('text-[10.5px] font-semibold', corIcone, recuar && 'opacity-50')}>
                  {competencia(item.data_inicio)}
                </span>
              </button>
            )
          })}
          </div>
        </div>
      )}

      {/* Reconhecimento por tempo de casa → bancada de presentinhos */}
      {aberto && ehRec && (
        <div className="grid grid-cols-4 gap-3 border-t border-line bg-surface-2/40 p-4">
          {itensOrdenados.map((item) => {
            const est = item.estado_reconhecimento
            // realizado/já passou = segundo verde · disponível (liberado) = citric · futuro = cinza
            const corRec =
              est === 'resgatado' || est === 'ja_passou'
                ? 'text-accent-dim'
                : est === 'disponivel'
                  ? 'text-accent'
                  : 'text-muted-2'
            const recuarRec = est === 'bloqueado' // futuro recua
            return (
              <button
                key={item.id}
                onClick={() => onAbrir(item)}
                aria-label={tempoLabel(item.tempo_casa_meses)}
                className="flex flex-col items-center gap-1 py-1.5 tap"
              >
                {/* ícone + selo encostado no canto (modelo TATÁ NEWS) */}
                <span className="relative">
                  <span className={cn('block', corRec, recuarRec && 'opacity-50')}>
                    <Gift size={24} strokeWidth={1.6} />
                  </span>
                  {/* resgatado → check vazado citric */}
                  {est === 'resgatado' && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-accent-soft text-accent-dim">
                      <Check size={9} strokeWidth={2.5} />
                    </span>
                  )}
                  {/* já passou (comemorado antes do programa) → segundo verde */}
                  {est === 'ja_passou' && (
                    <span className="absolute -right-1.5 -top-1.5 text-accent-dim">
                      <Ban size={11} />
                    </span>
                  )}
                  {/* futuro, ainda bloqueado → cinza */}
                  {est === 'bloqueado' && (
                    <span className="absolute -right-1.5 -top-1.5 text-muted-2">
                      <Lock size={10} />
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'text-center text-[10.5px] font-semibold leading-tight',
                    corRec,
                    recuarRec && 'opacity-50',
                  )}
                >
                  {tempoLabel(item.tempo_casa_meses)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Demais → lista simples de desafios */}
      {aberto && !ehSerie && !ehRec && (
        <div>
          {itens.map((item) => {
            const bloqueado = !item.liberado && !item.concluido
            return (
              <button
                key={item.id}
                onClick={() => onAbrir(item)}
                disabled={bloqueado && !admin}
                className={cn(
                  'hstack w-full gap-3 border-t border-line bg-surface-2/40 py-2.5 pl-7 pr-4 text-left tap',
                  bloqueado && 'opacity-55',
                )}
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full',
                    item.concluido
                      ? 'bg-accent-soft text-accent'
                      : bloqueado
                        ? 'bg-surface-2 text-muted-2'
                        : 'bg-accent text-black',
                  )}
                >
                  {item.concluido ? (
                    <CheckCircle2 size={14} />
                  ) : bloqueado ? (
                    <Lock size={12} />
                  ) : (
                    <Play size={12} fill="currentColor" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.titulo}</span>
                </span>
                {item.pontos > 0 && (
                  <span className="hstack shrink-0 gap-1 text-[11px] font-semibold text-muted">
                    <Star size={11} /> {item.pontos}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

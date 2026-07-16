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
  UserPlus,
  HeartPulse,
  ClipboardList,
} from 'lucide-react'
import { cn } from '../lib/cn'

// rótulo curto do tempo de casa: 6 → "6 meses", 12 → "1 ano", 24 → "2 anos"…
const tempoLabel = (m) =>
  m == null ? '' : m < 12 ? `${m} meses` : `${m / 12} ${m / 12 === 1 ? 'ano' : 'anos'}`

// competência (folha 21→20) = mês de fechamento do período (1 mês antes da janela).
// Ex.: janela abre 01/07 (período 21/05–20/06) → competência 06/2026.
function competencia(di) {
  if (!di) return ''
  const d = new Date(`${di}T00:00:00`)
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Regras completas da série (sem datas — valem pra todos os meses). Ficam no topo
// da bancada, sempre acessíveis, para que cada mês possa ter um texto curtinho.
const COMO_FUNCIONA = {
  '100% de Presença': `
    <p>Sua pontualidade e seu comprometimento valem muito. E, aqui no TATÁ Plus, também valem pontos!</p>
    <p>Todo mês em que você tiver <strong>100% de presença</strong>, considerando os dias trabalhados, você ganha <strong>100 pontos extras</strong>.</p>
    <p>Sem sorteio, sem mistério e sem enrolação!</p>
    <p><strong>Como funciona</strong></p>
    <p>O desafio é liberado todos os meses, após o fechamento da competência, considerando sempre o período do dia <strong>21 ao dia 20</strong>.</p>
    <p><em>Exemplo: a competência de maio corresponde ao período de 21/05 a 20/06.</em></p>
    <p>Cada competência fica disponível do dia <strong>01 ao dia 10</strong> do mês seguinte ao fechamento. Depois desse período, o desafio é encerrado.</p>
    <p><em>Exemplo: a competência de maio fica disponível de 01/07 a 10/07.</em></p>
    <p>No aplicativo RHiD, confira seu cartão de ponto, assine, tire um print e anexe aqui no desafio do respectivo mês.</p>
    <p>Os pontos são liberados somente para cartões <strong>assinados e sem faltas ou atestados</strong> no período.</p>
    <p><em>Exemplo: uma falta já impede o recebimento da pontuação daquela competência.</em></p>
  `,
  'Aniversário de Empresa': `
    <p>Celebrar o tempo de casa é reconhecer a história construída por cada colaborador e reforçar o sentimento de pertencimento no TATÁ.</p>
    <p>O Aniversário de Empresa é um gesto de reconhecimento pela dedicação, constância e contribuição de cada pessoa para o crescimento coletivo.</p>
    <p><strong>Como funciona</strong></p>
    <p>A cada ciclo de tempo de empresa, o colaborador é homenageado de forma especial.</p>
    <p>Os reconhecimentos variam conforme o tempo de casa e representam o crescimento e a evolução de cada pessoa dentro do TATÁ.</p>
    <p><strong>Critérios de elegibilidade</strong></p>
    <p>Para participar do benefício, o colaborador deve ter, no mínimo, <strong>6 meses de empresa</strong>.</p>
    <p><strong>Programação</strong></p>
    <p>O programa terá início em 2026, com o reconhecimento dos colaboradores nos níveis correspondentes.</p>
    <p><strong>Contagem a partir da implantação</strong></p>
    <p>A premiação por tempo de casa passa a contar a partir da data de implantação do programa.</p>
    <p>Os períodos anteriores não serão considerados de forma retroativa.</p>
  `,
  'Indicação Premiada': `
    <p>Você já conhece o nosso programa de <strong>Indicação Premiada</strong>, no qual a sua contribuição pode valer muito mais do que você imagina?</p>
    <p>Sabemos o quanto a equipe é fundamental para o sucesso do TATÁ. Por isso, incentivamos e recompensamos quem nos ajuda a trazer novos talentos que vêm para somar.</p>
    <p><strong>Como participar</strong></p>
    <p>É simples: se você conhece alguém com o perfil para trabalhar conosco, indique essa pessoa.</p>
    <p>Se ela for contratada e efetivada após o período de experiência, você ganha um prêmio de <strong>R$ 80,00</strong>.</p>
    <p>Mas não é só isso. Você também estará ajudando a fortalecer nossa equipe, trazendo novas ideias e energia para o nosso ambiente de trabalho e tornando-o cada vez melhor.</p>
    <p>Todos são essenciais para o crescimento e o desenvolvimento do TATÁ, e queremos recompensar o seu compromisso em nos ajudar a encontrar os melhores talentos do mercado.</p>
    <p>Então, pense em pessoas talentosas que você conhece, que possam contribuir com a nossa equipe, e faça a sua indicação.</p>
    <p><strong>Como fazer</strong></p>
    <p><strong>1º</strong> Se você tem uma indicação, solicite o currículo dessa pessoa e anexe no campo abaixo.</p>
    <p><strong>2º</strong> Aguarde o TATÁ entrar em contato com a pessoa indicada para agendar a entrevista e os testes.</p>
    <p><strong>3º</strong> Se a sua indicação for contratada, você deverá aguardar o período de adaptação e experiência.</p>
    <p><strong>4º</strong> Ao término do período de experiência, no caso de efetivação, seu prêmio estará disponível para resgate aqui no TATÁ Plus.</p>
    <p>Contamos com você!</p>
  `,
  'Saúde em Dia': `
    <p>{{user.first_name}}, mantenha seu <strong>exame periódico (ASO)</strong> em dia e ganhe pontos a cada novo exame!</p>
    <p><strong>Como funciona</strong></p>
    <p>Anexe o ASO no desafio aberto.</p>
    <p>Após a validação da área de Gente &amp; Gestão (RH), os pontos serão adicionados à sua carteira.</p>
    <p>O próximo desafio será aberto depois que o anterior for aprovado. A cada novo exame, você poderá resgatar os pontos novamente.</p>
    <p>Serão disponibilizados até <strong>10 desafios</strong> ao longo do tempo.</p>
  `,
}

// ícone de cada série sequencial (bancada de "vagas" que liberam uma a uma)
const SERIE_ICON = {
  'Indicação Premiada': UserPlus,
  'Saúde em Dia': HeartPulse,
}

// Submódulo dentro de uma trilha (ex.: dentro de "Especiais"). Recolhível.
// Série mensal de envio (ex.: 100% de Presença) → bancada de calendários (mês/ano),
// no estilo do TATÁ NEWS. Demais → lista simples de desafios.
export function Submodulo({ nome, itens, onAbrir, admin = false, personalizar = (h) => h }) {
  const [aberto, setAberto] = useState(false)
  const [sobre, setSobre] = useState(false)
  const ehSerie = itens.length > 0 && itens.every((i) => i.tipo === 'envio')
  const ehRec = itens.length > 0 && itens.every((i) => i.tipo === 'reconhecimento')
  // série sequencial (Indicação, Saúde): "vagas" que liberam uma a uma, sem janela de
  // data. Presença é série mensal (tem data_inicio) — é o que distingue as duas.
  const ehSeq = ehSerie && itens.every((i) => !i.data_inicio)
  const ehMensal = ehSerie && !ehSeq
  const feitos = itens.filter((i) => i.concluido).length
  const temAcao =
    itens.some((i) => i.janela_estado === 'aberto' && !i.concluido) ||
    itens.some((i) => i.estado_reconhecimento === 'disponivel')
  const HeaderIcon = ehMensal ? CalendarDays : ehSeq ? SERIE_ICON[nome] || ClipboardList : PartyPopper
  // o ativo (aberto / disponível) vem primeiro; o resto mantém a sequência (sort estável)
  const ativo = (i) =>
    (i.janela_estado === 'aberto' && !i.concluido) || i.estado_reconhecimento === 'disponivel'
      ? 1
      : 0
  const itensOrdenados = [...itens].sort((a, b) => ativo(b) - ativo(a))
  // série sequencial mantém a ordem natural das vagas (1 → 10), como uma trilha de progresso
  const itensSeq = [...itens].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))

  // "Como funciona" recolhível no topo da bancada (regras completas, sempre acessível)
  const comoFunciona = COMO_FUNCIONA[nome] ? (
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
          dangerouslySetInnerHTML={{ __html: personalizar(COMO_FUNCIONA[nome]) }}
        />
      )}
    </div>
  ) : null

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
      {aberto && ehMensal && (
        <div className="bg-surface-2/40">
          {comoFunciona}
          <div className="grid grid-cols-4 gap-3 p-4">
            {itensOrdenados.map((item) => {
            const concl = item.concluido
            const estado = concl ? 'concluido' : item.janela_estado
            const abertoAgora = estado === 'aberto'
            const pode = abertoAgora || concl || admin
            // já passou (pegou/não) = chip verde escuro + citric · aberto = citric fill · futuro = cinza
            const jaPassou = concl || estado === 'encerrado'
            return (
              <button
                key={item.id}
                onClick={() => pode && onAbrir(item)}
                disabled={!pode}
                aria-label={`Presença ${competencia(item.data_inicio)}`}
                className="flex flex-col items-center gap-1.5 py-1.5 tap"
              >
                {/* modelo Qualidade: feito = chip verde escuro + ícone citric */}
                <span
                  className={cn(
                    'relative grid h-11 w-11 place-items-center rounded-2xl',
                    jaPassou
                      ? 'bg-accent-soft text-accent'
                      : abertoAgora
                        ? 'bg-accent text-black'
                        : 'text-muted-2 opacity-40',
                  )}
                >
                  <Calendar size={22} strokeWidth={1.6} />
                  {/* V = pegou → círculo verde escuro + check citric */}
                  {concl && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-accent-soft text-accent ring-2 ring-surface">
                      <Check size={10} strokeWidth={2.5} />
                    </span>
                  )}
                  {/* X = não pegou */}
                  {estado === 'encerrado' && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-surface-3 text-muted ring-2 ring-surface">
                      <X size={10} strokeWidth={3} />
                    </span>
                  )}
                  {/* cadeado = futuro */}
                  {estado === 'em_breve' && (
                    <span className="absolute -right-1.5 -top-1.5 text-muted-2">
                      <Lock size={11} />
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'text-[10.5px] font-semibold',
                    estado === 'em_breve' ? 'text-muted-2' : 'text-text',
                  )}
                >
                  {competencia(item.data_inicio)}
                </span>
              </button>
            )
          })}
          </div>
        </div>
      )}

      {/* Série sequencial (Indicação, Saúde) → bancada de "vagas" que liberam uma a uma */}
      {aberto && ehSeq && (
        <div className="bg-surface-2/40">
          {comoFunciona}
          <div className="grid grid-cols-4 gap-3 p-4">
            {itensSeq.map((item, i) => {
              const concl = item.concluido
              const aberta = !concl && item.liberado
              const pode = aberta || concl || admin
              const TileIcon = SERIE_ICON[nome] || ClipboardList
              const numero = i + 1 // posição na série (1 → 10), independente da ordem global
              return (
                <button
                  key={item.id}
                  onClick={() => pode && onAbrir(item)}
                  disabled={!pode}
                  aria-label={`${nome} ${numero}`}
                  className="flex flex-col items-center gap-1.5 py-1.5 tap"
                >
                  {/* modelo Qualidade: feito = chip verde escuro + ícone citric */}
                  <span
                    className={cn(
                      'relative grid h-11 w-11 place-items-center rounded-2xl',
                      concl
                        ? 'bg-accent-soft text-accent'
                        : aberta
                          ? 'bg-accent text-black'
                          : 'text-muted-2 opacity-40',
                    )}
                  >
                    <TileIcon size={20} strokeWidth={1.7} />
                    {/* aprovada → círculo verde escuro + check citric */}
                    {concl && (
                      <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-accent-soft text-accent ring-2 ring-surface">
                        <Check size={10} strokeWidth={2.5} />
                      </span>
                    )}
                    {/* bloqueada (vaga futura) → cadeado */}
                    {!concl && !aberta && (
                      <span className="absolute -right-1.5 -top-1.5 text-muted-2">
                        <Lock size={11} />
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[10.5px] font-semibold',
                      !concl && !aberta ? 'text-muted-2' : 'text-text',
                    )}
                  >
                    {numero}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Reconhecimento por tempo de casa → bancada de presentinhos */}
      {aberto && ehRec && (
        <div className="border-t border-line bg-surface-2/40">
          {comoFunciona}
          <div className="grid grid-cols-4 gap-3 p-4">
            {itensOrdenados.map((item) => {
            const est = item.estado_reconhecimento
            // resgatado/já passou = chip verde escuro + citric · disponível = citric fill · futuro = cinza
            const jaPassouRec = est === 'resgatado' || est === 'ja_passou'
            return (
              <button
                key={item.id}
                onClick={() => onAbrir(item)}
                aria-label={tempoLabel(item.tempo_casa_meses)}
                className="flex flex-col items-center gap-1.5 py-1.5 tap"
              >
                {/* modelo Qualidade: feito = chip verde escuro + ícone citric */}
                <span
                  className={cn(
                    'relative grid h-11 w-11 place-items-center rounded-2xl',
                    jaPassouRec
                      ? 'bg-accent-soft text-accent'
                      : est === 'disponivel'
                        ? 'bg-accent text-black'
                        : 'text-muted-2 opacity-40',
                  )}
                >
                  <Gift size={22} strokeWidth={1.7} />
                  {/* resgatado → círculo verde escuro + check citric */}
                  {est === 'resgatado' && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-accent-soft text-accent ring-2 ring-surface">
                      <Check size={10} strokeWidth={2.5} />
                    </span>
                  )}
                  {/* já passou (comemorado antes do programa) → não resgatável */}
                  {est === 'ja_passou' && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-surface-3 text-muted ring-2 ring-surface">
                      <Ban size={10} />
                    </span>
                  )}
                  {/* futuro, ainda bloqueado → cinza */}
                  {est === 'bloqueado' && (
                    <span className="absolute -right-1.5 -top-1.5 text-muted-2">
                      <Lock size={11} />
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'text-center text-[10.5px] font-semibold leading-tight',
                    est === 'bloqueado' ? 'text-muted-2' : 'text-text',
                  )}
                >
                  {tempoLabel(item.tempo_casa_meses)}
                </span>
              </button>
            )
          })}
          </div>
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

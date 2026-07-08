export const currentUser = {
  id: 'u_victor',
  nome: 'Victor Hugo',
  primeiroNome: 'Victor',
  cargo: 'Gerente',
  loja: 'Loja Jardins',
  avatar: null,
  rank: 'Prata',
  proximoRank: 'Ouro',
  progressoRank: 0.7,
  pontosCarteira: 4230,
}

export const destaquesDoDia = [
  { label: 'Vendas', valor: 'R$ 9.430', trend: 'up' },
  { label: 'Meta', valor: '82%', trend: 'up' },
  { label: 'Avaliação', valor: '4,8', hint: 'Excelente' },
]

export const urgentes = [
  {
    id: 'ur_1',
    titulo: 'Reunião geral de líderes',
    quando: 'Amanhã, 10:00 · Sala de manutenção',
  },
]

export const acessosRapidos = [
  { id: 'comunicados', label: 'Comunicados', icon: 'Megaphone', to: '/comunicados' },
  { id: 'treinamentos', label: 'Treinamentos', icon: 'GraduationCap', to: '/treinamentos' },
  { id: 'procedimentos', label: 'Procedimentos', icon: 'ClipboardList', to: '/procedimentos' },
  { id: 'rh', label: 'RH Fácil', icon: 'HeartHandshake', to: '/rh' },
  { id: 'ia', label: 'Fale com a IA', icon: 'Sparkles', to: '/assistente' },
]

export const minhaProgressao = {
  label: 'Treinamentos concluídos',
  valor: 0.7,
}

export const comunicados = [
  {
    id: 'c_1',
    tag: 'URGENTE',
    urgente: true,
    titulo: 'Mudança no horário de funcionamento',
    resumo: 'A partir de 10/09, todas as unidades abrirão 30 min mais cedo.',
    data: '10/09/2024',
    categoria: 'Marketing',
    views: 125,
  },
  {
    id: 'c_2',
    titulo: 'Campanha Dia das Mães',
    resumo: 'Participe da nossa campanha especial e aproveite os materiais disponíveis.',
    data: '05/05/2024',
    categoria: 'Marketing',
    views: 87,
  },
  {
    id: 'c_3',
    titulo: 'Novos combinados sazonais',
    resumo: 'Confira os detalhes dos novos combinados de inverno.',
    data: '01/06/2024',
    categoria: 'Loja',
    views: 64,
  },
  {
    id: 'c_4',
    titulo: 'Treinamento: Segurança Alimentar',
    resumo: 'Reforçamos a importância da higienização correta.',
    data: '07/05/2024',
    categoria: 'Qualidade',
    views: 52,
  },
]

export const treinamentos = {
  progressoGeral: { concluidos: 24, total: 35, percentual: 0.68 },
  continueAssistindo: [
    { id: 't_1', titulo: 'Boas práticas de higiene', trilha: 'Cozinha e Sushi Bar', progresso: 0.6 },
  ],
  obrigatorios: [
    { id: 't_2', titulo: 'Atendimento Tatá', trilha: 'Cozinha e Delivery', progresso: 0.3 },
    { id: 't_3', titulo: 'Segurança alimentar', trilha: 'Cozinha e Peixaria', progresso: 1.0 },
    { id: 't_4', titulo: 'Uso correto de EPIs', trilha: 'Cozinha e Sushi Bar', progresso: 0.45 },
  ],
}

export const procedimentos = [
  { id: 'p_1', label: 'Cozinha', icon: 'ChefHat' },
  { id: 'p_2', label: 'Sushi Bar', icon: 'Fish' },
  { id: 'p_3', label: 'Peixaria', icon: 'Waves' },
  { id: 'p_4', label: 'Salão', icon: 'Utensils' },
  { id: 'p_5', label: 'Caixa', icon: 'CreditCard' },
  { id: 'p_6', label: 'Delivery', icon: 'Bike' },
  { id: 'p_7', label: 'Estoque', icon: 'Boxes' },
  { id: 'p_8', label: 'Limpeza', icon: 'Sparkle' },
  { id: 'p_9', label: 'Bar', icon: 'Wine' },
  { id: 'p_10', label: 'Qualidade', icon: 'ShieldCheck' },
  { id: 'p_11', label: 'Segurança Alimentar', icon: 'HeartPulse' },
  { id: 'p_12', label: 'Manutenção', icon: 'Wrench' },
]

export const procedimentoDoDia = {
  titulo: 'Higienização de facas',
  descricao: 'Procedimento diário — leia antes do turno.',
}

export const jornadaResumo = {
  progressoRank: 0.7,
  stats: [
    { label: 'Treinamentos concluídos', valor: '12/18' },
    { label: 'Avaliações & feedbacks', valor: '4' },
    { label: 'Metas individuais', valor: '82% no mês' },
    { label: 'Certificações', valor: 'Ver detalhes' },
  ],
  minhasAcoes: [
    { id: 'a_1', label: 'Ponto de desenvolvimento', hint: 'Ver detalhes' },
    { id: 'a_2', label: 'Certificados', hint: 'Ver detalhes' },
  ],
}

export const recompensasCatalogo = [
  { id: 'r_1', titulo: 'Vale-refeição R$ 50', custo: 500 },
  { id: 'r_2', titulo: 'Camiseta Tatá', custo: 800 },
  { id: 'r_3', titulo: 'Day-off', custo: 3000 },
  { id: 'r_4', titulo: 'Kit sushi em casa', custo: 1500 },
]

// Signo do zodíaco + uma leitura curta de como ele costuma atuar no trabalho.
// (Conteúdo leve/positivo — depois dá pra evoluir para um review mais completo.)
export const SIGNOS = {
  Áries: {
    nome: 'Áries',
    emoji: '♈',
    elemento: 'Fogo',
    review:
      'Iniciativa e energia: arranca projetos do zero e não foge de desafio. Brilha quando pode agir rápido e liderar.',
  },
  Touro: {
    nome: 'Touro',
    emoji: '♉',
    elemento: 'Terra',
    review:
      'Constância e confiança: entrega com qualidade e mantém a calma sob pressão. Forte em rotinas que exigem consistência.',
  },
  Gêmeos: {
    nome: 'Gêmeos',
    emoji: '♊',
    elemento: 'Ar',
    review:
      'Comunicação e versatilidade: aprende rápido, circula bem entre áreas e adora trocar ideias. Ótimo em tarefas dinâmicas.',
  },
  Câncer: {
    nome: 'Câncer',
    emoji: '♋',
    elemento: 'Água',
    review:
      'Cuidado e empatia: cria um ambiente acolhedor e percebe o time. Excelente em atendimento e trabalho em equipe.',
  },
  Leão: {
    nome: 'Leão',
    emoji: '♌',
    elemento: 'Fogo',
    review:
      'Presença e liderança: motiva pelo exemplo e gosta de reconhecimento. Destaca-se em funções de representação.',
  },
  Virgem: {
    nome: 'Virgem',
    emoji: '♍',
    elemento: 'Terra',
    review:
      'Precisão e organização: atenção ao detalhe e melhoria contínua. Referência em qualidade e processos.',
  },
  Libra: {
    nome: 'Libra',
    emoji: '♎',
    elemento: 'Ar',
    review:
      'Diplomacia e equilíbrio: media conflitos e busca o justo. Forte em relacionamento e parcerias.',
  },
  Escorpião: {
    nome: 'Escorpião',
    emoji: '♏',
    elemento: 'Água',
    review:
      'Intensidade e foco: vai fundo nos problemas e não desiste fácil. Ótimo em análise e metas desafiadoras.',
  },
  Sagitário: {
    nome: 'Sagitário',
    emoji: '♐',
    elemento: 'Fogo',
    review:
      'Visão e otimismo: pensa grande e inspira. Brilha em expansão, aprendizado e novos horizontes.',
  },
  Capricórnio: {
    nome: 'Capricórnio',
    emoji: '♑',
    elemento: 'Terra',
    review:
      'Disciplina e ambição: foco em resultado e no longo prazo. Referência em responsabilidade e entrega.',
  },
  Aquário: {
    nome: 'Aquário',
    emoji: '♒',
    elemento: 'Ar',
    review:
      'Inovação e visão coletiva: traz ideias novas e pensa fora da caixa. Forte em melhorias e projetos diferentes.',
  },
  Peixes: {
    nome: 'Peixes',
    emoji: '♓',
    elemento: 'Água',
    review:
      'Sensibilidade e criatividade: intuição apurada e empatia. Ótimo em criação e no cuidado com as pessoas.',
  },
}

// Signo que COMEÇA em cada mês, com o dia de início.
const INICIO = {
  1: { dia: 20, nome: 'Aquário' },
  2: { dia: 19, nome: 'Peixes' },
  3: { dia: 21, nome: 'Áries' },
  4: { dia: 20, nome: 'Touro' },
  5: { dia: 21, nome: 'Gêmeos' },
  6: { dia: 21, nome: 'Câncer' },
  7: { dia: 23, nome: 'Leão' },
  8: { dia: 23, nome: 'Virgem' },
  9: { dia: 23, nome: 'Libra' },
  10: { dia: 23, nome: 'Escorpião' },
  11: { dia: 22, nome: 'Sagitário' },
  12: { dia: 22, nome: 'Capricórnio' },
}

// Recebe 'YYYY-MM-DD' (evita fuso — lê a string direto) e devolve o signo.
export function signoDe(dataStr) {
  if (!dataStr) return null
  const [, m, d] = String(dataStr).split('-').map(Number)
  if (!m || !d) return null
  const cur = INICIO[m]
  const nome = d >= cur.dia ? cur.nome : INICIO[m === 1 ? 12 : m - 1].nome
  return SIGNOS[nome] || null
}

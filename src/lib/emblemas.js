// Catálogo de emblemas da área de Conquistas, organizado em categorias.
// Cada emblema tem `ganho(x)`, onde x vem do RPC minha_jornada_extra:
//   { meses_casa, disc_feito, desafios_concluidos, pontos, curtidas_dadas,
//     curtidas_recebidas, comentarios, trilhas_100:[] } — e, na avaliação,
//   `emblemas_count` (quantos emblemas das demais categorias já foram ganhos).
// Ícones seguem o padrão cítrico do app (medalhão bg-accent-soft + accent).

export const CATEGORIAS_EMBLEMAS = [
  {
    chave: 'points',
    titulo: 'TATÁ points',
    emblemas: [
      {
        chave: 'pts_colab',
        titulo: 'Colaborador +',
        icone: 'UserPlus',
        desc: 'Atingir 1.000 pontos',
        ganho: (x) => (x.pontos ?? 0) >= 1000,
      },
      {
        chave: 'pts_prata',
        titulo: 'Usuário Prata',
        icone: 'Medal',
        desc: 'Atingir 5.000 pontos',
        ganho: (x) => (x.pontos ?? 0) >= 5000,
      },
      {
        chave: 'pts_ouro',
        titulo: 'Usuário Ouro',
        icone: 'Trophy',
        desc: 'Atingir 10.000 pontos',
        ganho: (x) => (x.pontos ?? 0) >= 10000,
      },
    ],
  },
  {
    chave: 'birthdays',
    titulo: 'TATÁ birthdays',
    emblemas: [
      {
        chave: 'ani1',
        titulo: '1 ano',
        icone: 'Cake',
        desc: '1 ano de TATÁ',
        ganho: (x) => (x.meses_casa ?? -1) >= 12,
      },
      {
        chave: 'ani2',
        titulo: '2 anos',
        icone: 'Cake',
        desc: '2 anos de TATÁ',
        ganho: (x) => (x.meses_casa ?? -1) >= 24,
      },
      {
        chave: 'ani3',
        titulo: '3 anos',
        icone: 'Cake',
        desc: '3 anos de TATÁ',
        ganho: (x) => (x.meses_casa ?? -1) >= 36,
      },
      {
        chave: 'ani5',
        titulo: '5 anos',
        icone: 'Cake',
        desc: '5 anos de TATÁ',
        ganho: (x) => (x.meses_casa ?? -1) >= 60,
      },
      {
        chave: 'ani10',
        titulo: '10 anos',
        icone: 'Cake',
        desc: '10 anos de TATÁ',
        ganho: (x) => (x.meses_casa ?? -1) >= 120,
      },
    ],
  },
  {
    chave: 'school',
    titulo: 'TATÁ school',
    emblemas: [
      {
        chave: 'esc_gg',
        titulo: 'Gente & Gestão',
        icone: 'Users',
        desc: '100% dos desafios de Gente & Gestão',
        ganho: (x) => (x.trilhas_100 || []).includes('Gente & Gestão'),
      },
      {
        chave: 'esc_etica',
        titulo: 'Código de Ética',
        icone: 'Scale',
        desc: '100% dos desafios de Código de Ética',
        ganho: (x) => (x.trilhas_100 || []).includes('Código de Ética'),
      },
      {
        chave: 'esc_qual',
        titulo: 'Qualidade',
        icone: 'BadgeCheck',
        desc: '100% dos desafios de Qualidade',
        ganho: (x) => (x.trilhas_100 || []).includes('Qualidade'),
      },
      {
        chave: 'esc_bar',
        titulo: 'Bar & Bebidas',
        icone: 'Wine',
        desc: '100% dos desafios de Bar & Bebidas',
        ganho: (x) => (x.trilhas_100 || []).includes('Bar & Bebidas'),
      },
    ],
  },
  {
    chave: 'leadership',
    titulo: 'TATÁ leadership',
    emblemas: [
      {
        chave: 'lid_asc',
        titulo: 'Líder em Ascensão',
        icone: 'TrendingUp',
        desc: 'Conquistar 6 emblemas',
        ganho: (x) => (x.emblemas_count ?? 0) >= 6,
      },
      {
        chave: 'lid_cons',
        titulo: 'Líder Consistente',
        icone: 'ShieldCheck',
        desc: 'Conquistar 10 emblemas',
        ganho: (x) => (x.emblemas_count ?? 0) >= 10,
      },
      {
        chave: 'lid_emb',
        titulo: 'Embaixador de Excelência',
        icone: 'Crown',
        desc: 'Conquistar 15 emblemas',
        ganho: (x) => (x.emblemas_count ?? 0) >= 15,
      },
    ],
  },
  {
    chave: 'influencers',
    titulo: 'TATÁ influencers',
    emblemas: [
      {
        chave: 'inf_mestre',
        titulo: 'Mestre das Curtidas',
        icone: 'Heart',
        desc: 'Dar 300 curtidas',
        ganho: (x) => (x.curtidas_dadas ?? 0) >= 300,
      },
      {
        chave: 'inf_fenomeno',
        titulo: 'Fenômeno das Curtidas',
        icone: 'Flame',
        desc: 'Receber 300 curtidas',
        ganho: (x) => (x.curtidas_recebidas ?? 0) >= 300,
      },
      {
        chave: 'inf_guru',
        titulo: 'Guru dos Comentários',
        icone: 'MessageSquare',
        desc: 'Escrever 100 comentários',
        ganho: (x) => (x.comentarios ?? 0) >= 100,
      },
      {
        chave: 'inf_emb',
        titulo: 'Embaixador TATÁ',
        icone: 'Star',
        desc: 'Conquistar Mestre das Curtidas',
        ganho: (x) => (x.curtidas_dadas ?? 0) >= 300,
      },
      {
        chave: 'inf_mult',
        titulo: 'Multiplicador TATÁ',
        icone: 'Zap',
        desc: 'Ganhar 1.000 pontos',
        ganho: (x) => (x.pontos ?? 0) >= 1000,
      },
    ],
  },
]

// Lista achatada com a categoria em cada emblema.
export const CATALOGO_EMBLEMAS = CATEGORIAS_EMBLEMAS.flatMap((c) =>
  c.emblemas.map((e) => ({ ...e, categoria: c.chave })),
)

// Avalia todos os emblemas. Dois passos porque os de "leadership" dependem da
// contagem dos emblemas das outras categorias (emblemas_count).
export function avaliarEmblemas(dados) {
  const d = dados || {}
  const base = CATALOGO_EMBLEMAS.filter((e) => e.categoria !== 'leadership')
  const baseCount = base.filter((e) => e.ganho(d)).length
  const d2 = { ...d, emblemas_count: baseCount }
  const ganhos = new Set(CATALOGO_EMBLEMAS.filter((e) => e.ganho(d2)).map((e) => e.chave))
  return { ganhos, total: ganhos.size }
}

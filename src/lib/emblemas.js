// Catálogo de emblemas da área de Conquistas, organizado em categorias.
// `ganho(x)` recebe as métricas do RPC minha_jornada_extra / perfil_publico:
//   { meses_casa, disc_feito, desafios_concluidos, pontos, curtidas_dadas,
//     curtidas_recebidas, comentarios, trilhas_100:[], trilhas:[] }
// A categoria "TATÁ school" é dinâmica: um emblema por trilha (categoria) do
// portal. Os de "leadership" dependem de `emblemas_count` (nº de emblemas das
// outras categorias já conquistados), injetado durante a avaliação.

const PONTOS = {
  chave: 'points',
  titulo: 'TATÁ points',
  emblemas: [
    { chave: 'pts_colab', titulo: 'Colaborador +', icone: 'UserPlus', desc: 'Atingir 1.000 pontos', ganho: (x) => (x.pontos ?? 0) >= 1000 },
    { chave: 'pts_prata', titulo: 'Usuário Prata', icone: 'Medal', desc: 'Atingir 5.000 pontos', ganho: (x) => (x.pontos ?? 0) >= 5000 },
    { chave: 'pts_ouro', titulo: 'Usuário Ouro', icone: 'Trophy', desc: 'Atingir 10.000 pontos', ganho: (x) => (x.pontos ?? 0) >= 10000 },
  ],
}

const BIRTHDAYS = {
  chave: 'birthdays',
  titulo: 'TATÁ birthdays',
  emblemas: [
    { chave: 'ani1', titulo: '1 ano', icone: 'Cake', desc: '1 ano de TATÁ', ganho: (x) => (x.meses_casa ?? -1) >= 12 },
    { chave: 'ani2', titulo: '2 anos', icone: 'Cake', desc: '2 anos de TATÁ', ganho: (x) => (x.meses_casa ?? -1) >= 24 },
    { chave: 'ani3', titulo: '3 anos', icone: 'Cake', desc: '3 anos de TATÁ', ganho: (x) => (x.meses_casa ?? -1) >= 36 },
    { chave: 'ani5', titulo: '5 anos', icone: 'Cake', desc: '5 anos de TATÁ', ganho: (x) => (x.meses_casa ?? -1) >= 60 },
    { chave: 'ani10', titulo: '10 anos', icone: 'Cake', desc: '10 anos de TATÁ', ganho: (x) => (x.meses_casa ?? -1) >= 120 },
  ],
}

const LEADERSHIP = {
  chave: 'leadership',
  titulo: 'TATÁ leadership',
  emblemas: [
    { chave: 'lid_asc', titulo: 'Líder em Ascensão', icone: 'TrendingUp', desc: 'Conquistar 6 emblemas', ganho: (x) => (x.emblemas_count ?? 0) >= 6 },
    { chave: 'lid_cons', titulo: 'Líder Consistente', icone: 'ShieldCheck', desc: 'Conquistar 10 emblemas', ganho: (x) => (x.emblemas_count ?? 0) >= 10 },
    { chave: 'lid_emb', titulo: 'Embaixador de Excelência', icone: 'Crown', desc: 'Conquistar 20 emblemas', ganho: (x) => (x.emblemas_count ?? 0) >= 20 },
  ],
}

const INFLUENCERS = {
  chave: 'influencers',
  titulo: 'TATÁ influencers',
  emblemas: [
    { chave: 'inf_mestre', titulo: 'Mestre das Curtidas', icone: 'Heart', desc: 'Dar 300 curtidas', ganho: (x) => (x.curtidas_dadas ?? 0) >= 300 },
    { chave: 'inf_fenomeno', titulo: 'Fenômeno das Curtidas', icone: 'Flame', desc: 'Receber 300 curtidas', ganho: (x) => (x.curtidas_recebidas ?? 0) >= 300 },
    { chave: 'inf_guru', titulo: 'Guru dos Comentários', icone: 'MessageSquare', desc: 'Escrever 100 comentários', ganho: (x) => (x.comentarios ?? 0) >= 100 },
    { chave: 'inf_emb', titulo: 'Embaixador TATÁ', icone: 'Star', desc: 'Conquistar Mestre das Curtidas', ganho: (x) => (x.curtidas_dadas ?? 0) >= 300 },
    { chave: 'inf_mult', titulo: 'Multiplicador TATÁ', icone: 'Zap', desc: 'Ganhar 1.000 pontos', ganho: (x) => (x.pontos ?? 0) >= 1000 },
  ],
}

// Ícone que combina com a trilha/categoria.
function iconeTrilha(nome) {
  const n = (nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  if (n.includes('bar')) return 'Wine'
  if (n.includes('etica')) return 'Scale'
  if (n.includes('gente') || n.includes('gestao')) return 'Users'
  if (n.includes('qualidade')) return 'BadgeCheck'
  if (n.includes('feedback')) return 'MessageSquare'
  if (n.includes('gorjeta') || n.includes('premio')) return 'HandCoins'
  if (n.includes('integ')) return 'Handshake'
  if (n.includes('soft')) return 'Brain'
  if (n.includes('news')) return 'Newspaper'
  if (n.includes('especia')) return 'Sparkles'
  if (n.includes('plus')) return 'Star'
  return 'GraduationCap'
}

// Monta as categorias com a "TATÁ school" dinâmica (um emblema por trilha).
export function montarCategorias(dados) {
  const trilhas = dados?.trilhas || []
  const school = {
    chave: 'school',
    titulo: 'TATÁ school',
    emblemas: trilhas.map((nome) => ({
      chave: 'esc_' + nome,
      titulo: nome,
      icone: iconeTrilha(nome),
      desc: `100% dos desafios de ${nome}`,
      ganho: (x) => (x.trilhas_100 || []).includes(nome),
    })),
  }
  // Emblemas de liderança só valem para líderes.
  const cats = [PONTOS, BIRTHDAYS, school]
  if (dados?.lider) cats.push(LEADERSHIP)
  cats.push(INFLUENCERS)
  return cats
}

// Avalia todos os emblemas (2 passos: leadership depende da contagem dos demais).
export function avaliarEmblemas(dados) {
  const d = dados || {}
  const todos = montarCategorias(d).flatMap((c) => c.emblemas.map((e) => ({ ...e, categoria: c.chave })))
  const base = todos.filter((e) => e.categoria !== 'leadership')
  const baseCount = base.filter((e) => e.ganho(d)).length
  const d2 = { ...d, emblemas_count: baseCount }
  const ganhos = new Set(todos.filter((e) => e.ganho(d2)).map((e) => e.chave))
  return { ganhos, total: ganhos.size }
}

// Total de emblemas existentes para esse resumo (varia com o nº de trilhas).
export function totalEmblemas(dados) {
  return montarCategorias(dados).reduce((s, c) => s + c.emblemas.length, 0)
}

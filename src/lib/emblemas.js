// Catálogo de emblemas da Minha jornada. Conjunto inicial (calculável com os
// dados de hoje) — quando o print oficial chegar, é só editar esta lista.
// `ganho(x)` recebe { meses_casa, disc_feito, desafios_concluidos } do RPC
// minha_jornada_extra e diz se a pessoa conquistou o emblema. Os ícones seguem
// o padrão cítrico do app (medalhão bg-accent-soft + ícone accent).
export const CATALOGO_EMBLEMAS = [
  { chave: 'casa6m', titulo: '6 meses', icone: 'Sparkles', ganho: (x) => (x.meses_casa ?? -1) >= 6 },
  { chave: 'casa1a', titulo: '1 ano', icone: 'Star', ganho: (x) => (x.meses_casa ?? -1) >= 12 },
  { chave: 'casa3a', titulo: '3 anos', icone: 'Award', ganho: (x) => (x.meses_casa ?? -1) >= 36 },
  { chave: 'casa5a', titulo: '5 anos', icone: 'Crown', ganho: (x) => (x.meses_casa ?? -1) >= 60 },
  { chave: 'primeiro', titulo: 'Primeiro desafio', icone: 'BadgeCheck', ganho: (x) => (x.desafios_concluidos ?? 0) >= 1 },
  { chave: 'disc', titulo: 'Autoconhecimento', icone: 'Brain', ganho: (x) => !!x.disc_feito },
]

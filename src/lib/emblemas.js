// Catálogo de emblemas da Minha jornada. Conjunto inicial (calculável com os
// dados de hoje) — quando o print oficial chegar, é só editar esta lista.
// `ganho(x)` recebe { meses_casa, disc_feito, desafios_concluidos } do RPC
// minha_jornada_extra e diz se a pessoa conquistou o emblema.
export const CATALOGO_EMBLEMAS = [
  { chave: 'casa6m', titulo: '6 meses', icone: 'Sparkles', cor: '#22C55E', ganho: (x) => (x.meses_casa ?? -1) >= 6 },
  { chave: 'casa1a', titulo: '1 ano', icone: 'Star', cor: '#F59E0B', ganho: (x) => (x.meses_casa ?? -1) >= 12 },
  { chave: 'casa3a', titulo: '3 anos', icone: 'Award', cor: '#F97316', ganho: (x) => (x.meses_casa ?? -1) >= 36 },
  { chave: 'casa5a', titulo: '5 anos', icone: 'Crown', cor: '#EF4444', ganho: (x) => (x.meses_casa ?? -1) >= 60 },
  { chave: 'primeiro', titulo: 'Primeiro desafio', icone: 'BadgeCheck', cor: '#3B82F6', ganho: (x) => (x.desafios_concluidos ?? 0) >= 1 },
  { chave: 'disc', titulo: 'Autoconhecimento', icone: 'Brain', cor: '#8B5CF6', ganho: (x) => !!x.disc_feito },
]

// Metadados das 4 dimensões do DISC (rótulo + descrição curta + cor).
export const DISC = {
  D: { nome: 'Dominante', desc: 'Foco em resultado, decisão e ação direta.', cor: '#EF4444' },
  I: { nome: 'Influente', desc: 'Comunicação, entusiasmo e conexão com pessoas.', cor: '#F59E0B' },
  S: { nome: 'Estável', desc: 'Constância, paciência, cooperação e harmonia.', cor: '#22C55E' },
  C: { nome: 'Conforme', desc: 'Precisão, análise, regras e atenção aos padrões.', cor: '#3B82F6' },
}
export const ORDEM = ['D', 'I', 'S', 'C']

// dimensão de maior pontuação (fallback pro rótulo salvo)
export function dominanteDe(pont) {
  return ORDEM.reduce((a, b) => (Number(pont?.[b] || 0) > Number(pont?.[a] || 0) ? b : a), 'D')
}

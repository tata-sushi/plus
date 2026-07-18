// Avaliação dos emblemas a partir do catálogo do banco (tabela emblemas,
// editável no admin) e das métricas do colaborador (RPC minha_jornada_extra /
// perfil_publico): { meses_casa, disc_feito, desafios_concluidos, pontos,
// curtidas_dadas, curtidas_recebidas, comentarios, trilhas_100:[], lider }.

// Tipos de regra disponíveis (usado também no formulário do admin).
export const REGRAS_EMBLEMA = [
  { v: 'pontos', label: 'Pontos ganhos ≥', numero: true },
  { v: 'meses_casa', label: 'Meses de casa ≥', numero: true },
  { v: 'desafios', label: 'Desafios concluídos ≥', numero: true },
  { v: 'curtidas_dadas', label: 'Curtidas dadas ≥', numero: true },
  { v: 'curtidas_recebidas', label: 'Curtidas recebidas ≥', numero: true },
  { v: 'comentarios', label: 'Comentários escritos ≥', numero: true },
  { v: 'emblemas', label: 'Emblemas conquistados ≥', numero: true },
  { v: 'trilha_100', label: '100% de uma trilha', trilha: true },
  { v: 'disc', label: 'Concluiu o DISC' },
]

function fazGanho(e) {
  const v = Number(e.valor) || 0
  switch (e.regra) {
    case 'pontos':
      return (x) => (x.pontos ?? 0) >= v
    case 'meses_casa':
      return (x) => (x.meses_casa ?? -1) >= v
    case 'desafios':
      return (x) => (x.desafios_concluidos ?? 0) >= v
    case 'curtidas_dadas':
      return (x) => (x.curtidas_dadas ?? 0) >= v
    case 'curtidas_recebidas':
      return (x) => (x.curtidas_recebidas ?? 0) >= v
    case 'comentarios':
      return (x) => (x.comentarios ?? 0) >= v
    case 'trilha_100':
      return (x) => (x.trilhas_100 || []).includes(e.alvo)
    case 'disc':
      return (x) => !!x.disc_feito
    case 'emblemas':
      return (x) => (x.emblemas_count ?? 0) >= v
    default:
      return () => false
  }
}

// Avalia o catálogo (do DB) contra as métricas. Dois passos: a regra "emblemas"
// (liderança) depende da contagem dos demais. Emblemas `so_lider` só valem p/ líderes.
export function avaliarCatalogo(catalogo, dados) {
  const d = dados || {}
  const lista = (catalogo || []).filter((e) => !e.so_lider || d.lider)
  const com = lista.map((e) => ({ ...e, _ganho: fazGanho(e) }))
  const baseCount = com.filter((e) => e.regra !== 'emblemas' && e._ganho(d)).length
  const d2 = { ...d, emblemas_count: baseCount }
  const ganhosLista = com.filter((e) => e._ganho(d2))
  return {
    ganhosLista,
    ganhos: new Set(ganhosLista.map((e) => e.chave)),
    total: ganhosLista.length,
    existentes: lista.length,
  }
}

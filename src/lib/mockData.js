// Configuração real + conteúdo ainda sem backend próprio.
// Tudo que é dado de usuário/negócio (perfis, ranking, feed, comunicados,
// recompensas, emblemas, desafios, notificações) vem do Supabase. Este arquivo
// guarda apenas: (1) config real — redes sociais e catálogo de páginas de
// Governança; (2) conteúdo placeholder ainda sem backend — menu do dia e
// cardápio da semana (a serem migrados quando a Tatá House tiver API própria).

// ---- Cardápio / menu do dia (placeholder — pendente de backend próprio) ----
export const menuDoDia = {
  dataLabel: 'Hoje',
  itens: [
    { label: 'Prato principal', valor: 'Yakisoba de frango', icon: 'UtensilsCrossed' },
    { label: 'Acompanhamento', valor: 'Arroz, feijão e salada', icon: 'Salad' },
    { label: 'Sobremesa', valor: 'Gelatina de morango', icon: 'IceCreamBowl' },
  ],
}

export const cardapioSemanal = [
  {
    abrev: 'Seg',
    nome: 'Segunda-feira',
    itens: [
      { label: 'Prato principal', valor: 'Yakisoba de frango', icon: 'UtensilsCrossed' },
      { label: 'Acompanhamento', valor: 'Arroz, feijão e salada', icon: 'Salad' },
      { label: 'Sobremesa', valor: 'Gelatina de morango', icon: 'IceCreamBowl' },
    ],
  },
  {
    abrev: 'Ter',
    nome: 'Terça-feira',
    itens: [
      { label: 'Prato principal', valor: 'Frango grelhado com legumes', icon: 'UtensilsCrossed' },
      { label: 'Acompanhamento', valor: 'Arroz integral e vinagrete', icon: 'Salad' },
      { label: 'Sobremesa', valor: 'Salada de frutas', icon: 'IceCreamBowl' },
    ],
  },
  {
    abrev: 'Qua',
    nome: 'Quarta-feira',
    itens: [
      { label: 'Prato principal', valor: 'Estrogonofe de carne', icon: 'UtensilsCrossed' },
      { label: 'Acompanhamento', valor: 'Arroz e batata palha', icon: 'Salad' },
      { label: 'Sobremesa', valor: 'Pudim', icon: 'IceCreamBowl' },
    ],
  },
  {
    abrev: 'Qui',
    nome: 'Quinta-feira',
    itens: [
      { label: 'Prato principal', valor: 'Peixe assado', icon: 'UtensilsCrossed' },
      { label: 'Acompanhamento', valor: 'Purê de batata e salada', icon: 'Salad' },
      { label: 'Sobremesa', valor: 'Mousse de maracujá', icon: 'IceCreamBowl' },
    ],
  },
  {
    abrev: 'Sex',
    nome: 'Sexta-feira',
    itens: [
      { label: 'Prato principal', valor: 'Feijoada', icon: 'UtensilsCrossed' },
      { label: 'Acompanhamento', valor: 'Arroz, couve e farofa', icon: 'Salad' },
      { label: 'Sobremesa', valor: 'Laranja', icon: 'IceCreamBowl' },
    ],
  },
  {
    abrev: 'Sáb',
    nome: 'Sábado',
    itens: [
      { label: 'Prato principal', valor: 'Macarrão à bolonhesa', icon: 'UtensilsCrossed' },
      { label: 'Acompanhamento', valor: 'Salada verde', icon: 'Salad' },
      { label: 'Sobremesa', valor: 'Sorvete', icon: 'IceCreamBowl' },
    ],
  },
  {
    abrev: 'Dom',
    nome: 'Domingo',
    itens: [
      { label: 'Prato principal', valor: 'Frango assado', icon: 'UtensilsCrossed' },
      { label: 'Acompanhamento', valor: 'Arroz, maionese e salada', icon: 'Salad' },
      { label: 'Sobremesa', valor: 'Torta de limão', icon: 'IceCreamBowl' },
    ],
  },
]

// ---- Redes sociais oficiais da Tatá (config real) ----
export const redesSociais = [
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/tatasushi/' },
  { id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@Tatasushiplus' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/tatasushi' },
]

// ---- Atalhos de Governança (config real: páginas de KPI do portal de líderes) ----
// Cada líder fixa até MAX_PAGINAS_FIXADAS destas no acesso rápido; o atalho abre
// a página num visualizador in-app (rota /painel/:id).
export const MAX_PAGINAS_FIXADAS = 10

export const governancaCatalogo = [
  { id: 'gov_escala', label: 'Controle de Escala', icon: 'CalendarClock', url: 'https://escalas.tatasushi.tech/index.html' },
  { id: 'gov_caixa', label: 'Caixa', icon: 'Banknote', url: 'https://lideres.tatasushi.tech/compliance/kpis/caixa/index.html' },
  { id: 'gov_compras', label: 'Compras', icon: 'ShoppingCart', url: 'https://lideres.tatasushi.tech/compliance/kpis/compras/abastecimento.html' },
  { id: 'gov_manutencao', label: 'Manutenção', icon: 'Wrench', url: 'https://lideres.tatasushi.tech/compliance/kpis/manutencao/index.html' },
  { id: 'gov_absenteismo', label: 'Absenteísmo', icon: 'UserX', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/absenteismo.html' },
  { id: 'gov_bancohoras', label: 'Banco de Horas', icon: 'Clock', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/bancodehoras.html' },
  { id: 'gov_beneficios', label: 'Benefícios', icon: 'HandCoins', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/beneficios.html' },
  { id: 'gov_uniformes', label: 'Uniformes', icon: 'Shirt', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/entregasuniforme.html' },
  { id: 'gov_experiencia', label: 'Experiência', icon: 'Smile', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/experiencias.html' },
  { id: 'gov_feriados', label: 'Feriados', icon: 'CalendarDays', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/feriados.html' },
  { id: 'gov_recrutamento', label: 'Recrutamento', icon: 'UserPlus', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/recrutamento.html' },
  { id: 'gov_solicitacoes', label: 'Solicitações', icon: 'Inbox', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/solicitacoes.html' },
  { id: 'gov_ferias', label: 'Férias', icon: 'Umbrella', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/ferias.html' },
  { id: 'gov_medicina', label: 'Medicina Ocupacional', icon: 'Stethoscope', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/medicina.html' },
  { id: 'gov_performance', label: 'Performance', icon: 'Target', url: 'https://lideres.tatasushi.tech/compliance/kpis/rh/performance.html' },
  { id: 'gov_cardapio', label: 'Elaboração de Cardápio', icon: 'BookOpen', url: 'https://lideres.tatasushi.tech/compliance/kpis/tatahouse/cardapio.html' },
]

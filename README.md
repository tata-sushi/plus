# Tatá Plus

Portal do colaborador Tatá Sushi — PWA instalável servida em `plus.tatasushi.tech`.

## Stack

- **Vite + React 18** — SPA rápida, sem SSR
- **Tailwind CSS** — design system dark + verde neon (tema claro/escuro por tokens CSS)
- **React Router** — 5 tabs principais + rotas secundárias
- **vite-plugin-pwa** — manifest, service worker, cache offline
- **lucide-react** — ícones
- **Supabase** (Postgres, schema `tata_plus`) — auth, dados e RPCs `SECURITY DEFINER`

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de produção em dist/
npm run preview    # preview do build
```

## Ícones do PWA

Os ícones usados pelo app (favicon, apple-touch-icon, manifest do PWA) ficam em `public/icons/` como PNGs otimizados (`favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`), recortados do logo oficial da Tatá Sushi.

Os arquivos-fonte (logo original enviado pela marca, versão mestre 1024px e o lockup completo com o wordmark) ficam fora da pasta `public/` — em `design/brand-source/` — para não serem publicados nem entrarem no precache do service worker. Se precisar regenerar os ícones (outro recorte, outra cor), edite a partir desses arquivos-fonte.

## Deploy

Push em `main` dispara `.github/workflows/deploy.yml`, que buildeia e publica no GitHub Pages. O `CNAME` mantém `plus.tatasushi.tech`.

## Estrutura

```
src/
├── App.jsx                  # rotas
├── main.jsx                 # entry + registro do SW (BrowserRouter, sem basename)
├── index.css                # Tailwind + tokens + estilos do .conteudo (HTML dos desafios)
├── components/              # design system + desafios + admin
│   ├── AppShell.jsx         # escolhe o shell: tela cheia · desktop (2 painéis) · mobile
│   ├── DesktopShell.jsx     # layout desktop: rail + painel do app + área central; atalhos de
│   │                        #   governança abrem como abas vivas (estilo navegador) no rail
│   ├── ModoApp.jsx          # portão "só pelo app" (libera quando roda como PWA instalada)
│   ├── BottomNav.jsx        # tabs: Início · Ranking · Feed · Governança|Ouvidoria · Mais
│   ├── Header.jsx / Section.jsx / Card.jsx / Badge.jsx / Tabs.jsx / Voltar.jsx
│   ├── ProgressBar.jsx / ProgressRing.jsx / PromoCard.jsx / Carrossel.jsx / Avatar.jsx
│   ├── ProfileView.jsx / MeuPerfil.jsx / Conquistas.jsx / GradeEmblemas.jsx  # perfil + emblemas
│   ├── AnalisesPerfil.jsx / SocialLinks.jsx / Notificacoes.jsx (sino + lista)
│   ├── Submodulo.jsx        # bancadas: presença (mês), série sequencial, reconhecimento,
│   │                        #   Metas & Prêmio (série de conteúdo mensal) e lista simples
│   ├── IntroDesafio.jsx     # capa do desafio (título + frase)
│   ├── ProvaDesafio.jsx     # quiz (correção no servidor)
│   ├── EnvioDesafio.jsx     # upload moderado (bucket privado)
│   ├── CodigoEtica.jsx      # leitura em blocos + prova/aceite/assinatura
│   ├── LeituraProva.jsx / Avaliacao.jsx / AssinaturaPad.jsx
│   ├── VideosYouTube.jsx / VideoPlayer.jsx / PdfViewer.jsx / PhotoCropper.jsx
│   ├── AtalhosGovernanca.jsx / RecompensaFoto.jsx
│   ├── DestaqueBanner.jsx    # card do carrossel (publicação ou destaque; aniversário com texto centralizado)
│   ├── GovFrame.jsx          # iframe de Governança: entrega o token da sessão + loader (carregamento invisível)
│   └── AdminPublicacoes.jsx / AdminAniversarios.jsx / AdminConquistas.jsx  # CRUD do painel
├── routes/
│   ├── Home.jsx             # Início (identificação + menu do dia + notícias + sugestões)
│   ├── Ranking.jsx          # Colaboradores · Equipes · Líderes (filtros por unidade)
│   ├── Comunidade.jsx       # Feed (posts, curtidas, comentários; moderação p/ admin)
│   ├── Comunicados.jsx / Treinamentos.jsx
│   ├── Jornada.jsx          # Meu perfil (ProfileView do usuário logado)
│   ├── Perfil.jsx           # perfil público de outro colaborador
│   ├── BuscarPessoas.jsx    # busca de colaboradores
│   ├── Recompensas.jsx      # catálogo + resgate
│   ├── AdminRecompensas.jsx # painel admin (Anúncios · Recompensas · Pedidos · Envios · Conquistas)
│   ├── Ouvidoria.jsx        # formulário nativo (replica ouvidoria.tatasushi.tech)
│   ├── Manutencao.jsx       # Painel de Ajustes (notificações · contraste · senha)
│   ├── GerenciarAtalhos.jsx # Atalhos de Governança (fixar páginas de KPI)
│   ├── Cardapio.jsx         # cardápio da semana (placeholder; a religar no schema tata_refeicoes)
│   ├── QuestionarioDisc.jsx # questionário DISC (tela cheia)
│   ├── Mais.jsx / Login.jsx
│   ├── Governanca.jsx       # iframe do portal Líderes (tela cheia)
│   ├── Organograma.jsx      # iframe tela cheia (landscape) + botão flutuante
│   └── PainelExterno.jsx    # visualizador in-app das páginas de Governança
└── lib/
    ├── cn.js / haptics.js / tempo.js / signo.js / useCountUp.js
    ├── useDesktop.js        # detecta viewport de desktop (matchMedia)
    ├── desktopCanvas.js     # contexto da área central do desktop (portal/iframe + abas de gov)
    ├── icons.js             # iconMap (trilhas, áreas, emblemas)
    ├── theme.js             # tema claro/escuro (data-theme no <html>)
    ├── emblemas.js          # regras + avaliação client-side do catálogo de emblemas (DB-driven)
    ├── disc.js              # apuração do perfil DISC
    ├── push.js              # Web Push (VAPID)
    ├── supabase.js          # client
    ├── AuthContext.jsx      # sessão + perfil do usuário (pode_publicar, acesso_governanca)
    └── mockData.js          # só config real (redes sociais, catálogo gov) + placeholders
                             #   sem backend próprio (menu do dia, cardápio da semana)
```

## Estado do backend (dados reais vs. placeholder)

Todo dado de usuário/negócio vem do Supabase (schema `tata_plus`) — não há mais mock de
usuário, ranking, feed, comunicados, recompensas, emblemas, notificações ou desafios. As
telas e seus RPCs foram auditados: **toda chamada `supabase.rpc/from/storage/functions` do
front resolve para um objeto existente no banco** (nenhuma referência quebrada).

O **cardápio** deixou de ser placeholder — agora é real, no schema `tata_refeicoes` (`cardapio_dia`,
`cardapio_itens`, `cardapio_avaliacoes`, `restricoes_alimentares`, `colaborador_restricoes`,
`colaborador_pref_refeicao`), acessado **só via RPCs `SECURITY DEFINER` no `tata_plus`** (o schema não
é exposto direto ao PostgREST). A governança planeja em `cardapio.html` e o app mostra o **cardápio do
dia + avaliação** (ver seção **Cardápio** abaixo). `mockData.js` não é mais usado pela Início nem por
`/cardapio`. As rotas mortas de placeholder (Procedimentos, RH Fácil, Assistente IA) foram removidas
na limpeza pré-campo.

## Cardápio (governança + app)

Ciclo fechado entre a governança e o app, sobre o schema `tata_refeicoes` (só via RPCs
`SECURITY DEFINER` em `tata_plus`).

**Governança** (`compliance/kpis/tatahouse/cardapio.html`, repo `lideres`) — 3 abas:

- **Cardápio (pedidos)** — planeja o dia (cards + modal): resumo, itens (tipo/qtd/un/custo),
  contagens (almoço/jantar/marmitas). Um **selo/lista de restrições** avisa se algum item bate com
  restrição cadastrada por alguém (nome · unidade · item). **Aprovar** move o dia pra Processamento.
- **Status (6 estágios)** — `aguardando_aprovacao → aguardando_compra → aguardando_recebimento →
  aguardando_preparo → aguardando_avaliacao → finalizado`. A pílula é automática; **só a aprovação
  (1→2) e o fechamento (5→6) são manuais**. As transições 2→3→4 são conduzidas pelo **Compras** e
  4→5 pela **data da refeição** (ver abaixo). Todo o fluxo é **por cozinha** (Itaim / Pinheiros):
  cada dia é duplicado por unidade e cada cozinha aprova o seu.
- **Integração com o Compras** (schema compartilhado `tata_abastecimento`), nos dois sentidos:
  - **Ida** — ao aprovar (1→2), `_gerar_pedido_compra` agrega os insumos do dia (só os vinculados ao
    catálogo) num **pedido** (`departamento='Cozinha'`, `id_display` `#THItaim…` / `#THPinh…`),
    idempotente por `data_entrega`+`unidade`.
  - **Volta (status)** — `refeicoes_sync_compras` (chamado no load do Processamento **e** por cron a
    cada 5 min) **lê** o pedido no Compras e espelha o **status** de volta, sempre **para a frente**:
    `solicitado→aguardando_compra`, `comprado→aguardando_recebimento`, `recebido→aguardando_preparo`.
    O estágio do pedido é o do **item menos avançado**. Vínculo: `data_entrega=data_refeicao` +
    `unidade` + `departamento='Cozinha'`. Nunca escreve no schema do Compras (só leitura).
  - **Custo real (último preço)** — calculado **ao vivo** pelo `refeicoes_dia_detalhe`, a partir do
    **último valor** do pedido (`valor_recebimento` → senão `valor_compra` → senão `valor_inicial`),
    rateado por insumo (`insumo.qtd / qtd_solicitada`). A soma dos itens bate com o total do pedido.
    Quando o pedido está **recebido**, o valor é o `valor_recebimento` (o correto). Não é gravado no
    cardápio — sempre lido do Compras.
  - **Data** — `refeicoes_promover_avaliacao` (cron) move `aguardando_preparo→aguardando_avaliacao` no
    dia da refeição.
- **Processamento** — board dos dias aprovados (cross-week). O modal é a **visão de Elaboração
  bloqueada** (itens read-only); cada insumo mostra o **valor unitário real do Compras** pela regra do
  **último preço** (`refeicoes_dia_detalhe`), e só o rodapé (**Custo do cardápio**) traz a **soma =
  custo total da compra**. Antes do pedido existir, cai na estimativa do catálogo. No estágio
  *avaliação*: **notas em 3 níveis** (Geral/Itaim/Pinheiros) e **Registrar servidas** → finaliza.
- **Relatórios** *(próxima etapa)* — visão detalhada por insumo (Insumo · Qtd · Vl. unit. · Total +
  subtotal do prato), estilo Conferência de NF, reaproveitando `refeicoes_dia_detalhe`.

**App** (`plus`):

- **Início** (capa "Menu do dia") e **`/cardapio`** mostram o **cardápio do dia** real.
- **Avaliação** do dia: **nota 1–5** + comentário (1 por pessoa/dia; **trava após salvar**; carimba a
  **unidade** → alimenta as notas da governança). Só o dia de hoje é avaliável.
- **Alerta pessoal** de restrição quando um item do dia bate com uma restrição do próprio usuário.
- **Meu perfil → Restrições Alimentares** — grade de ícones (contorno), catálogo
  (`restricoes_alimentares`) + ligação pessoa↔restrição (`colaborador_restricoes`); a substituição
  padrão ("ovo frito") é **global** por pessoa (`colaborador_pref_refeicao`).

Principais RPCs (`tata_plus`): `refeicoes_semana`, `refeicoes_dia_salvar`, `refeicoes_dia_aprovar`,
`refeicoes_processamento`, `refeicoes_dia_detalhe` (insumos + valores do Compras), `refeicoes_dia_servir`,
`restricoes_do_cardapio`, `_gerar_pedido_compra` (ida), `refeicoes_sync_compras` (volta) e
`refeicoes_promover_avaliacao` (data); e no app `cardapio_app`,
`avaliar_cardapio`, `minhas_restricoes` / `restricoes_catalogo` / `restricao_add` / `restricao_del`,
`minha_substituicao` / `substituicao_set`, `minhas_restricoes_cardapio`.

## Carrossel de destaques e automações

O carrossel da Início é montado pelo RPC `destaques()`, que junta duas origens:

- **Publicações manuais** — comunicado / notícia / aviso criados no painel (**Anúncios**).
  Título e texto são **opcionais** (dá pra publicar **só a imagem**); o público-alvo fica em
  `publicacoes.alvos` (`jsonb`). Aviso ainda dispara notificação (sino + push opcional).
- **Destaques automáticos** — aparecem sozinhos por condição, sem publicar nada:
  - 🎂 **Aniversário de vida** e 🏢 **Aniversário de empresa** — no dia, sorteiam **1 arte**
    (imagem + mensagem + alinhamento próprios) do pool **daquele tipo**. Imagens em
    `aniversario_imagens` (coluna `tipo`, `mensagem`, `alinhamento`), mensagens-modelo em
    `aniversario_mensagens`, liga/desliga em `aniversario_config`. O **de empresa** usa
    `alinhamento = centro-centro` (título + texto no centro, template `aniversario-cc`) com
    título automático ("Parabéns por N anos de TATÁ!"); imagem de empresa subida pelo painel
    já entra centralizada.
  - 🎯 **Desafio de hoje / pendentes**, 🏆 **Ranking**, ⭐ **Saldo** — liga/desliga e **mensagem
    editável** (título + texto com variáveis `{titulo}` `{pontos}` `{qtd}` `{posicao}` `{saldo}`,
    trocadas pelos valores reais) em `destaque_config`.

Tudo é gerido em **Administração → Anúncios**: a lista dos manuais + a seção **Automáticos**
(toggles, editores de mensagem e a tela de imagens/mensagens do aniversário embutida).

### Agendamentos (pg_cron)

- `sync-rhid-8h` — todo dia **08:00 (BRT)**: sincroniza o RHiD → base `profiles` (nome, cargo,
  unidade, admissão, nascimento, status). Nunca apaga nem sobrescreve com vazio.
- `sync-tata-plus` — a cada **10 min**: se a base mudou (`profiles.updated_at`, mantido pelo
  trigger `set_updated_at`), propaga para as tabelas derivadas do app (auth, pontos e conclusões
  históricas). Se nada mudou, não faz nada.

## Governança de Processos

As páginas do portal de Líderes (`lideres.tatasushi.tech/compliance/`) abrem **só embarcadas no
Tatá Plus** — sem login no portal e sem `localStorage`. O Plus entrega o token da sessão pro
iframe (origem verificada, via `GovFrame`) e cada página confere o acesso **ao vivo** no Supabase:

- **Acesso por página** — catálogo em `governanca_paginas` (`pagina_id`), concessões por
  colaborador em `governanca_acessos_paginas`. Uma consulta (`gov_meus_acessos`) resolve o acesso
  da página **e** destrava os cards do menu (admin vê tudo). Autorização por pessoa/página no
  painel de Administração (RPCs `gov_*`, restritas a admin).
- **Acesso por aba** — dentro de uma página, cada aba pode ser bloqueada **por pessoa** (denylist:
  liberada por padrão, admin vê tudo). Catálogo em `governanca_abas`, bloqueios em
  `governanca_abas_bloqueios`; a página consulta `gov_minhas_abas_bloqueadas` e o `gate.js` esconde
  (via CSS, sem flash) as abas marcadas com `data-aba-id`, reativando a 1ª visível se a ativa cair
  no bloqueio. Configuração no painel (`AdminGovernanca`), com **liga/desliga por aba** (recolhível).
  Marcado em 15 páginas (abas de função + de loja/unidade).
- **Portal embutido** — mobile em `Governanca.jsx` (capa em tela cheia) e `PainelExterno.jsx`
  (página avulsa por `/painel/:id`); desktop na área central do `DesktopShell`, onde os **atalhos
  abrem como abas vivas** (estilo navegador: ícone + fechar no rail, iframe mantido montado pra
  alternar sem recarregar). Todos usam o `GovFrame`.
- **Carregamento invisível** — o `GovFrame` segura um loader limpo até a página avisar que
  resolveu (`gov-ok`/`gov-denied`); a lista de acessos fica em cache na sessão do iframe, então a
  navegação interna libera na hora. A tela crua de "verificando acesso" não aparece.

O portão que roda em cada página é o `gate.js` (repositório `lideres`). Detalhes em
`docs/GOVERNANCA_INTEGRACAO.md` e `docs/AUTENTICACAO.md`.

## Perfis de acesso

`profiles.perfil` classifica o colaborador (default `colab`; é **manual** e **sobrevive ao sync**
do RHiD — não é sobrescrito). Além de `colab`/`admin`, há perfis granulares vindos da planilha de
RH: `lider`, `analista-rh`, `analista-compras`, `coord-financeiro`, `estoquista`, `lider-limpeza`,
`estagio-nutri`, `oficial-manutecao`. Hoje só `admin` (e, em Recrutamento, `analista-rh`) mudam de
verdade o que se vê; os demais estão gravados e **aguardam as regras**. Próximo passo: cortar
**acesso** e **valores sensíveis** (salário etc.) por perfil — bases que já nascem no Supabase (ex.:
`tata_refeicoes`) permitem o corte **seguro** por RLS; o legado ainda gateia por `isAdmin` no HTML.

## Documentação

O contexto detalhado do projeto — backend Supabase, modelo de pontuação, tipos de desafio,
séries de envio sequenciais, governança embutida, decisões e pendências — fica em
**`docs/CONTEXTO.md`**. É o documento de handoff, atualizado a cada bloco de trabalho (a §13
traz o histórico da sessão mais recente).

## Otimização e arquitetura (prioridade)

**Princípio do projeto: otimização, eficiência e o sistema o mais _clean_ possível.**
Toda mudança deve puxar nessa direção — e "clean" aqui **não** é "menos tabelas a qualquer
custo", é **responsabilidade única + zero duplicação + zero órfão**. Espremer tudo numa
tabela só (ou em blocos de JSON gigantes) deixa mais lento e mais bagunçado, não mais limpo.

Regras práticas antes de criar/alterar schema:

- **Antes de criar tabela nova**, verificar se o dado cabe numa existente (coluna ou `jsonb`
  quando a lista é pequena e "propriedade da linha", ex.: público-alvo de uma publicação) ou
  se **repete um padrão** já existente — nesse caso, **unificar** em vez de duplicar.
- **Config/singleton** pequeno (chaves, textos-modelo) não vira uma tabela por assunto: agrupa
  numa tabela de configuração única quando fizer sentido.
- **Remover o legado assim que migrado** (nada de tabela morta encostada).
- **RPCs enxutos**; índice só onde há filtro real; nada de coluna/tabela "por precaução".

Otimizações:

- [x] Fundir `publicacao_atribuicoes` em `publicacoes.alvos` (`jsonb`) — feito; o alvo é
      propriedade da publicação (‑1 tabela).
- [x] Remover o legado `comunicados` / `comunicado_leituras` / `comunicados_feed` (migrados para
      `publicacoes`) — feito (‑3 objetos).
- [ ] **Unificar o padrão de "atribuição/alvo"** entre `treinamentos` e `publicacoes` (hoje
      `treinamento_atribuicoes` ainda é tabela; publicações já usam `jsonb`) — a duplicação real
      a atacar quando for mexer nos desafios.
- [ ] Avaliar unir configs de singleton (`push_config`, `aniversario_config`, `destaque_config`)
      numa tabela de configuração única — hoje separadas por domínio.

> As tabelas que **têm** de existir por natureza (relação N‑para‑N como leituras, ou 1‑por‑aparelho
> como `push_subscriptions`) permanecem separadas — é o modelo correto e mais rápido.

## Conteúdo das trilhas (estado)

Detalhe por sessão em `docs/CONTEXTO.md` (§13–§14). Resumo:

- **Prontas:** Integração, Código de Ética, Qualidade, **Gente & Gestão** (12 desafios),
  Especiais (100% de Presença, Aniversário, Indicação, Saúde), Tatá News, **Tatá Plus**.
- **Gorjeta & Prêmio:** intros (vídeos) + **Metas & Prêmio mensal** — bancada de "caixinhas"
  por mês (série de conteúdo com janela de data), **direcionada por unidade+departamento**
  (alvo composto). Ver §14.
- **Soft Skill:** 3 submódulos (Inteligência Emocional, Missão dos Desbravadores, DISC).
  **Inteligência Emocional** montado (12/16); faltam 4 desafios de **formulário/texto livre**.

## Próximos passos

App em **estado de teste em campo** — o núcleo (perfil, ranking, feed, recompensas, desafios,
conquistas, comunicados, notificações, ouvidoria) está ligado ao backend e sem mock. Polimentos
combinados para a reta final, antes/junto do piloto:

- [ ] **Desafios por categoria** — organizar as trilhas em Gente & Gestão, Soft Skill, Feedback e
      Especiais (fechar a mecânica de formulário / texto livre que falta em IE)
- [x] **Comunicados / Notícias** — aba **Anúncios** unifica manuais + automáticos; publicação
      só‑imagem; mensagens dos automáticos editáveis por template
- [ ] **Card de destaque no tema claro** — degradê dos cards sem imagem precisa ficar legível no
      contraste claro (hoje texto branco fica fraco)
- [x] **Aniversário de empresa** — artes próprias **centralizadas** (`aniversario-cc`), 5 mensagens
      editáveis no painel, título automático por tempo de casa; upload novo já entra centralizado
- [x] **Cardápio (ciclo completo)** — governança planeja + status em 6 estágios (aprovação →
      Processamento → servir/finalizar → notas por unidade); app mostra o **cardápio do dia** (capa +
      `/cardapio`) com **avaliação** (nota 1–5, trava após salvar) e **alerta de restrição** pessoal;
      perfil tem **Restrições Alimentares**. Falta: ponte com **Compras** (2→3→4), automação por
      **data** (4→5) e **Relatórios**. Ver seção **Cardápio**.
- [x] **Configuração para desktop** — shell de 2 painéis (rail + painel do app + área central)
- [x] **Abas de governança no desktop** — atalhos abrem como abas vivas (estilo navegador) no rail
- [x] **Bloqueio de acesso só pelo app** — portão `ModoApp` (libera só na PWA instalada)
- [x] **Governança só pelo app** — páginas abrem embarcadas no Plus (token via `postMessage`),
      acesso por página ao vivo e carregamento invisível (sem login no portal)
- [x] **Acesso por aba** — bloqueio de abas individuais por pessoa, em 15 páginas de governança
- [x] **Perfis granulares** — `perfil` da `profiles` carregado com os níveis da planilha de RH
- [ ] **Valores por perfil** — esconder salário/custo por perfil (seguro via RLS nas bases novas)
- [ ] Afinar cores do tema claro

Roadmap e pendências detalhadas em `docs/CONTEXTO.md` (§11, §14).

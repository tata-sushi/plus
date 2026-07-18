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
│   ├── DesktopShell.jsx     # layout desktop: rail de ícones + painel do app + área central
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
│   ├── DestaqueBanner.jsx    # card do carrossel (publicação ou destaque automático)
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
│   ├── Cardapio.jsx         # cardápio da semana (conteúdo placeholder)
│   ├── QuestionarioDisc.jsx # questionário DISC (tela cheia)
│   ├── Mais.jsx / Login.jsx
│   ├── Governanca.jsx       # iframe do portal Líderes (tela cheia)
│   ├── Organograma.jsx      # iframe tela cheia (landscape) + botão flutuante
│   └── PainelExterno.jsx    # visualizador in-app das páginas de Governança
└── lib/
    ├── cn.js / haptics.js / tempo.js / signo.js / useCountUp.js
    ├── useDesktop.js        # detecta viewport de desktop (matchMedia)
    ├── desktopCanvas.js     # contexto da área central do desktop (portal/iframe)
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

Restam como **conteúdo placeholder** (ainda sem backend próprio, a migrar quando a Tatá House
tiver API): o **menu do dia** (Início) e o **cardápio da semana** (`/cardapio`), ambos em
`src/lib/mockData.js`. As rotas mortas de placeholder (Procedimentos, RH Fácil, Assistente IA)
foram removidas nesta limpeza pré-campo.

## Carrossel de destaques e automações

O carrossel da Início é montado pelo RPC `destaques()`, que junta duas origens:

- **Publicações manuais** — comunicado / notícia / aviso criados no painel (**Anúncios**).
  Título e texto são **opcionais** (dá pra publicar **só a imagem**); o público-alvo fica em
  `publicacoes.alvos` (`jsonb`). Aviso ainda dispara notificação (sino + push opcional).
- **Destaques automáticos** — aparecem sozinhos por condição, sem publicar nada:
  - 🎂 **Aniversário de vida** e 🏢 **Aniversário de empresa** — no dia, sorteiam **1 arte**
    (imagem + mensagem + alinhamento próprios) do pool **daquele tipo**. Imagens em
    `aniversario_imagens` (coluna `tipo`, `mensagem`, `alinhamento`), mensagens-modelo em
    `aniversario_mensagens`, liga/desliga em `aniversario_config`.
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
- [ ] **Aniversário de empresa** — subir artes próprias e revisar textos (já separado do de vida)
- [ ] **Cardápio** — dar backend próprio ao menu do dia e ao cardápio da semana (hoje placeholder)
- [x] **Configuração para desktop** — shell de 2 painéis (rail + painel do app + área central)
- [x] **Bloqueio de acesso só pelo app** — portão `ModoApp` (libera só na PWA instalada)
- [ ] Ponte de sessão da Governança (login único do app → portal Líderes) na mesma origem
- [ ] Afinar cores do tema claro

Roadmap e pendências detalhadas em `docs/CONTEXTO.md` (§11, §14).

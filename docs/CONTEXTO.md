# Tatá Plus — Contexto do Projeto (handoff)

> Documento de continuidade. Se a conversa travar, uma nova sessão deve **ler este
> arquivo primeiro** para retomar sem perder contexto. Última atualização: visual unificado das
> bancadas (modelo Qualidade) + TATÁ + (envio com rótulo, leitura+prova em 2 páginas, avaliação/NPS)
> + séries de envio **sequenciais** (Indicação Premiada e Saúde em Dia, 10 vagas, em Especiais)
> + Aniversário de Empresa + Governança embutida em **iframe** (portal Líderes) + Home em **grid 2-col**.
> Ver **§13** para o detalhamento dessa sessão.

---

## 1. Visão geral

**Tatá Plus** — PWA de portal do colaborador da **Tatá Sushi**.
- **Frontend:** Vite + React 18 + React Router 6 + Tailwind + `vite-plugin-pwa`.
- **Deploy:** GitHub Pages, domínio **plus.tatasushi.tech** (CNAME no repo). O deploy
  builda o `main` automaticamente via GitHub Actions.
- **Repo:** `tata-sushi/plus`. Branch de trabalho: **`claude/pwa-configuration-07mlwt`**.
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions + pg_cron/pg_net).
  - Project id: **`aoqsbusfrffapjglpqjk`** · URL `https://aoqsbusfrffapjglpqjk.supabase.co`

---

## 2. Regras e convenções (IMPORTANTES)

- **Só mexer no schema `tata_plus`.** NUNCA tocar em `tata_abastecimento`.
- **`profiles` é read-only** — é sincronizada diariamente (8h) do RHiD. A gente consome,
  não escreve. **Exceção:** a coluna `perfil` é preservada no sync (`perfil = ex.perfil || 'colab'`),
  então `perfil='admin'` setado manualmente persiste.
- **Chave canônica = `matricula`** (não e-mail). Cadeia de identidade:
  login JWT (e-mail) → `profiles` (por e-mail) → `matricula` → todo o resto.
- **RLS travado:** tabelas com RLS on e sem grants ao cliente. Todo acesso do cliente é
  via funções `SECURITY DEFINER`. Helper `tata_plus.minha_matricula()` devolve a matrícula
  do caller (por e-mail do JWT) **só se `status='Ativo'`**.
- **Acesso só de ATIVOS** — reforço triplo: app (AuthContext derruba inativo), RLS
  (`minha_matricula` exige Ativo) e Auth (edge function bane inativos).
- **Fluxo Git:** desenvolver na branch → commit → push → abrir PR → **merge squash** no
  `main` → **reancorar** a branch (`git checkout -B <branch> origin/main` + push
  `--force-with-lease`). O usuário costuma pedir "merge" após cada bloco.
- **Importações em massa:** sem conexão direta ao banco. Gera-se o SQL via Python
  (openpyxl) a partir dos .xlsx, e cola-se o VALUES dentro de `execute_sql` (e-mails e
  números são seguros de transcrever). Idempotência via DELETE-then-INSERT por origem, ou
  `on conflict do nothing`.
- O usuário aplica **parte** do SQL de schema ele mesmo (diz "pronto"); o assistente roda
  verificações e importações via MCP `execute_sql`.

---

## 3. Frontend — estrutura

- `src/lib/supabase.js` — client com `db:{schema:'tata_plus'}`, anon key.
- `src/lib/AuthContext.jsx` — auth central. Expõe `usuario` `{matricula, nome, primeiroNome,
  cargo, loja/unidade, departamento, perfil, status, avatarUrl, podePublicar,
  governanca:{tem,tipo}}`. Login e-mail+senha; derruba não-ativos em foco/navegação/intervalo.
  Métodos: `signIn, signOut, updatePassword, definirAvatar(url)`.
- `src/lib/theme.js` — tema claro/escuro (get/apply, persiste em `localStorage['tp_theme']`).
- `src/lib/tempo.js` — helpers de data (dataCurta, dataBR fuso-safe, ehHoje, eventoVigente).
- `src/lib/icons.js` — mapa de ícones lucide (resolveIcon).
- `src/lib/mockData.js` — dados mock ainda usados (currentUser p/ fallbacks de rank/progresso,
  menuDoDia, cardapioSemanal, acessosRapidos, redesSociais, recompensasCatalogo, feedComunidade).
- **Rotas** (`src/routes/`): Home, Login, Comunidade (Feed), Comunicados, Treinamentos,
  Ranking, Recompensas, Governanca, Cardapio, Ouvidoria, Mais, Manutencao, Jornada,
  Procedimentos, RhFacil, AssistenteIa, Perfil.
- **Componentes** (`src/components/`): AppShell, BottomNav, Header, Card, Section, Avatar,
  Tabs, ProgressBar, ProgressRing, IconTile, PromoCard, SocialLinks, ComingSoon, Badge,
  ProfileView, **DestaqueBanner**.

### BottomNav (5 itens, grid-cols-5)
`Início · Ranking · Feed(/comunidade) · [Governança|Ouvidoria] · Mais`
O 4º slot **reveza**: `governanca.tem` → **Governança** (`/governanca`, `ShieldCheck`); senão
**Ouvidoria** (`/ouvidoria`, `Ear`). Ver §13.

### Menu "Mais" (lista de navegação)
Cardápio, Comunicados, Minha jornada, Treinamentos, Procedimentos, Recompensas, RH Fácil,
Assistente IA, Painel de manutenção (+ **Ouvidoria** para quem tem Governança, já que ela sai da
barra nesse caso). + Carteira real (`meu_saldo`) no header do perfil.
+ Seção **Aparência** (toggle Claro/Escuro). Rodapé: assinatura "TATÁ PLUS · versão 2.0 /
Desenvolvido por Victor Carvalho · Gestão e Inovação".

---

## 4. Tema claro/escuro

- Cores migradas de hex fixo → **variáveis CSS (canais RGB)** em `src/index.css`:
  `:root` (escuro, default) e `:root[data-theme='light']` (claro).
- `tailwind.config.js` usa `rgb(var(--x) / <alpha-value>)` p/ cada cor (suporta `bg-accent/25` etc).
- Tokens novos: `border-line`, `bg-fill`, `ring-line` (substituíram os `white/*` que sumiam
  no claro — troca feita em massa via sed nos `.jsx`).
- Tema claro inspirado no **print da Nespresso** (off-white quente, cards brancos, texto
  escuro, verde mais fechado `--accent: 42 170 55` pra legibilidade).
- Toggle no Mais (`TEMAS` = Claro/Escuro), `applyTheme()` seta `<html data-theme>` +
  `<meta theme-color>` e persiste.
- Script **anti-flash** no `index.html` aplica o tema salvo antes da 1ª pintura.
- **Default = escuro** (claro é opt-in). Cores do claro ainda podem ser afinadas.

---

## 5. Pontuação — modelo de ledger

Tabela **`tata_plus.carteira_lancamentos`** `(id, matricula, origem, referencia_id, pontos,
descricao, created_at, unique(matricula,origem,referencia_id))`.
- `origem`: `'historico'` (total adquirido, +), `'resgate'` (−), `'treinamento'` (ganho no app, +).
- **Ranking = total adquirido** = soma de tudo que NÃO é resgate. `ranking()` usa
  `filter (where origem <> 'resgate')`.
- **Carteira/Saldo = adquirido − resgatado** = soma de TUDO. `meu_saldo()`.
- Ex.: Victor (matrícula 7) → ranking **9642** / saldo **7141** (resgatou 2501). ✔ verificado.

### Importação de pontos (fonte oficial: `users.xlsx`, coluna R=total, Q=saldo)
- Base persistida: **`tata_plus.gamificacao_import`** `(id, email, nome, total_adquirido,
  saldo, matricula, metodo)` — 382 pessoas.
- **Resolvedor `resolver_gamificacao()`**: casa e-mail **E** nome (normalizado sem acento,
  token-subset via `_norm`/`_toks`, extensões `unaccent`+`pg_trgm`) contra `profiles`, com
  cross-check e detecção de conflito. Preferência: e-mail+nome > só e-mail > só nome.
- Resultado: **347/382 resolvidos (91%)**, **211.459 pts** adquirido no pool do ranking.
  Métodos: email+nome 208, nome 127, email 12, conflito 2, sem_match 33.
- Reconstrução: **`sincronizar_pontos_historicos()`** — resolve + apaga historico/resgate +
  reinsere por matrícula.

---

## 6. Conclusões de desafios (histórico)

- Tabela de conclusão: **`tata_plus.treinamento_progresso`** `(matricula, treinamento_id,
  concluido_em)`, PK `(matricula, treinamento_id)`.
- Desafios: **`tata_plus.treinamentos`** com `id_externo` (id da plataforma Comunitive) +
  `tata_plus.trilhas`. 141 desafios migrados como metadata.
- Base persistida: **`tata_plus.desafio_import`** `(email, id_externo, concluido_em)` —
  4.934 conclusões (`Aceito`) de 233 pessoas em 127 desafios (fonte: `challenge_results.xlsx`).
- Reconstrução: **`sincronizar_conclusoes_historicas()`** — resolve matrícula via
  `gamificacao_import` (join por e-mail) + `treinamentos.id_externo`, insere em
  `treinamento_progresso` com `on conflict do nothing` (NUNCA apaga conclusões feitas no app).
- Resultado: **4.755 conclusões** vinculadas, **98 ativos** com progresso. Victor = 23 feitos. ✔
- A barra de progressão e os cadeados de sequência já leem `treinamento_progresso`.

### Histórico de respostas (quem respondeu o quê)
- Tabela **`tata_plus.treinamento_respostas`** `(id, matricula, treinamento_id, bloco_indice,
  questao_id, opcao_id, acertou, respondido_em)`. `bloco_indice` = null quando é prova de
  desafio simples; preenchido quando é uma prova dentro de um bloco do Código de Ética.
  Índices em `matricula` e `(treinamento_id, respondido_em)`. RLS on (leitura só via função/admin).
- Gravada **no servidor**, dentro de `responder_prova` e `responder_bloco`: cada tentativa
  insere **uma linha por questão** (a opção marcada + se acertou). Guarda TODAS as tentativas,
  não só a que passou — dá pra ver onde as pessoas erram mais.
- Começou a registrar **a partir de agora**; as respostas dos meus testes anteriores não
  ficaram salvas (a tabela não existia). Pendente: uma função/painel de leitura desse histórico.

---

## 6b. Provas / quiz nos desafios (correção no servidor)

- **`treinamentos.prova`** (jsonb) — desafio com prova: `{aprovacao:100, questoes:[{id,
  enunciado, opcoes:[{id, texto, correta}]}]}`. Aprovação = **100%** (tem que acertar tudo).
- **Anti-cola:** o gabarito **nunca** vai pro cliente. `abrir_treinamento()` devolve a prova
  **sem o campo `correta`**. A correção é toda no servidor:
  - **`responder_prova(p_treino, p_respostas)`** — corrige, e se aprovar já conclui o desafio
    (respeita limite 3/dia + desbloqueio sequencial + atribuição) e credita os pontos. Em caso
    de erro devolve só a **lista de `erradas`** (ids das questões erradas), **nunca** a certa.
  - O gabarito só é revelado **depois de concluído** (`abrir_treinamento` manda `gabarito`
    quando `concluido=true`), pra pessoa relembrar o que marcou.
- **`components/ProvaDesafio.jsx`** — prova respondida na mesma tela (sem modal, sem sobrepor
  o texto, decisão do usuário p/ dificultar cola). Cabeçalho "Hora da revisão!". Regra de cor:
  ao errar, a opção marcada fica **vermelha** e **não** revela a certa (a pessoa tenta de novo
  até acertar); só quando o desafio já está **concluído** a certa aparece em **verde** (leitura).
- É o **primeiro de muitos** — o modelo (jsonb + correção no servidor + esse componente) é o
  padrão pra provas dos próximos desafios.

## 6c. Código de Ética — leitura guiada em blocos + assinatura

- Trilha **logo após a Integração**. O texto (desenhado por advogado — manter a coerência
  jurídica ao editar) foi quebrado em **14 partes** (`treinamentos.blocos`, jsonb array).
  Cada bloco = `{titulo, html, acao, ...}` com `acao` ∈:
  - `prova` — verificação de 1+ questões (corrigida por **`responder_bloco(p_treino, p_indice,
    p_respostas)`**, mesmo esquema anti-cola; exige 100% pra avançar; grava no histórico).
  - `aceite` — caixa "Li e concordo" (texto em `aceite`).
  - `assinatura` — bloco final; termo + **assinatura no dedo** (`components/AssinaturaPad.jsx`,
    canvas com pointer events, só pra dar a sensação de assinar; o traço **não** é salvo).
    Concluir = **`assinar_codigo_etica(p_treino)`** (credita pontos + marca conclusão).
- **`components/CodigoEtica.jsx`** — leitor passo-a-passo: um bloco por vez, barra "Parte X de
  N", avança conforme a `acao`. Reaberto depois de concluído, navega livre e mostra o gabarito
  das provas em verde. Personaliza `{{user.name}}`/`{{user.first_name}}` no texto.
- **Trilhinha na lista** (`routes/Treinamentos.jsx`) — ao expandir o Código de Ética, mostra as
  14 partes como "casinhas" numeradas conectadas por linha, **5 por linha**, colunas alinhadas
  (slots invisíveis preenchem a última linha). Só o **nó 1** (ou o cabeçalho) abre o desafio;
  os outros números são só visual. `treinamentos_do_usuario()` devolve `blocos_total` pra isso.
- **`blocos` é sanitizado** igual à prova: `abrir_treinamento` remove `correta` das opções
  (gabarito só quando concluído).

## 7. Sync automático (reage a mudança de dado, não a relógio)

- **`sincronizar_tudo()`** — gated por freshness (`max(profiles.updated_at)` vs
  `sync_controle.ultima_origem_ts`). Roda via pg_cron a cada ~10 min; só age quando o
  `profiles` muda. Ordem:
  1. `sincronizar_auth_users()` — identidade, rotatividade (id_pessoa), avatar do Storage, novos.
  2. `sincronizar_pontos_historicos()` — re-resolve e reconstrói a carteira histórica.
  3. `sincronizar_conclusoes_historicas()` — religa conclusões (on conflict do nothing).
  4. `pg_net` → edge function **`sync-auth`** (cria conta nativa senha `tata@123`, bane inativos).
- Edge functions: **`sync-rhid`** (RHiD→profiles, preserva perfil+email, verify_jwt=true),
  **`sync-auth`** (verify_jwt=FALSE, chamável via pg_net).
- **Efeito prático:** quando os e-mails/nomes faltantes forem preenchidos no `profiles`, os
  pontos e conclusões daquelas pessoas religam **sozinhos** no próximo sync.

---

## 8. Notícias — motor de destaques (Fase 1 pronta)

- **`tata_plus.destaques()`** (SECURITY DEFINER) — lê o estado do colaborador e devolve
  cards priorizados: desafio liberado hoje (100), desafios pendentes (70), posição no
  ranking (60), saldo da carteira (30). **Blindado por `minha_matricula()`** (sem JWT → vazio;
  cada pessoa só vê o dela). O comunicado NÃO está no motor (é card separado).
  Retorna: `chave, categoria, prioridade, titulo, texto, cta_label, cta_to, template`.
- **`DestaqueBanner`** (`src/components/DestaqueBanner.jsx`) — fundo por template de categoria
  (gradiente placeholder até chegarem as artes; `d.imagem_url` entra por cima quando houver),
  ícone decorativo, scrim, título/subtítulo/CTA. Rótulo "Notícias".
- **Home:** busca `destaques()`, mostra **um por visita** (rotaciona via
  `localStorage['tp_destaque_rot']`).
- **Fase 2 (RH, futuro):** quando a base de RH subir no Supabase (absenteísmo, sanções,
  banco de horas, gorjeta — com **matrícula** como chave), adicionar geradores novos no
  motor. Alertas de RH devem ser: **privados** (RLS por matrícula), **tom de apoio** (não
  ameaça), e os mais duros talvez num espaço "Meus avisos" separado do banner alegre.

---

## 9. Funções DB principais (schema `tata_plus`)

`minha_matricula()`, `pode_publicar()` [perfil='admin'], `acesso_governanca()`,
`tem_acesso_treinamento(mat,treino)`, `treinamentos_do_usuario()`, `abrir_treinamento(p_treino)`,
`concluir_treinamento(p_treino)` [limite 3/dia por `(concluido_em at tz 'America/Sao_Paulo')::date`],
`ranking()`, `meu_saldo()`, `meu_progresso_desafios()` [feitos/total/pct dos desafios visíveis,
usado no anel do card de identificação], `definir_meu_avatar(url)`, `recompensas_disponiveis()`, `resgatar(p_recompensa)`, `meus_resgates()`, `registrar_leituras()`/`ler_comunicados()`,
`sincronizar_auth_users()`, `sincronizar_tudo()`, `sincronizar_pontos_historicos()`,
`sincronizar_conclusoes_historicas()`, `resolver_gamificacao()`, `destaques()`,
helpers `_norm(text)` / `_toks(text)`.
Views/tabelas chave: `colaboradores_publicos` (SECURITY DEFINER, security_invoker OFF —
NÃO recriar como invoker senão quebra ranking/feed), `comunicados_feed`, `carteira_lancamentos`,
`treinamento_progresso`, `treinamentos`, `trilhas`, `gamificacao_import`, `desafio_import`,
`governanca_acessos`, `sync_controle`, `rotatividade_log`, `auth_users`.

---

## 10. Módulos — estado atual

| Módulo | Estado |
|---|---|
| Login e-mail+senha (Supabase) | ✅ real |
| Gate de ativos (app+RLS+Auth) | ✅ |
| Comunidade (Feed): posts, foto, likes, comentários | ✅ real + histórico antigo importado (99 posts + 85 comentários) |
| Comunicados: publicação admin, views, data evento, imagem, "em vigor" | ✅ real |
| Avatares (em `auth_users`, auto-link do Storage, troca própria) | ✅ real |
| Treinamentos/Desafios (trilhas, unlock sequencial, 3/dia, pontos) | ✅ metadata + consumo + **provas (correção no servidor) + histórico de respostas** |
| Integração — Missão/Visão/Valores (texto + vídeo Cinthia Moreno + prova) | ✅ real |
| Código de Ética (14 partes, leitura em blocos, provas, aceites, assinatura) | ✅ real |
| Ranking (pódio, filtros Geral/Unidade/Depto) | ✅ real |
| Notícias (motor destaques + banner rotativo) | ✅ Fase 1 |
| Tema claro/escuro | ✅ (cores do claro a afinar) |
| Carteira real no Mais (`meu_saldo`) | ✅ |
| Governança (portal Líderes **embutido em iframe** + revezamento do botão) | ✅ `routes/Governanca.jsx` → `lideres.tatasushi.tech`; acesso via `governanca_acessos`. Ponte de sessão `lideres_session` = próximo passo (§13) |
| TATÁ + (trilha livre: envios com rótulo, leitura+prova, avaliação/NPS) | ✅ ver §13 |
| Séries de envio sequenciais (Indicação Premiada, Saúde em Dia — 10 vagas) | ✅ em Especiais, ver §13 |
| Aniversário de Empresa (reconhecimento por tempo de casa) | ✅ ver §13 |
| Cardápio | 🟡 mock (cardapioSemanal); app real de trás fica pra depois |
| Recompensas | ✅ real: catálogo importado do Comunitive (16 prêmios, pontos = mesma moeda, `detalhes`/"como usar" por item, emoji placeholder — fotos do Comunitive são privadas/403, subir pelo painel). Painel admin (`/recompensas/admin`, gate `podePublicar`) cadastra/edita/ativa via `admin_salvar_recompensa`/`admin_listar_recompensas`; `resgatar()` debita saldo (origem `resgate`) e abate `estoque`. Catálogo abre janelinha (bottom-sheet) com foto/regras/resgate. |
| Ouvidoria | 🟡 iframe externo |
| RH Fácil / Assistente IA / Jornada / Procedimentos | 🟡 placeholders |

---

## 11. Pendências / Roadmap

**Fila:**
- **Fase 2 RH** — plugar absenteísmo/sanções/banco de horas/gorjeta como geradores de
  Notícias + espaço "Meus avisos" + definir tom. (bloqueado até a base RH subir no Supabase).
- **Resgates históricos:** ✅ importados 298 registros (Comunitive) vinculados por e-mail
  (`profiles.email`), como **histórico read-only** — inseridos SÓ em `resgates` (nenhum
  `carteira_lancamentos`), então saldo/ranking intactos. Marcador de histórico = `recompensa_id IS NULL`
  (coluna virou nullable). Status: Rejeitada→cancelado, Entregue→entregue, resto→solicitado.
  49 não casaram (e-mail fora do cadastro). Reimportável: `delete ... where recompensa_id is null` + re-rodar.
- **Elegibilidade por item:** colunas `recompensas.elegivel_admissao_de` (só quem tem
  `profiles.data_admissao >= X`) e `limite_por_pessoa` (máx. resgates não-cancelados por pessoa,
  contados por `lower(titulo)` → pega histórico também). `recompensas_disponiveis()` esconde o que
  a pessoa não pode ver; `resgatar()` revalida (erros `nao_elegivel`/`ja_resgatado`).
  Ex.: **Kit Boas-Vindas** (custo 0, ilimitado, `elegivel_admissao_de='2026-01-01'`,
  `limite_por_pessoa=1`) → só admitidos em 2026+ que ainda não pegaram. `admin_salvar_recompensa`
  NÃO mexe nessas colunas (preserva no edit). Editar regras pela UI = pendente.
- **Fluxo de entrega:** ✅ aba **Pedidos** no painel `/recompensas/admin` (só `podePublicar`).
  `admin_listar_pedidos()` lista os resgates do app (exclui histórico via `recompensa_id is null`),
  solicitados primeiro. `admin_atualizar_resgate(p_id, p_status)`: Solicitado→Entregue (não mexe em
  pontos, já debitados no resgate); Cancelar estorna (apaga o lançamento `resgate` + repõe estoque);
  reabrir re-debita. Ponto sai no RESGATE, não na entrega. ✔ testado (resgate −31→estorno restaura).
- **Recompensas — pendentes:** (a) **automação Trello** — a cada resgate, disparar card
  (webhook Supabase→API Trello, ou n8n); (b) aviso ao colaborador quando marcar entregue;
  (c) gerador "recompensa ao alcance" nas Notícias; (d) fotos reais dos itens (Comunitive privadas/403);
  (e) reabastecer estoques (vários em 0).
- **Provas/quiz** — ✅ correção no servidor (anti-cola), 100% pra passar, histórico de respostas
  (`treinamento_respostas`). Pendente: painel/relatório de leitura desse histórico (onde erram mais).
- **Tipo "envio moderado"** — colaborador envia → admin valida.
- **Painel admin** — CRUD de treinamentos/atribuições/grupos.
- **Conteúdo dos desafios (por categoria):** replicar categoria a categoria.
  - ✅ **TATÁ NEWS (30)** — tipo "ler PDF no app". Coluna `treinamentos.arquivo_url`; os 30
    apontam pra `desafios/tata-news-01.pdf`…`30` (por `ordem`). `abrir_treinamento()` devolve
    `arquivo_url`; a tela renderiza o PDF como páginas via **pdf.js** (`components/PdfViewer.jsx`,
    `pdfjs-dist` carregado sob demanda — iframe não renderizava inline no celular) + botão
    "Li e concluir" (usa `concluir_treinamento`, tipo segue 'conteudo'). Bucket **`desafios`** (público, upload admin).
    Falta: usuário subir os 30 PDFs no bucket.
  - ✅ **Integração (3 vídeos)** — trilha movida pro TOPO (ordem 0). Os 3 desafios existentes
    (histórico preservado) apontam pra `desafios/integracao-01.mp4` (Boa-vindas), `-02`
    (Missão, Visão e Valores), `-03` (Apresentação TATÁ Plus); "História TATÁ Sushi" inativo (ordem 4).
    `components/VideoPlayer.jsx`: vídeo inline + `onAssistido` no ended → libera "Concluir desafio".
    Detecção por extensão do `arquivo_url` (mp4/webm/mov = vídeo; senão PDF). Falta subir os 3 MP4s.
    - **Missão/Visão/Valores** (Integração, 2º desafio) — vira **texto + vídeo do YouTube**
      (Cinthia Moreno, `gjWs9TbLCQM`) na mesma tela + prova. Vídeos do YouTube em
      `treinamentos.midias` (jsonb), player `components/VideosYouTube.jsx`/`VideosLista`
      (anti-pular + trava paisagem). `abrir_treinamento` devolve `midias`.
  - ✅ **Código de Ética** — trilha nova logo após a Integração; 14 partes em blocos com
    provas/aceites/assinatura (ver §6c). Conteúdo todo carregado no `blocos`.
  - 🟡 **Bar & Bebidas** (em andamento) — desafio "Sakê Hakutsuru": texto de intro + **vídeo do
    YouTube** (Sonia Yamane) + **PDF**. PDF vai no bucket `desafios`. Aguardando link do vídeo.
  - Extras TATÁ NEWS: prateleira de jornalzinhos (grid 4 col, sem caixa, #30→#1, estados por cor),
    pontos da trilha na capa "(300 pts)", gate de rolagem ("Role para realizar o desafio"),
    celebração animada ao concluir, pontos na pill do topo. Todos os 30 valem 10 pts.
  - Pendentes: demais categorias (texto HTML + rehospedar as 135 imagens Comunitive/403 no bucket `desafios`).
- **Artes das Notícias** — trocar gradientes placeholder por imagens base (só preencher
  `imagem_url` por categoria).
- **8 ativos sem e-mail** no `profiles` (o usuário vai preencher; religam sozinhos):
  matrículas 1 (Cinthia), 2 (Fabio Shiguematsu), 5 (Eduardo Godinho), 8 (Tito CEO),
  9 (Luiz Mori), 10 (Leonardo Young), 24077 (Paulino), 3 (Ana Macedo).
- **35 pessoas sem_match** da gamificação (majoritariamente desligados; entram se voltarem
  ao `profiles`).
- **Governança Fase 2** — SSO/token pro portal externo (lideres.tatasushi) + limpeza de
  acesso em rotatividade.
- **Afinar cores do tema claro.**

---

## 12. Home — estado atual (✅ concluído)

Ordem das seções na Início (`Home.jsx`):
1. Card de identificação (compacto) — **`ProgressRing` de % para todos**.
2. **Menu do dia**
3. **Notícias** (seção com título "Notícias") — banner quadrado (`DestaqueBanner`). **Unificado com o Comunicado**: quando
   há comunicado, ele entra aqui com **prioridade** (mostra sempre que existir) e uma **pílula
   "Comunicado"** (accent). Sem comunicado, rotaciona os destaques de gamificação (um por
   visita). O comunicado voltou ao motor `destaques()` como candidato `categoria='comunicado'`,
   prioridade 110.
4. **TATÁ PLUS** — **grid de 2 colunas** (sem scroll lateral): tiles verticais mais altos
   (`PromoCard`, `min-h 150px`, cantos 8px, ícone maior no topo, nome+descrição embaixo).
   Cards: **Treinamentos** e **Recompensas**. O card de Governança **foi removido** daqui
   (acesso agora pelo botão da barra de navegação).

(O card do **Mais** também mostra o `ProgressRing` de desafios.)

Card de Notícias (`DestaqueBanner`) em **formato quadrado 1:1** (`aspect-square`), conteúdo ancorado no rodapé.

**Responsivo por altura:** breakpoints `hsm` (max-height 800px) e `hxs` (700px) no
Tailwind compactam a home em telas curtas (banner de Notícias, gaps `mt-4→mt-3`, padding do
card). Em telas altas fica na proporção cheia.

**Próximos candidatos:** afinar cores do tema claro; trocar gradientes das Notícias por
artes reais (`imagem_url`); Fase 2 RH.

---

## 13. Sessão recente — visual unificado, TATÁ +, séries sequenciais e Governança embutida

### Sistema visual das bancadas (modelo Qualidade)
Padrão único de estado em todas as trilhas/bancadas (Presença, TATÁ NEWS, Código de Ética,
Aniversário, séries do TATÁ +):
- **feito / já passou** = chip verde escuro (`bg-accent-soft`, `#20301A`) + ícone **citric** (`text-accent`, `#70FF41`);
- **aberto / atual** = círculo **citric** com ícone preto (`bg-accent text-black`);
- **futuro** = cinza (`text-muted-2 opacity-40`) + cadeado.
Badges (V/X/cadeado) "colam" no ícone (canto sup. dir.), rótulos brancos. TATÁ NEWS reordenado **#1→#30**.

### Novos tipos de desafio
- **Envio moderado com rótulo** — `treinamentos.envio_rotulo` (ex.: `currículo`, `certificado`,
  `exame ASO`, `print da avaliação`, `print`, `cartão de ponto`). `EnvioDesafio` usa o rótulo no
  texto de anexo; **`admin_moderar_envio` usa o rótulo na notificação** (antes era fixo "cartão de
  ponto" — bug corrigido nesta sessão).
- **Leitura + prova em 2 páginas** — `components/LeituraProva.jsx`: lê o PDF numa página e faz a
  prova em outra (não dá pra consultar durante). Detecção: `arquivo_url` (PDF) **e** `prova`.
  **Timer de 1 dia** após reprovar (`treinamentos.prova_espera_horas` + tabela
  `treinamento_tentativas`); **as respostas erradas NÃO são gravadas** (só o timestamp da tentativa).
  Estilo "Parte X de Y" (como o Código de Ética) + link de download do PDF no fim.
- **Avaliação (nota / NPS)** — `treinamentos.avaliacao` (jsonb `{pergunta,min,max,rotulo_min/meio/max}`)
  + `components/Avaliacao.jsx` + `responder_avaliacao` + tabela `treinamento_avaliacoes`.

### TATÁ + (trilha **livre**, `trilhas.sequencial=false`)
Desafios avulsos ativos: **Certificado Não Se Cale** (envio 50), **Redes sociais** (envio 10),
**Spotify** (conteúdo + avaliação 10), **Prevenção ao Assédio** (PDF + prova 10), **Wellhub**
(conteúdo 20; vídeos Bunny/mediadelivery embutidos como iframe no `conteudo_html`), **Cartilha
Amarela** (PDF + prova 50). Os desafios que vieram da base antiga e não entraram no escopo foram
**desativados**. `responder_prova` respeita a flag `sequencial` da trilha (livre = não gateia).

### Séries de envio **sequenciais** (Indicação Premiada, Saúde em Dia) — na trilha **Especiais**
Cada série = **10 "vagas"** de envio na mesma `subcategoria`, com `treinamentos.serie_sequencial=true`.
Bancada no estilo TATÁ NEWS: a **vaga N+1 só abre quando a N é aprovada** pelo RH. Como cada vaga é
um `treinamento` próprio, a carteira credita pontos **por vaga** (unique `matricula+treino`) — sem
esbarrar na unicidade por desafio. Detalhes:
- `treinamentos_do_usuario` e `enviar_desafio` calculam a liberação por sequência (checam se as
  vagas anteriores, mesma `subcategoria`+`trilha`, estão concluídas). `enviar_desafio` bloqueia
  envio em vaga fechada (`vaga_bloqueada`).
- `components/Submodulo.jsx` tem o **variante sequencial** da bancada (detecção: série de envio
  **sem `data_inicio`**; presença é a série mensal, que tem data). Ícone por série
  (Indicação → `UserPlus`, Saúde → `HeartPulse`); número da vaga = **posição** na série (1→10),
  desacoplado da `ordem` global (permite posicionar a série na trilha sem bagunçar o rótulo).
- Ambas moram em **Especiais** (junto de 100% de Presença e Aniversário de Empresa), ordem 30–39
  (Indicação) e 40–49 (Saúde). Indicação = 80 pts/vaga (prêmio R$ 80 por contratação efetivada,
  resgatável); Saúde = 10 pts/vaga (ASO periódico).

### Presença / Aniversário de Empresa (trilha Especiais)
- **100% de Presença**: "Como funciona" recolhível no topo da bancada (regras completas, sempre
  acessível) + textos mensais curtos. Estados do calendário: **aberto=citric, X=não pegou,
  V=pegou, cadeado=futuro**. `competencia(data_inicio)` = mês de início (2 meses antes da janela).
- **Aniversário de Empresa** (renomeado de "Comemoração por tempo de casa"): `tipo=reconhecimento`,
  bancada de presentinhos (`Gift`), estados resgatado/disponível/já-passou/bloqueado; "Como
  funciona" + capa festa no detalhe (`IntroDesafio` + `PartyPopper`). `data_implantacao_reconhecimento()`
  define o corte retroativo; elegível a partir de 6 meses de casa.

### Governança embutida (portal Líderes)
- **BottomNav**: 4º botão **reveza** — **Governança** (`ShieldCheck`) p/ quem tem `governanca.tem`,
  senão **Ouvidoria**. Pra quem vê Governança na barra, a **Ouvidoria** entra como linha no **Mais**
  (ninguém perde o canal). Sem backend novo — `acesso_governanca()` já expunha `governanca.tem`.
- `routes/Governanca.jsx` virou um **iframe** do portal Líderes (`lideres.tatasushi.tech`,
  repo **`tata-sushi/lideres`**) — mesmo padrão da Ouvidoria (tela cheia, sem header).
- **Anatomia do portal:** ~**76 páginas HTML estáticas** (GitHub Pages, `/compliance/...`) + dados
  via **Google Apps Script / Planilhas**. A auth NÃO são 40 sistemas: todas as páginas leem **uma**
  sessão `localStorage['lideres_session']` = `{displayName, perfil, expiresAt, paginas:[{id,url}]}`
  e cada página só checa "essa página está na minha lista?". **Próximo passo:** ponte de sessão
  (o app grava o `lideres_session` depois do login) + servir as páginas na **mesma origem** do app
  (elimina o handoff cross-origin). **Migração Sheets→Supabase** fica para depois (o dono do repo
  fará quando o app estiver fechado).

### Home
Carrossel "TATÁ PLUS" virou **grid de 2 colunas** (sem scroll lateral): `PromoCard` reescrito como
tile vertical (`min-h 150px`, cantos 8px, ícone maior no topo, nome+descrição embaixo). Cards:
**Treinamentos** e **Recompensas**. Card de Governança **removido** do carrossel.

### Novas tabelas / colunas desta sessão
- `treinamentos.envio_rotulo` (text), `.prova_espera_horas` (int), `.avaliacao` (jsonb),
  `.serie_sequencial` (bool), `.subcategoria` (agrupa a bancada), `.tempo_casa_meses`, `.blocos`.
- `treinamento_envios` (envio moderado, PK `matricula+treino`), `treinamento_tentativas`
  (timer de reprova), `treinamento_avaliacoes` (nota/NPS). `trilhas.sequencial` (bool).
- Funções novas/alteradas: `enviar_desafio`, `admin_moderar_envio`, `responder_avaliacao`,
  `treinamentos_do_usuario` (lógica sequencial de vaga), `acesso_governanca`.

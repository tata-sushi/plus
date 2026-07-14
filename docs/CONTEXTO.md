# Tatá Plus — Contexto do Projeto (handoff)

> Documento de continuidade. Se a conversa travar, uma nova sessão deve **ler este
> arquivo primeiro** para retomar sem perder contexto. Última atualização: durante a
> construção do tema claro/escuro + motor de Notícias.

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
`Início · Ranking · Feed(/comunidade) · Ouvidoria · Mais`

### Menu "Mais" (lista de navegação)
Cardápio, Comunicados, Minha jornada, Treinamentos, Procedimentos, Recompensas, RH Fácil,
Assistente IA, Painel de manutenção. + Carteira real (`meu_saldo`) no header do perfil.
+ Seção **Aparência** (toggle Claro/Escuro).

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

---

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
| Comunidade (Feed): posts, foto, likes, comentários | ✅ real |
| Comunicados: publicação admin, views, data evento, imagem, "em vigor" | ✅ real |
| Avatares (em `auth_users`, auto-link do Storage, troca própria) | ✅ real |
| Treinamentos/Desafios (trilhas, unlock sequencial, 3/dia, pontos) | ✅ metadata + consumo |
| Ranking (pódio, filtros Geral/Unidade/Depto) | ✅ real |
| Notícias (motor destaques + banner rotativo) | ✅ Fase 1 |
| Tema claro/escuro | ✅ (cores do claro a afinar) |
| Carteira real no Mais (`meu_saldo`) | ✅ |
| Governança (tabela de acesso + gate do botão) | ✅ Fase 1 (portal externo é Google Sheets) |
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
- **Recompensas — pendentes:** (a) **fluxo de entrega** — status Solicitado→Entregue +
  cancelamento que estorna pontos (ao montar, separar o histórico via `recompensa_id is null`
  pra não misturar com pedidos novos); (b) **automação Trello** — a cada resgate, disparar card
  (webhook Supabase→API Trello, ou n8n); (c) gerador "recompensa ao alcance" nas Notícias;
  (d) fotos reais dos itens (as do Comunitive são privadas/403); (e) reabastecer estoques (vários em 0).
- **Provas/quiz** — perguntas, tentativas, cooldown 24h, desbloqueio de módulo.
- **Tipo "envio moderado"** — colaborador envia → admin valida.
- **Painel admin** — CRUD de treinamentos/atribuições/grupos.
- **Conteúdo HTML dos desafios** — importar + rehospedar imagens da Comunitive.
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
1. Card de identificação (compacto) — **`ProgressRing` de % para todos** (sem ícone de
   Governança no card; a Governança do líder fica no carrossel Sugestões e no card do Mais).
2. **Menu do dia**
3. **Notícias** (seção com título "Notícias") — banner quadrado (`DestaqueBanner`). **Unificado com o Comunicado**: quando
   há comunicado, ele entra aqui com **prioridade** (mostra sempre que existir) e uma **pílula
   "Comunicado"** (accent). Sem comunicado, rotaciona os destaques de gamificação (um por
   visita). O comunicado voltou ao motor `destaques()` como candidato `categoria='comunicado'`,
   prioridade 110.
4. **TATÁ PLUS** — carrossel horizontal com snap + **seta de deslize suave** (só o chevron, sem fundo); no fim
   da página. Para **líderes**, entra o card **Governança de Processos** (identidade carbon:
   `bgClassName='bg-carbon'`, `badgeClassName='bg-white text-carbon'`, `textClassName='text-white'`).

(O card do **Mais** também mostra o `ProgressRing` de desafios.)

Card de Notícias (`DestaqueBanner`) em **formato quadrado 1:1** (`aspect-square`), conteúdo ancorado no rodapé.

**Responsivo por altura:** breakpoints `hsm` (max-height 800px) e `hxs` (700px) no
Tailwind compactam a home em telas curtas (banner de Notícias, gaps `mt-4→mt-3`, padding do
card). Em telas altas fica na proporção cheia.

**Próximos candidatos:** afinar cores do tema claro; trocar gradientes das Notícias por
artes reais (`imagem_url`); Fase 2 RH.

# Backlog — Tatá Plus

Ideias e pendências levantadas para desenvolvimento futuro.

## Pendências

- [ ] **Governança (portal lideres) — permissão de "ver valores" (Cargos & Salários / Recrutamento)** —
  **Já feito (server-side, no banco):** (a) as RPCs de valores do Recrutamento
  (`vagas_sandbox_listar`, `cargos_salarios_sandbox_listar`, `rec_candidaturas_sandbox_listar`)
  passaram a decidir a permissão pelo **login real** (`tata_plus.minha_matricula()`) em vez da
  matrícula que o cliente mandava via `localStorage['sandbox_matricula']` — isso destravou os
  liberados (ex.: Thamires) e **fechou o furo** (dava pra setar `sandbox_matricula='7'` no console e
  ver todos os salários); (b) `perm_ver_valores` recebeu linha `geral` para os admins sócios/gerência
  (Cinthia 1, Fabio 2, Tito 8, Luiz 9). **Falta:**
  - [ ] **Tela "Liberar valores" no painel admin de Governança** — hoje `dp_rh.perm_ver_valores` só
    é editável direto no banco; já existem as RPCs (`perm_valores_listar`, `perm_valores_set`,
    `perm_valores_set_geral`, `perm_valores_sync`, `perm_valores_areas`), falta a UI que as consome
    (é por isso que "não tem opção de liberar no app" — permissão de valores é separada do acesso à página).
  - [ ] **Faxina no front** — remover o stub morto de sandbox (`_sandboxMatricula()` /
    `localStorage['sandbox_matricula']` / `p_matricula`) de `recrutamento.html` e `doc.html` no repo
    `lideres` (o backend já ignora o `p_matricula`). _(anotado em 2026-09-16)_

- [x] **Organograma em anéis (nativo)** — EM PRODUÇÃO (liberado a todos). Substitui o iframe antigo:
  centro com logo + sócios, anel de unidades (gira), gerência e coordenadores (Eduardo/Wellington)
  em anéis pontilhados que giram independente; alinhar líder + unidade no fundo abre a **equipe da
  unidade** embaixo (junta os alinhados). Cartão flutuante ao tocar, folha "Como funciona" (1ª vez +
  botão de ajuda). Dados: RPCs `organograma_lideres`/`organograma_time`/`organograma_reach` + tabela
  `organograma_faixa` (faixas 1 sócios · 2 gerência · 4 coordenadores · 3 líderes por regra de
  subordinado ativo). Ligado na Home e no Mais. _(concluído em 2026-09-17)_

- [x] **Exame agendado → card automático no Kanban do RH** — ao informar a data em Medicina
  Ocupacional (`exame_agendar`), nasce um card em **RH → Outros**: título "Exame agendado — {nome}",
  descrição (colaborador/cargo/unidade/tipo/data), prazo = data agendada, **responsável Thamires**
  e **etiqueta Medicina Ocupacional**; card novo a cada data informada; limpar a data não cria card.
  Tudo server-side na RPC `tata_plus.exame_agendar` (colunas `data_agendada`/`agendado_por`/`agendado_em`
  em `dp_rh.exames`; `exames_listar` devolve a data). Botão "Agendar exame" registrado no catálogo do
  painel admin de Governança (`governanca_abas`, tipo botão). **Testado OK.** _(feito 2026-09-16)_

- [ ] **Assinatura digital — Fase 2 (ICP-Brasil)** — Fase 1 COMPLETA (2026-08-22): documentos de
  texto (RH/política/recibo) **e PDF** com rubrica + selfie + trilha de auditoria; RH/líder cria,
  atribui e acompanha (tela `/assinaturas-admin`, vê selfie+rubrica+auditoria); colaborador tem a
  caixa "Assinaturas" (`/documentos`) + aviso na Home + notificação; comprovante imprimível (texto)
  e **PDF único carimbado** (pdf-lib) pra baixar/imprimir. Backend: tabelas `assinatura_*` (RLS só
  por RPC), bucket privado `assinaturas` (docs/rubricas/selfies/assinados), RPCs `docs_*`. **Falta:**
  nível **ICP-Brasil** via provedor externo (o modelo já tem o campo `nivel`). _(anotado 2026-08-22)_

- [ ] **Esquema de pontuação** — definir uma mecânica de pontos/recompensa (surgiu
  na conversa logo após o easter egg do rodapé do "Mais": clicar em "Victor Carvalho"
  → perfil do dev). Detalhar as regras depois. _(anotado em 2026-08-12)_

- [x] **Rádio 2.0 — Podcast "Tatá Cast"** — **EM PRODUÇÃO** (liberado pra todos). Entregue:
  player global (continua tocando ao navegar, mini-player com botão de fechar, **velocidade
  1x–2x**, trava de "não avançar"), **tela de admin** (upload de áudio/capa, nome, legenda,
  público, pontos, rascunho/publicado — `AdminPodcast.jsx`), episódios reais no banco
  (`tata_plus.podcast_episodios` + bucket `podcast`), **pontuação de verdade** ao concluir
  (`podcast_pontuar`, conta no ranking, 1×/episódio) e **check "concluído" persistente**
  (`podcast_meus_concluidos`). _(concluído em 2026-08-16)_
  - [ ] **Retomar de onde parou** nos episódios longos (hoje reinicia do zero). _(pendente)_
  - [ ] **Ep. 02 "Setembro Amarelo"** está como **rascunho** — ativar em setembro. _(lembrete)_

- [ ] **Jogo "Rota do Sushi"** (estilo *Zip* do LinkedIn) — 2º desafio diário: ligar os
  números 1→N arrastando e passando por todas as casas. Gerado pela data, sem manutenção.
  Fica como alternativa/complemento ao "Tatá Tango". _(anotado em 2026-08-20)_

- [x] **Solver rápido pro Tatá Tango (8×8 e 10×10)** — ~~o gerador só era rápido em 6×6
  (10×10 ~5s)~~. Feito: motor por **propagação lógica** (gera removendo pistas enquanto a
  dedução ainda fecha ⇒ único e dedutível). 10×10 caiu pra ~5ms. Tiers agora: 1–20 6×6
  fácil · 21–50 6×6 · **51–100 8×8** · **101+ 10×10**. _(feito 2026-08-21)_

- [x] **Abrir o "Tatá Tango" para todos** — ~~travado na matrícula 7~~. Feito: gates de front
  removidos (Jogo/Mais/Home) e `jogo_pode_ver` deixou de exigir matrícula 7. Regras do "Como
  jogar" viraram dinâmicas (metade por linha/coluna acompanha o tamanho). Prévia `?fase=N`
  segue só p/ matrícula 7. _(feito 2026-08-21)_

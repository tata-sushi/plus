# Backlog — Tatá Plus

Ideias e pendências levantadas para desenvolvimento futuro.

## Pendências

- [ ] **Esquema de pontuação** — definir uma mecânica de pontos/recompensa (surgiu
  na conversa logo após o easter egg do rodapé do "Mais": clicar em "Victor Carvalho"
  → perfil do dev). Detalhar as regras depois. _(anotado em 2026-08-12)_

- [ ] **Rádio 2.0 — Podcast "Tatá Cast"** — hoje em **teste, visível só pra matrícula 7**
  (aba Podcast dentro da Rádio; `src/routes/PodcastTab.jsx`, gate em `Radio.jsx`). Player
  nativo pronto (toca no app, **não deixa avançar**, pontua só ao concluir). Pendências pra
  ir pra produção:
  - [ ] **Hospedagem do áudio** — decidir MP3 no Supabase (bucket `podcast` **já criado**)
    vs. Spotify. Hoje usa um **áudio demo sintético (~24s)** embutido como data URI
    (`src/routes/podcastDemoAudio.js`, fora do precache via `globIgnores`).
  - [ ] **Episódios reais** — modelar/cadastrar (título, descrição, público, capa, duração,
    pontos, url do áudio) no lugar do mock hardcoded.
  - [ ] **Ligar a pontuação de verdade** — hoje é **visual**; creditar no
    `carteira_lancamentos` (origem `podcast`, `referencia_id`=episódio, `conta_ranking=true`,
    idempotente por episódio) ao concluir.
  - [ ] Decidir se ficam os **pontos** e as tags **"Para: \<setor\>"**.
  - [ ] **Remover a trava de teste** (aba só pra matrícula 7) quando liberar pra todos.
  _(anotado em 2026-08-15)_

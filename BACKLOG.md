# Backlog — Tatá Plus

Ideias e pendências levantadas para desenvolvimento futuro.

## Pendências

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

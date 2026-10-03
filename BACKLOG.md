# Backlog — Tatá Plus

Ideias e pendências de desenvolvimento. _Reorganizado em 03/10/2026._

---

## 🔧 Em andamento

_Nada em andamento no momento._

---

## ⏭️ Próximos

1. [ ] **Evento — janela de horário no check-in (anti-"cola")** — hoje o `evento_checkin` só
   confere se o evento está `ativo`; dá pra travar a pontuação pra fora da janela
   `data_inicio`–`data_fim` (quem escanear antes/depois não ganha). _Opcional, aguardando decisão._

---

## 📋 Backlog (parado)

- [ ] **Publicar o Tatá Plus nas lojas (Play Store / App Store)** — além do PWA, listar o app nas
  lojas (o app continua o mesmo PWA por dentro).
  - **Play Store (Android)** — empacotar o PWA como **TWA** via **Bubblewrap** ou **PWABuilder**.
    Precisa: conta Google Play Developer (US$ 25 única), publicar `assetlinks.json` no domínio
    (Digital Asset Links) e gerar o AAB.
  - **App Store (iOS)** — exige um **shell nativo** (Capacitor/WKWebView, ex. PWABuilder). Precisa:
    conta Apple Developer (US$ 99/ano). Atenção à review (diretriz 4.2 — "wrapper" web fino) e a
    **push** (ideal APNs nativo; web push só no PWA instalado, iOS 16.4+).
  - **A considerar:** ícones/splash por plataforma, manutenção do wrapper, ciclos de review, push.
  _(anotado em 2026-09-17)_

- [ ] **Assinatura digital — Fase 2 (ICP-Brasil)** — Fase 1 COMPLETA (2026-08-22): documentos de
  texto e PDF com rubrica + selfie + trilha de auditoria; RH/líder cria/atribui/acompanha; caixa
  "Assinaturas" do colaborador + PDF carimbado. **Falta:** nível **ICP-Brasil** via provedor
  externo (o modelo já tem o campo `nivel`). _(anotado 2026-08-22)_

---

## 🚫 Fora do nosso escopo (outro agente / time do portal)

- **Governança — tela "Liberar valores"** (Cargos & Salários / Recrutamento): é do **time do
  portal `lideres`**, não nossa. O backend já existe (RPCs `perm_valores_*`, `perm_ver_valores`;
  o gate de valores já decide pelo login real `minha_matricula()` e os admins sócios/gerência têm
  a linha `geral`). A UI de liberação fica com eles. _(registrado 01/10/2026)_

- **Faxina do stub de sandbox no portal (`lideres`)** — remover `_sandboxMatricula()` /
  `localStorage['sandbox_matricula']` / `p_matricula` (36 pontos em `doc.html`, `recrutamento.html`,
  `recrutamento-novo.html`). É **código morto/inofensivo** (o backend já ignora o `p_matricula`; em
  prod o localStorage nunca está setado) e é convenção/arquivo do portal → fica pro **time do portal**
  limpar numa passada deles. _(decidido 03/10/2026)_

---

## ✅ Concluído

- [x] **Eventos — criação/gestão no painel admin do app** (aba "Eventos" no painel, só pra quem
  tem `evento_pode_gerir`): criar evento com pontos por presença, gerar/baixar QR, ver presenças,
  editar e encerrar. Check-in por QR libera os pontos 1x por pessoa (`evento_checkin`, origem
  `evento`, conta no ranking). Aba embutida → abre igual no mobile e no desktop. _(03/10/2026)_
- [x] **Perfil — card "Desempenho"** (pontos fortes / a melhorar da avaliação do líder, self-scoped
  via `meu_feedback_desempenho`, com a data da avaliação inline). **LIBERADO PRA TODOS (03/10/2026)**.
  Perfil também reorganizado: "Meu perfil"→"Perfil", "Indicadores"→"Números Tatá Plus" (fundido com
  os desafios realizados), radar demo removido, ordem Perfil→Conquistas→Desempenho→Restrições→Números. _(03/10/2026)_
- [x] **Reconhecimento entre pares — mensagem obrigatória (mín. 20 caracteres)** — botão só
  habilita com motivo + mensagem ≥ 20 chars; placeholder "Compartilhe o motivo do reconhecimento.".
  _(03/10/2026)_
- [x] **Brainstorm nas Sugestões da Home** (gated por `podeBrainstorm`) + dicas das categorias em
  1ª pessoa ("Como estou me sentindo?" etc.). _(02–03/10/2026)_
- [x] **TATÁ NEWS #33** criada + botão **"Baixar PDF"** nos desafios de PDF puro. _(01–02/10/2026)_
- [x] **Pendências de avaliação de desempenho na tela Pendências** (por líder, `minhas_pendencias`
  tipo `desempenho`) + **deep-link** do app pra aba **Pendentes** da Performance (portal). _(01/10/2026)_
- [x] **Documentos — bolinha de pendência** (contador estilo WhatsApp) no tile da Home, atualiza
  no foco. _(29/09–01/10/2026)_
- [x] **Jornada TATÁ** (recompensas por tempo de casa) no ar: regra "tempo real com corte na
  implantação (01/08/2026)", resgate direto, 1 ano antes da largada = "Resgatado", acima = "Não
  elegível"; card do resgate no Feed com chip brilhante. _(set/2026)_
- [x] **Lojinha — liberada para todos** (RPC `lojinha_pode_acessar` = qualquer logado). _(25/09/2026)_
- [x] **Jornada — texto do botão de resgate**: fica só "Resgate". _(decidido 01/10/2026)_
- [x] **Esquema de pontuação** — finalizado. _(01/10/2026)_
- [x] **Rádio 2.0 — Podcast "Tatá Cast"** (player global, admin, pontuação) + "retomar de onde
  parou" + Ep. 02 "Setembro Amarelo". _(ago–out/2026)_
- [x] **Jogo "Rota do Sushi"** (2º desafio diário) — finalizado. _(01/10/2026)_
- [x] **Tatá Tango** — solver rápido 8×8/10×10 + aberto pra todos. _(21/08/2026)_
- [x] **Organograma em anéis (nativo)** — em produção, liberado a todos. _(17/09/2026)_
- [x] **Exame agendado → card automático no Kanban do RH** (RPC `exame_agendar`). _(16/09/2026)_
- [x] **Padronização de cabeçalho das páginas** (`CabecalhoPagina.jsx` em 19 páginas; renomes
  "Kanban Tatá"→"Kanban", "Rádio Tatá"→"Rádio"). _(20/09/2026)_

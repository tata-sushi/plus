# Backlog — Tatá Plus

Ideias e pendências de desenvolvimento. _Reorganizado em 03/10/2026._

---

## 🔧 Em andamento

- [ ] **Perfil — card "Meu desenvolvimento"** (pontos fortes / a melhorar, da avaliação de
  desempenho feita pelo líder). **EM TESTE só no usuário mat 7** (gate `verFeedback` em
  `src/components/ProfileView.jsx`); os demais seguem vendo "Ações — em breve". Backend pronto:
  RPC `tata_plus.meu_feedback_desempenho()` — **self-scoped** por `minha_matricula()` (sem
  parâmetro; cada um só vê o próprio), lê `dp_rh.avaliacoes` (modelo `desempenho`),
  `resultado->>'pontos_fortes'` / `->>'desenvolver'`. **Falta decidir o rollout:**
  (a) só depois da devolutiva (`devolutiva_em` preenchido), (b) pra todos que já têm feedback,
  ou (c) manter em teste. _(03/10/2026)_

---

## ⏭️ Próximos

1. [ ] **Faxina no front do portal (`lideres`)** — remover o stub morto de sandbox
   (`_sandboxMatricula()` / `localStorage['sandbox_matricula']` / `p_matricula`) de
   `recrutamento.html` e `doc.html` (o backend já ignora o `p_matricula`). _(anotado 2026-09-16)_
2. [ ] **Eventos / lista de presença** — criação de eventos e geração do QR vão pro portal de
   líderes; o app só **lê** o QR no hub de Check-in. `/eventos` saiu dos menus (rota mantida por
   trás, pros deep links). Nada urgente. _(atualizado 2026-09-20)_

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

---

## ✅ Concluído

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

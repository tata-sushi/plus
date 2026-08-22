# Integração — Gestão de Documentos (portal) × Assinatura (app)

Documento de coordenação entre **dois agentes / dois sistemas** que compartilham o
**mesmo projeto Supabase** (`aoqsbusfrffapjglpqjk`):

- **App Tatá Plus** (repo `tata-sushi/plus`, schema `tata_plus`) — onde vive a
  **assinatura do colaborador** (rubrica + selfie → PDF carimbado). _Já pronto (Fase 1)._
- **Portal de Governança** (repo `tata-sushi/lideres`, schema `dp_rh`) — onde vive a
  **gestão de documentos** (geração via admissão e outras páginas, upload direto, validação).
  _Em construção pelo outro agente._

> Como os dois schemas moram no **mesmo Postgres**, a integração deve acontecer
> **na base** (colunas de ligação + trigger/RPC), não por webhook.

---

## As 4 frentes (mapa geral)

| # | Frente | Onde | App entra? |
|---|--------|------|-----------|
| 1 | **Documentos gerados** no portal (admissão + outras páginas de governança) | Portal | Sim — vira atribuição de assinatura |
| 2 | **Assinatura do colaborador** (rubrica + selfie → PDF carimbado) | **App** | ✅ pronto |
| 3 | **PDFs subidos direto na base** (ex.: cartão de ponto) | Portal/base | Sim — precisa de ponto de entrada p/ virar atribuição |
| 4 | **Processo de admissão** (pessoa anexa documentos p/ validar → caem na base; gera documentos) | Portal | Parcial — só a parte de assinatura, se houver |
| + | **Validação** dos documentos assinados | Portal | Lê o resultado da assinatura |

---

## O que já existe do lado do app (contrato de assinatura)

**Tabelas** (`tata_plus`, RLS ligado, acesso só por RPC `SECURITY DEFINER`):
- `assinatura_documentos` — documento/modelo: `tipo` (rh/politica/recibo/pdf), `corpo_html` **ou**
  `arquivo_path`, `declaracao`, `exige_rubrica/exige_selfie`, `nivel` (simples/icp), `hash`, `versao`.
- `assinatura_atribuicoes` — quem assina: `documento_id`, `matricula`, `status` (pendente/assinado), `prazo`.
- `assinatura_registros` — a prova: `rubrica_path`, `selfie_path`, **`assinado_path`** (PDF carimbado),
  `ip`, `user_agent`, `doc_hash`, `doc_versao`, `assinado_em`.

**Storage** — bucket **privado** `assinaturas`: `docs/` (PDF origem) · `assinados/` (PDF carimbado) ·
`rubricas/` (PNG) · `selfies/` (JPG). Acesso só por URL assinada; RLS: dono / gestor / colaborador atribuído.

**RPCs** — gestão: `docs_criar`, `docs_atribuir`, `docs_painel`, `docs_painel_doc`; colaborador:
`docs_minhas`, `docs_pendentes_contagem`, `docs_abrir`, `docs_assinar`, `docs_definir_assinado`;
comprovante: `docs_comprovante`. Gestor = `docs_pode_gerir()` (perfil `admin` **ou** `lider`).

---

## Respostas aos 3 pontos da integração

### Ponto 1 — quem gera o PDF de origem
O botão do portal (ex.: `admissao-novo.html`) deve, em vez de só marcar `pendente_assinatura`,
**criar a atribuição de assinatura direto**. Proposta: um RPC único no app —

```
docs_enviar_para_assinatura(
  p_matricula, p_tipo, p_titulo, p_arquivo_path, p_declaracao,
  p_referencia_externa, p_exige_rubrica, p_exige_selfie
) -> { ok, documento_id, atribuicao_id }
```

que faz **criar + atribuir + linkar** numa chamada (gera notificação no app etc.).

**Decisão em aberto — onde mora o PDF de origem:**
- **Opção A (recomendada, simples):** o portal sobe o PDF gerado para `assinaturas/docs/{uuid}.pdf`
  (bucket do app). Funciona com as policies atuais, sem tocar em nada.
- **Opção B (sem duplicar arquivo):** o PDF fica em `dp-documentos`; adicionamos uma policy de
  leitura nesse bucket ligada à atribuição + uma coluna `arquivo_bucket` no modelo. Mais elegante,
  mas mexe no bucket do portal.

### Ponto 2 — ligar `dp_rh.colaborador_documentos` ↔ `assinatura_registros`
Adicionar **`referencia_externa text`** em `assinatura_documentos` (indexado). O portal passa a sua
chave — o `colaborador_documentos.id`, ou uma composta (`matricula|tipo|competencia`) — ao enviar
para assinatura. Assim toda assinatura é rastreável de volta à linha do portal.

### Ponto 3 — como o portal recebe o resultado (link do PDF carimbado)
Mesmo Postgres ⇒ integrar na base:
- **Push (recomendado):** trigger `AFTER INSERT` em `assinatura_registros` que, havendo
  `referencia_externa`, atualiza **direto** `dp_rh.colaborador_documentos`
  (`pendente_assinatura` → `entregue`, grava `assinado_path`). Imediato, sem polling.
- **Pull (alternativa/complemento):** RPC `docs_status_por_referencia(referencias[])` →
  `{ referencia_externa, status, assinado_path, assinado_em, matricula }`. O portal consulta quando quiser.

Para o **link final do PDF**: o portal gera uma URL assinada de `assinaturas/{assinado_path}` quando
precisar exibir/baixar (bucket privado; sem link permanente).

---

## Decisões em aberto (alinhar com o outro agente)

1. **Bucket do PDF de origem:** Opção A (`assinaturas/docs/`) ou B (`dp-documentos` + policy)?
2. **Formato da `referencia_externa`:** id da linha de `colaborador_documentos` ou chave composta?
3. **Push (trigger) vs Pull (RPC)** — ou os dois?
4. **Estrutura de `dp_rh.colaborador_documentos`** — preciso das colunas de status e do link para
   escrever o trigger (nomes exatos de status: `pendente_assinatura`, `entregue`, coluna do path…).
5. **Cartão de ponto e afins (frente 3):** entram por qual página/rota? Exigem **assinatura** ou só
   **ciência** (1 toque)? Um por competência/mês (referência = `matricula|mês`)?
6. **Frente 4 (admissão):** quais documentos são **gerados** (viram assinatura) × **anexados p/
   validação** (não passam pelo app)? A validação é feita em qual página?

---

## Contrato proposto a implementar (quando alinhado)

Do lado do app (`tata_plus`), aditivo e reversível:
- coluna `assinatura_documentos.referencia_externa text` (+ índice);
- `docs_enviar_para_assinatura(...)` — entrada única do portal (criar+atribuir+linkar);
- `docs_status_por_referencia(referencias[])` — leitura de status (pull);
- (se escolhido) trigger `AFTER INSERT` em `assinatura_registros` → atualiza `dp_rh.colaborador_documentos` (push).

_Status: aguardando alinhamento com o agente do portal antes de codar. Última atualização: 2026-08-22._

# Integração — Gestão de Documentos (portal) × Assinatura (app)

Coordenação entre **dois sistemas** no **mesmo projeto Supabase** (`aoqsbusfrffapjglpqjk`):

- **App Tatá Plus** (repo `tata-sushi/plus`, schema `tata_plus`) — **assinatura do colaborador**
  (rubrica + selfie → PDF carimbado). ✅ pronto.
- **Portal de Governança** (repo `tata-sushi/lideres`, schema `dp_rh`) — **gestão de documentos**
  (geração via admissão e outras páginas, upload direto, validação). Em construção.

> Os dois schemas moram no **mesmo Postgres** ⇒ integração **na base** (colunas de ligação +
> trigger + RPC), sem webhook.

**Status: integração app-side IMPLEMENTADA e testada ponta a ponta (2026-08-22).**

---

## Checklist até o término (foco conjunto)

**App (`tata_plus`) — ✅ concluído:**
- [x] coluna `referencia_externa` + índice
- [x] RPC `docs_enviar_para_assinatura` (criar+atribuir+linkar+notificar)
- [x] RPC `docs_status_por_referencia` (pull/reconciliação)
- [x] trigger `trg_assinatura_sync_dp` (push → atualiza `dp_rh.colaborador_documentos`)
- [x] helper `eh_servico()`; testado ponta a ponta (simulado) e limpo

**Portal (`dp_rh` / lideres) — em andamento:**
- [ ] RPC de pendência aceita `link_bucket` e grava `assinatura_atribuicao_id`
- [ ] botão "Salvar p/ Assinatura Digital" → upload em `assinaturas/docs/` + criar linha + chamar `docs_enviar_para_assinatura` + gravar `atribuicao_id`
- [ ] filtro de escopo: **exclui** Documentos Pessoais (RG/CPF/endereço); todo o resto assina (incl. cartão de ponto)
- [ ] `doc.html` lê `link_bucket` pra gerar a URL assinada
- [ ] corrigir doc espelho (cartão de ponto)

**Aceite conjunto (definition of done):**
- [ ] **Teste com documento REAL:** RH gera termo → envia → colaborador assina no app → PDF carimbado → linha do portal vira `entregue` → `doc.html` mostra o PDF assinado
- [ ] leitura do PDF assinado confirmada no `doc.html` (bucket privado: `service_role`/gestor)
- [ ] reconciliação (pull) disponível para atrasados
- [ ] docs dos dois lados sincronizados

**Fora do término (não bloqueia):** hardening do INSERT do bucket · Frente 4 (admissão) · ICP-Brasil (Fase 2).

---

## Decisões (fechadas com o agente do portal)

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Bucket do PDF de origem | **Opção A** — portal sobe pra `assinaturas/docs/{uuid}.pdf` |
| 2 | `referencia_externa` | **`dp_rh.colaborador_documentos.id`** (uuid da linha) |
| 3 | Retorno do resultado | **Push (trigger) + Pull (RPC)**, os dois |
| 4 | Tabela do portal | `dp_rh.colaborador_documentos` (status, `link`, `link_bucket`, `assinatura_atribuicao_id`) |
| 5 | Escopo — o que assina | **FECHADO:** todo documento passa por assinatura no app — **inclusive o Cartão de Ponto**. **Exceção:** Documentos Pessoais de admissão (RG, CPF, Comprovante de Endereço) = só anexo/conferência no `dp-documentos`, **não** passam pelo app. |
| 6 | Frente 4 (admissão) | Em aberto do lado do portal; não bloqueia. |

> ⚠️ **Correção (2026-08-22):** o item 5 substitui a recomendação inicial de que o Cartão de Ponto
> não assinaria. Decisão do usuário: **cartão de ponto assina** também. A única exceção são os
> Documentos Pessoais de admissão.

---

## Fluxo de integração (contrato)

1. **Portal gera o PDF** e sobe pra `assinaturas/docs/{uuid}.pdf` (bucket A).
2. **Portal chama** `tata_plus.docs_enviar_para_assinatura(...)` → recebe `{documento_id, atribuicao_id}`.
3. **Portal grava** `colaborador_documentos.assinatura_atribuicao_id = atribuicao_id` e
   `status = 'pendente_assinatura'`.
4. **Colaborador assina no app** → PDF carimbado gravado em `assinados/…` →
   **trigger** atualiza a linha do portal: `status='entregue'`, `link=<assinado_path>`,
   `link_bucket='assinaturas'`, `mime='application/pdf'`.
5. **Reconciliação (opcional):** portal chama `docs_status_por_referencia([...])` pra pegar atrasados.
6. **Exibir/baixar:** portal gera URL assinada do bucket `assinaturas` pra `link`.

**Autenticação do portal:** as RPCs aceitam **service_role** (chave de serviço) **ou** uma sessão de
gestor (perfil `admin`/`lider`). Gate = `docs_pode_gerir() OR eh_servico()`.

---

## API implementada (app-side, schema `tata_plus`)

```sql
-- entrada única do portal (cria documento + atribui + linka + notifica)
docs_enviar_para_assinatura(
  p_matricula text, p_tipo text, p_titulo text, p_arquivo_path text, p_declaracao text,
  p_referencia_externa uuid, p_exige_rubrica boolean default true,
  p_exige_selfie boolean default true, p_atribuido_por text default null
) -> jsonb { ok, documento_id, atribuicao_id }

-- reconciliação (pull): status por referências do portal
docs_status_por_referencia(p_referencias uuid[]) -> jsonb
  { ok, itens: [ { referencia_externa, documento_id, atribuicao_id, matricula,
                   status, assinado_path, assinado_em } ] }
```

- Coluna nova: `assinatura_documentos.referencia_externa uuid` (indexada) = `colaborador_documentos.id`.
- **Trigger** `trg_assinatura_sync_dp` em `assinatura_registros` (AFTER INSERT/UPDATE): quando
  `assinado_path` fica pronto, faz `UPDATE dp_rh.colaborador_documentos … WHERE assinatura_atribuicao_id = NEW.atribuicao_id`.
- Helper `eh_servico()` = chamada com role `service_role`.

**Teste realizado:** portal cria linha `pendente_assinatura` → `docs_enviar_para_assinatura` →
colaborador assina → PDF carimbado → linha do portal vira `entregue` com `link` no bucket
`assinaturas` (push), e `docs_status_por_referencia` reporta o mesmo (pull). Dados de teste removidos.

---

## O que já existe do lado do app (contrato de assinatura)

**Tabelas** (`tata_plus`, RLS ligado, acesso só por RPC): `assinatura_documentos`,
`assinatura_atribuicoes`, `assinatura_registros` (esta com `rubrica_path`, `selfie_path`,
`assinado_path`, `ip`, `user_agent`, `doc_hash`, `doc_versao`, `assinado_em`).

**Storage** — bucket privado `assinaturas`: `docs/` (origem) · `assinados/` (carimbado) ·
`rubricas/` · `selfies/`. Acesso só por URL assinada (RLS: dono / gestor / colaborador atribuído).

**RPCs de uso interno do app:** `docs_criar`, `docs_atribuir`, `docs_minhas`,
`docs_pendentes_contagem`, `docs_abrir`, `docs_assinar`, `docs_definir_assinado`, `docs_painel`,
`docs_painel_doc`, `docs_comprovante`, `docs_pode_gerir`, `docs_pode_ver_arquivo`.

---

## Pendências / próximos passos

1. **Portal (lideres):** corrigir o doc espelho (a recomendação antiga do Cartão de Ponto) e trocar
   o botão "Salvar p/ Assinatura Digital" da `admissao-novo.html` pra chamar
   `docs_enviar_para_assinatura`; ensinar `doc.html` a ler `link_bucket`. _(app-side já pronto.)_
- **Frente 4 (admissão):** definir quais documentos são **gerados** (→ assinatura) × **anexados p/
  validação** (não passam pelo app), e onde é a validação.
- **ICP-Brasil (Fase 2 do app):** o modelo já tem o campo `nivel`.

_Última atualização: 2026-08-22 — app-side implementado e testado; escopo (cartão de ponto assina) fechado._

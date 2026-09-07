# Painel de Pendências

Guia do sistema de **Pendências** — o card que mostra a cada pessoa o que
está em aberto pra ela (assinatura, avaliações, absenteísmo, exames, feriados,
recrutamento…). Este doc explica a arquitetura e, principalmente, **como
adicionar um tipo novo** (é rápido — quase sempre 3 passos).

## Visão geral

- Cada colaborador vê as **próprias** pendências; cada líder vê também as do
  **time** (roteadas pela hierarquia real). É só leitura — tocar num item leva
  à tela onde ele se resolve (Assinaturas, Avaliações ou o portal de Governança).
- Onde aparece: no **topo do Quadros** (pra quem tem Kanban) e na rota
  **`/pendencias`** (slot da barra de baixo, pra quem não tem Kanban). O slot só
  vira "Pendências" quando há alguma e some quando zera.
- **Fonte da verdade = RPC única** `tata_plus.minhas_pendencias()`. Cada tipo é
  um branch `UNION ALL` ligado/desligado por um flag no banco. Ligar ou desligar
  um tipo é **só um UPDATE** — não precisa deploy.

## Peças

### Banco (schema `tata_plus`)

| Objeto | Papel |
|---|---|
| `minhas_pendencias()` | RPC principal. Retorna `(tipo, colaborador_matricula, colaborador_nome, descricao, criado_em)`. Um `UNION ALL` por tipo, cada um atrás do seu flag `ativo`. `SECURITY DEFINER`. |
| `minhas_pendencias_n()` | `count(*)` da RPC acima — usada pela barra pra decidir o slot. |
| `pendencia_tipos` | Registro dos tipos: `slug, nome, ativo, ordem`. **Liga/desliga** cada tipo. |
| `norm_nome(text)` | Normaliza nome (minúsculo, sem acento) pra casar texto livre (ex.: `entrevistador`) com `profiles.nome`. |
| `pendencia_responsavel` | Mapa `unidade+departamento → líder`. **Reservado** (rollup futuro); os detectores atuais NÃO usam — veja "Roteamento". |

Helpers reaproveitados: `minha_matricula()` (matrícula do usuário logado, via JWT),
`acesso_governanca()` (retorna `'admin'`/`'lider'`/`null`), `av_lideranca_pendente()`.

### Frontend

| Arquivo | Papel |
|---|---|
| `src/components/PainelPendencias.jsx` | O painel (card + lista estilo "minhas tarefas"). Contém os mapas **`COR`** (cor da barrinha por tipo) e **`ROTA`** (pra onde toca; ausente = só leitura). |
| `src/routes/Pendencias.jsx` | Página `/pendencias` (leve, pra quem não tem quadros). |
| `src/routes/Quadros.jsx` | Renderiza `<PainelPendencias embutido />` no topo. |
| `src/lib/AuthContext.jsx` | Busca `minhas_pendencias_n` → expõe `usuario.pendencias`. |
| `src/components/BottomNav.jsx` | Lógica do slot: `usuario.pendencias > 0` e sem Kanban → "Pendências". |

## Roteamento — os 3 padrões

Cada branch decide **quem vê** a pendência de um jeito:

1. **Próprio (individual).** É a pendência do próprio usuário.
   `colaborador_matricula = v_mat`, `colaborador_nome = null`
   (o painel mostra só a descrição). Ex.: `assinatura`, `exp_colab`,
   `lideranca`, `exame_colab`.

2. **Hierarquia (líder → time).** Junta os subordinados pelo **superior direto**:
   `join profiles sub on sub.id_superior = v_idpessoa`.
   `colaborador_nome = sub.nome` (o painel mostra "nome · descrição").
   Ex.: `exp_lider`, `absenteismo`, `exame_lider`, `feriado`.

3. **Nome (quem conduziu).** Quando o dado tem só um nome em texto livre
   (ex.: `entrevistador`, `responsavel`), casa com o usuário via
   `norm_nome(campo) = v_nkey`. Ex.: `recrutamento`.

**Regras firmes:**
- **Sem fallback.** Se não resolve o dono (sem superior, nome não casa, célula
  sem líder), a pendência simplesmente **não aparece** pra ninguém. Nunca cai
  num admin/genérico.
- **Portal.** Tipos de líder cujo resolvem-se no portal exigem
  `v_gov = (acesso_governanca() is not null)` no `WHERE` e têm `ROTA` = `/governanca`.
  Isso evita beco sem saída (só vê quem consegue agir).
- **RH é só leitura.** Os detectores **LEEM** tabelas `dp_rh.*` (ausencias,
  exames, feriados_horas, rec_*), mas **nunca escrevem**. A gestão central do RH
  (kanbans do RH) fica intocada.

## Tipos atuais

| slug | fonte (dp_rh / tata_plus) | pendente quando | roteamento | público | abre |
|---|---|---|---|---|---|
| `assinatura` | `assinatura_atribuicoes` | `status='pendente'` | próprio | colaborador | Assinaturas |
| `exp_colab` | `avaliacoes` (exp14/60_colab) | 11d/40d sem a avaliação | próprio | novato | Avaliações |
| `lideranca` | `av_lideranca_pendente()` | período atual sem resposta | próprio | colaborador | Avaliações |
| `exp_lider` | `avaliacoes` (exp14/60_lider) | 11d/40d sem a avaliação | hierarquia | líder | Governança |
| `absenteismo` | `ausencias` | `tipo='Falta'` e `devolutiva` vazia | hierarquia | líder | Governança |
| `exame_colab` | `exames` | vencido ou vence em ≤30d | próprio | colaborador (leitura) | — |
| `exame_lider` | `exames` | vencido ou vence em ≤30d | hierarquia | líder | Governança |
| `feriado` | `feriados_horas` | `decisao` vazia | hierarquia | líder | Governança |
| `recrutamento` | `rec_entrevistas` + `rec_teste_dias` | entrevista `Aguardando devolutiva` / teste `Aguardando aprovação` sem `devolutiva_em` | nome | quem conduziu | Governança |

> Marcos configuráveis (ex.: 11/40 dias da experiência, janela de 30d do exame)
> vivem direto no SQL da RPC. O marco de experiência é **compartilhado** com
> `av_experiencia_colab_pendentes` — se mexer, mude nos **dois** lugares.

## Como adicionar um tipo novo

### Passo 1 — Banco: novo branch na RPC

Edite `tata_plus.minhas_pendencias()` (via `create or replace`):

1. Declare o flag: `a_novotipo boolean;`
2. Some ao `select ... into`:
   `coalesce(bool_or(ativo) filter (where slug='novotipo'), false)`
3. Se for de líder/portal, garanta que `v_gov`/`v_idpessoa` (e `v_nkey` se for por
   nome) sejam computados — inclua `a_novotipo` na condição do bloco
   `if a_exp_lider or a_absenteismo or ... then`.
4. Adicione o `UNION ALL` com o detector. Modelos:

**Próprio (individual):**
```sql
union all
select 'novotipo'::text, v_mat, null::text,
       ('Descrição curta e clara')::text, criado_em_col
from dp_rh.minha_fonte f
where a_novotipo and f.matricula = v_mat and f.<pendente?>;
```

**Hierarquia (líder → time):**
```sql
union all
select 'novotipo'::text, sub.matricula, sub.nome,
       ('Descrição — ' || detalhe)::text, f.created_at
from dp_rh.minha_fonte f
join tata_plus.profiles sub on sub.matricula = f.matricula
where a_novotipo and v_gov and v_idpessoa is not null
  and sub.id_superior = v_idpessoa and coalesce(sub.status,'')='Ativo'
  and f.<pendente?>;
```

**Nome (quem conduziu):**
```sql
union all
select 'novotipo'::text, f.id::text, coalesce(pessoa.nome,'—'),
       'Descrição'::text, f.created_at
from dp_rh.minha_fonte f
where a_novotipo and v_gov and v_nkey <> ''
  and tata_plus.norm_nome(f.campo_responsavel) = v_nkey
  and f.<pendente?>;
```

### Passo 2 — Banco: registrar o tipo
```sql
insert into tata_plus.pendencia_tipos (slug, nome, ativo, ordem)
values ('novotipo', 'Nome legível', true, 100)   -- ativo=false p/ deixar preparado sem ligar
on conflict (slug) do update set ativo=excluded.ativo;
```

### Passo 3 — Frontend: cor e rota
Em `src/components/PainelPendencias.jsx`:
```js
const COR  = { ..., novotipo: '#hexcor' }              // cor da barrinha (escolha um hue livre)
const ROTA = { ..., novotipo: '/governanca' }          // OMITA se for só leitura (sem ação)
```
Depois: `npm run build`, commit e push (branch **e** `main`).

### Ligar/desligar depois (sem deploy)
```sql
update tata_plus.pendencia_tipos set ativo = true  where slug='novotipo';  -- liga
update tata_plus.pendencia_tipos set ativo = false where slug='novotipo';  -- desliga
```

## Como verificar (simular a sessão de alguém)
```sql
with j as (select set_config('request.jwt.claims',
   json_build_object('email','<email do colaborador>')::text, false))
select p.* from j cross join lateral tata_plus.minhas_pendencias() p;
```

## Convenções de cor
Uma barrinha colorida por tipo. Em uso: âmbar `#f59e0b` (assinatura), azul
`#38bdf8` (exp_colab), roxo `#a78bfa` (exp_lider), rosa `#f472b6` (lideranca),
vermelho `#ef4444` (absenteismo), teal `#14b8a6` (exames), indigo `#6366f1`
(feriado), lima `#84cc16` (recrutamento). Escolha um hue distinto pro tipo novo.

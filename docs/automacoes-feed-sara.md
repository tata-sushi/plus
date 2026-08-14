# Automações do Feed — "Sara" (registro técnico)

Registro das publicações automáticas no feed (Comunidade). Tudo roda **dentro do
Supabase via `pg_cron`** — sem agente externo, servidor ou service_role em runtime.

_Última atualização: 2026-08-14._

## Contas-robô

| e-mail (chave estável)   | matrícula atual | nome            | status | papel                           |
|--------------------------|-----------------|-----------------|--------|---------------------------------|
| `bot1@tatasushi.tech`    | `7272`          | Sara            | `Bot`  | publica aniversário/boas-vindas |
| `bot2@tatasushi.tech`    | `bot2`          | Tatá Bastidores | `Bot`  | reservado (não usado ainda)     |

- `status='Bot'` (≠ `Ativo`) → ficam **fora** de ranking, busca de pessoas, aniversários.
- Nome/cargo/unidade vêm de `tata_plus.profiles`; avatar de `tata_plus.auth_users.avatar_url`.
- ⚠️ **A matrícula da Sara pode mudar** (ela foi renumerada de `bot1` → `7272` quando
  ganhou avatar/matrícula "de verdade"). Por isso o identificador **estável é o e-mail**:
  as funções resolvem a matrícula atual por `email='bot1@tatasushi.tech'` em tempo de
  execução — se renumerar de novo, os posts novos continuam saindo certos sozinhos.

## Formato dos posts (`tata_plus.posts`)

Campos ricos (usados pelos robôs; posts normais deixam null):
- `titulo` — manchete
- `texto` — corpo
- `midias` (jsonb) — array de URLs → **carrossel** no app
- `midia_url` — 1ª imagem (thumb/legado)
- `link_url` + `link_label` — botão de ação (CTA)
- `tipo` — usado como marcador/idempotência: `'aniversario'`, `'boas_vindas'`

**Menções clicáveis:** no `titulo`/`texto`, a marcação `@[Nome](matricula)` vira
**@Nome** clicável → abre `/perfil/<matricula>`.

O feed lê da view **`tata_plus.feed_posts`** (mostra tudo para todos — a trava de
teste que restringia à matrícula 7 foi **removida em produção**).

## Automação 1 — Aniversariantes

- **Função:** `tata_plus.publicar_aniversariantes()`
- **Cron:** `publicar-aniversariantes` — `0 12 * * *` (**todo dia 9h BRT**)
- **Lógica:** resolve a matrícula da Sara por `email='bot1@tatasushi.tech'`; pega quem é
  `status='Ativo'` e `data_demissao is null` e faz aniversário hoje (dia+mês); monta a
  menção de todos, sorteia 1 frase de `tata_plus.aniversario_mensagens` (tipo `nascimento`,
  ativas — 5 hoje) e publica 1 post como a Sara (`tipo='aniversario'`). Sem aniversariante
  → não publica.
- **Idempotência:** não repete se já houver post `tipo='aniversario'` da Sara no dia (SP).

## Automação 2 — Boas-vindas

- **Função:** `tata_plus.publicar_boas_vindas()`
- **Cron:** `publicar-boas-vindas` — `0 23 * * 1` (**toda segunda 20h BRT**)
- **Lógica:** pega admitidos na **semana passada** (seg–dom), `Ativo` e sem demissão,
  **que têm foto** no bucket `avatares` (`matricula.jpg/.jpeg/.png/.webp`); monta um
  **carrossel** (`midias`) + texto com menção e "Departamento · Unidade" por pessoa;
  publica como a Sara (`titulo='Boas-vindas ao time! 👋💚'`, `tipo='boas_vindas'`).
  Ninguém novo com foto → não publica.
- **Idempotência:** não repete no mesmo dia (SP).

## Dependência de dados

As duas dependem do `profiles` estar atualizado (sync `sync-tata-plus`, a cada 10 min).
Ex.: um cadastro duplicado/desatualizado (Ativo quando já saiu) entraria por engano —
o conserto é na **origem (RHID)/sync**, não na função (o filtro já é
`status='Ativo' AND data_demissao IS NULL`).

## Operação (comandos úteis)

```sql
-- ver jobs e últimas execuções
select * from cron.job where jobname like 'publicar-%';
select * from cron.job_run_details order by start_time desc limit 20;

-- pausar / religar
select cron.unschedule('publicar-aniversariantes');
select cron.schedule('publicar-aniversariantes','0 12 * * *',$$select tata_plus.publicar_aniversariantes();$$);

-- rodar na hora (teste)
select tata_plus.publicar_aniversariantes();
select tata_plus.publicar_boas_vindas();

-- descobrir a matrícula atual da Sara (identificador estável = e-mail)
select matricula, nome, status from tata_plus.profiles where email='bot1@tatasushi.tech';

-- avatar da Sara (troque 7272 pela matrícula atual, caso mude)
update tata_plus.auth_users set avatar_url='<url pública>' where email='bot1@tatasushi.tech';
```

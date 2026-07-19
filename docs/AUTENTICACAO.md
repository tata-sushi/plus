# Autenticação — Tatá Plus (referência para migração)

Guia do modelo de autenticação/autorização usado pelo app, para migrar as
páginas de **Governança de Processos** apontando para o backend correto.

---

## 1. Projeto Supabase

| Item | Valor |
| --- | --- |
| Project ID | `aoqsbusfrffapjglpqjk` |
| URL | `https://aoqsbusfrffapjglpqjk.supabase.co` |
| Schema de dados | **`tata_plus`** (não é `public`) |
| Chave pública (anon) | está em `src/lib/supabase.js` — segura no client, a proteção real é RLS |

Cliente JS (referência — `src/lib/supabase.js`):

```js
createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'tata_plus' },          // IMPORTANTE: schema tata_plus
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
```

> Toda página migrada deve usar **`db.schema = 'tata_plus'`** e a mesma URL/anon key.

---

## 2. Como o login funciona

- **Supabase Auth com e-mail + senha** (`supabase.auth.signInWithPassword`).
- Sessão persistida no aparelho e renovada automaticamente.
- Sem magic-link / sem OAuth (`detectSessionInUrl: false`).
- Logout: `supabase.auth.signOut()`.

A sessão emite um **JWT** que carrega o `email` do usuário. **Todo o modelo de
autorização parte desse e-mail.**

---

## 3. Como a identidade é resolvida (o coração do modelo)

Não existe FK direta entre `auth.users` e o colaborador. A ponte é o **e-mail**:

```
JWT.email  ──►  tata_plus.profiles (lower(email), status='Ativo')  ──►  matricula / perfil
```

`tata_plus.profiles` é a tabela mestre de colaboradores (sincronizada do RHiD).
Colunas relevantes: `matricula` (TEXT, chave), `email`, `nome`, `cargo`,
`unidade`, `departamento`, `perfil`, `status`, `data_admissao`, `lider`, etc.

### Funções-helper (use estas — não reimplemente a resolução de e-mail)

Todas são `STABLE SECURITY DEFINER`, `search_path = tata_plus, public`:

| Função | Retorno | O que faz |
| --- | --- | --- |
| `tata_plus.minha_matricula()` | `text` | matrícula do usuário logado (por e-mail, só se `status='Ativo'`) |
| `tata_plus.pode_publicar()` | `boolean` | `true` se `perfil = 'admin'` |
| `tata_plus.acesso_governanca()` | `text` | tipo de acesso à governança do usuário, ou `null` |

Definição de referência:

```sql
-- resolve o usuário logado -> matrícula
create function tata_plus.minha_matricula() returns text
language sql stable security definer set search_path to 'tata_plus','public' as $$
  select matricula from tata_plus.profiles
  where lower(email) = lower(auth.jwt() ->> 'email') and status = 'Ativo'
  limit 1
$$;
```

Dentro de qualquer policy/função, o "quem sou eu" é sempre:
`lower(auth.jwt() ->> 'email')`.

---

## 4. Papéis (roles) do Postgres

| Role | Quem | Acesso |
| --- | --- | --- |
| `anon` | antes do login (só a anon key) | praticamente nada (RLS bloqueia) |
| `authenticated` | usuário logado | apenas o que RLS **e** GRANT permitirem |
| `service_role` | jobs de backend (sync RHiD) | ignora RLS (uso server-side apenas) |

---

## 5. Governança (o que você vai migrar)

### Tabela ACL: `tata_plus.governanca_acessos`

| Coluna | Tipo |
| --- | --- |
| `matricula` | text |
| `tipo` | text |
| `created_at` | timestamptz |

- **RLS ligada e SEM grant direto para `authenticated`** → a tabela é lida
  **somente** via a função `acesso_governanca()` (SECURITY DEFINER). Não
  consulte `governanca_acessos` direto do client.
- Tipos de acesso hoje em uso (28 linhas):
  `admin`, `analista-compras`, `analista-rh`, `coord-financeiro`,
  `estagio-nutri`, `estoquista`, `lider`, `lider-limpeza`, `oficial-manutecao`.

### Como o app consome (`src/lib/AuthContext.jsx`)

```js
supabase.rpc('acesso_governanca').then(({ data }) => setGovTipo(data || null))
// exposto como:
usuario.governanca = { tem: !!govTipo, tipo: govTipo }
```

O catálogo de páginas hoje é estático em `src/lib/mockData.js`
(`governancaCatalogo`), abrindo cada URL num iframe in-app (rota `/painel/:id`,
`src/routes/PainelExterno.jsx`). Ex.: `lideres.tatasushi.tech/...`,
`escalas.tatasushi.tech/...`.

### Padrão recomendado para checar acesso numa página migrada

Front (já autenticado): use `usuario.governanca.tipo`, ou chame direto:

```js
const { data: tipo } = await supabase.rpc('acesso_governanca')
if (!tipo) { /* sem acesso */ }
```

Se precisar de checagem por tipo específico numa policy/RPC nova:

```sql
-- exemplo: "tem algum destes acessos?"
create function tata_plus.tem_governanca(tipos text[]) returns boolean
language sql stable security definer set search_path to 'tata_plus','public' as $$
  select exists (
    select 1 from tata_plus.governanca_acessos g
    where g.matricula = tata_plus.minha_matricula() and g.tipo = any(tipos)
  )
$$;
```

---

## 6. RLS + GRANT — a pegadinha nº 1

**Policy sozinha NÃO libera acesso.** No Postgres, a policy só *filtra linhas*;
o **privilégio da tabela** ainda precisa ser concedido ao role. Toda tabela nova
exige os dois:

```sql
create table tata_plus.minha_tabela ( ... );

alter table tata_plus.minha_tabela enable row level security;

-- 1) PRIVILÉGIO (sem isto, mesmo com policy, dá "permission denied"/silêncio)
grant select on tata_plus.minha_tabela to authenticated;
-- + insert/update/delete conforme a necessidade

-- 2) POLICY (filtra as linhas visíveis)
create policy minha_tabela_select on tata_plus.minha_tabela
  for select to authenticated
  using ( tata_plus.acesso_governanca() is not null );  -- ou tem_governanca(array[...])
```

Exemplo real já aplicado em `profiles`:
- GRANT: `SELECT` para `authenticated`.
- Policy `profiles_select_own`:
  `using (lower(email) = lower(auth.jwt() ->> 'email') and status = 'Ativo')`.

---

## 7. Onde está no código (frontend)

| Arquivo | Papel |
| --- | --- |
| `src/lib/supabase.js` | cria o client (URL, anon key, schema `tata_plus`) |
| `src/lib/AuthContext.jsx` | sessão, perfil, `usuario.governanca`, `podePublicar`, login/logout |
| `src/App.jsx` | portão de rota: sem `session` → redireciona para `/login` |
| `src/routes/Login.jsx` | tela de login (e-mail + senha) |
| `src/routes/PainelExterno.jsx` | visualizador in-app (iframe) das páginas de governança |
| `src/lib/mockData.js` | `governancaCatalogo` (lista de páginas/URLs) |

Portão de sessão (`src/App.jsx`):

```js
const { session, loading } = useAuth()
if (loading) return <Splash />
return session ? <AppShell /> : <Navigate to="/login" replace />
```

---

## Resumo de 30 segundos

1. Backend: Supabase, projeto `aoqsbusfrffapjglpqjk`, **schema `tata_plus`**.
2. Login por **e-mail + senha** (Supabase Auth) → JWT com `email`.
3. Autorização parte de `lower(auth.jwt() ->> 'email')` → `profiles` (`status='Ativo'`) → `matricula`/`perfil`.
4. Helpers: `minha_matricula()`, `pode_publicar()`, `acesso_governanca()`.
5. Governança: ACL em `governanca_acessos`, lida só via `acesso_governanca()`.
6. Tabela nova = **GRANT ao `authenticated` + policy RLS** (os dois, sempre).

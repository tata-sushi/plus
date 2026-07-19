# Portal de Líderes → Supabase (substituir o Google Apps Script)

Guia para migrar a autenticação/autorização do portal de Governança de Processos
(repo `tata-sushi/lideres`) do **Google Apps Script + planilha** para o **Supabase
do Tatá Plus**. O contrato de request/response é o **mesmo** — a mudança no portal
é trocar **uma constante**.

---

## 1. Onde ficam os dados (Supabase)

| Item | Valor |
| --- | --- |
| Project ID | `aoqsbusfrffapjglpqjk` |
| Schema | `tata_plus` |
| Catálogo de páginas | `tata_plus.governanca_paginas` |
| Acesso por pessoa × página | `tata_plus.governanca_acessos_paginas` |

`governanca_paginas` (uma linha por página `.html` de `compliance/`):
`pagina_id` (= o `PAGE_ID` do gate da página), `label`, `url`, `secao`, `sub`, `ordem`, `ativo`.

`governanca_acessos_paginas`: `matricula`, `pagina_id`. Uma linha = a pessoa vê aquela página.

> Quem gerencia isso é o **admin do Tatá Plus** (aba **Governança**): lista os
> colaboradores da base e libera página por página / pasta por pasta. Não há mais
> planilha.

---

## 2. O endpoint (novo `AUTH_URL`)

```
https://aoqsbusfrffapjglpqjk.supabase.co/functions/v1/gov-auth
```

Edge Function pública (sem JWT). CORS liberado. **Mesmo contrato** do Apps Script:

### `?action=listUsers`
Resposta:
```json
{ "ok": true, "usuarios": ["Nome do Líder 1", "Nome do Líder 2", "..."] }
```
Lista os nomes de quem tem acesso (admin ou com páginas liberadas). Popula o dropdown.

### `?action=auth&usuario=<NOME>&senha=<SENHA>`
`usuario` = o nome exato vindo do `listUsers`. Resposta de sucesso:
```json
{
  "ok": true,
  "nome": "Nome do Líder",
  "unidade": "Administrativo",
  "cargo": "...",
  "departamento": "...",
  "perfil": "lider",                       // ou "admin" (admin vê tudo)
  "paginas": [ { "id": "governanca-menu", "url": "/compliance/menucompliance.html" }, ... ]
}
```
Erro:
```json
{ "ok": false, "erro": "Usuário ou senha incorretos." }
```

Campos `variacoes`/`departamentos` que o portal lê são opcionais (o portal já usa
`|| ''` / `|| []`). Para `perfil: "admin"` o `paginas` vem vazio de propósito — o
gate do portal já libera tudo por `perfil === 'admin'`.

### Senha
Validada contra o **Supabase Auth** — é a **mesma senha do app Tatá Plus**. Os 19
líderes/admins ativos já têm conta com senha. (Se alguém novo for liberado e não
tiver senha do Plus, precisa definir uma no Plus primeiro.)

---

## 3. A única mudança no repo `lideres`

Trocar a constante `AUTH_URL` (em `index.html` e `index2.html`):

```js
// antes
const AUTH_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
// depois
const AUTH_URL = 'https://aoqsbusfrffapjglpqjk.supabase.co/functions/v1/gov-auth';
```

**Nada mais muda.** O `localStorage.lideres_session`, os gates por página
(`PAGE_ID`), os cadeados nos menus e a duração de sessão continuam iguais — eles já
consomem `data.paginas` no formato `[{id,url}]`, que é o que o endpoint devolve.

Se a chamada `fetch` sem header retornar 401 no ambiente de vocês, basta mandar o
header `apikey: <ANON_KEY>` (a mesma anon key pública já usada nas páginas que falam
com o Supabase). Em geral, com `verify_jwt` desligado, a chamada crua funciona.

---

## 4. Como o gate casa com o catálogo (por quê funciona)

O gate de cada página libera se `paginas` contém um item com **`id === PAGE_ID`**
**ou** cuja **`url` contém o `PAGE_URL_FRAG`** da página. O catálogo usa o próprio
`PAGE_ID` como `pagina_id` e guarda a `url` completa do arquivo — então os dois
casadores funcionam. Ideal (para robustez total): manter **`data-access-id` do chip
= `PAGE_ID` do gate** da mesma página.

---

## Resumo de 30 segundos
1. Endpoint: `https://aoqsbusfrffapjglpqjk.supabase.co/functions/v1/gov-auth` (mesmo contrato).
2. No repo `lideres`: trocar só a constante `AUTH_URL` em `index.html` e `index2.html`.
3. Senha = senha do Tatá Plus (Supabase Auth). Acesso gerenciado no admin do Plus.

// classificar-restricoes — a IA classifica pratos do cardápio por restrição
// alimentar, e grava as tags por NOME (cobre pratos gerados E manuais).
//
// Backfill: roda em lotes até não sobrar prato sem tag. Também pega nomes novos
// (manuais) numa próxima passada.
//
// Provider-agnóstico (OpenAI-compatible), mesmos secrets do gerar-cardapio:
//   LLM_API_URL / LLM_API_KEY / LLM_MODEL
//
// Chamada (POST, JSON, com JWT de admin): { "limit": 60, "dry_run": false }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM = `Você é um nutricionista que classifica pratos de um refeitório quanto a PROTEÍNA e adequação VEGETARIANA/VEGANA.
Para CADA prato da lista, diga com QUAIS restrições da LISTA ele conflita (ou seja, contém / não é adequado para quem tem aquela restrição).

REGRAS:
- Use EXATAMENTE os nomes da LISTA DE RESTRIÇÕES fornecida. Não invente nomes nem crie novos.
- "Carne de porco": bacon, linguiça, calabresa, costelinha/bisteca/lombo/pernil suíno, presunto, feijoada, tropeiro, torresmo, mortadela, salsicha, tender, etc.
- "Carne vermelha": carne bovina e outras carnes vermelhas (picanha, costela, carne moída, almôndegas, bife, cupim, cordeiro, etc.).
- "Frango": qualquer ave (frango, galinha, chester, peru).
- "Peixe": peixes (tilápia, merluza, salmão, bacalhau, sardinha, atum, etc.).
- "Frutos do mar": camarão, lula, polvo, marisco, mexilhão, lagosta, siri, etc.
- "Vegetariano": marque se o prato contém carne, ave, peixe ou frutos do mar (laticínio e ovo NÃO marcam vegetariano).
- "Vegano": marque se o prato contém QUALQUER produto de origem animal — carne/ave/peixe/frutos do mar, ovo, leite e derivados (queijo, creme de leite, manteiga, requeijão, molho branco, purê com leite), maionese, ou mel.
- NÃO classifique lactose, glúten, ovo, soja, amendoim, castanhas nem "Sem ..." — essas ficam FORA (são tratadas por outra camada). Restrinja-se EXCLUSIVAMENTE aos nomes da LISTA.
Se o prato não conflita com NENHUMA restrição da lista, devolva lista vazia [] para ele.

SAÍDA: responda APENAS com JSON válido, sem texto fora do JSON. Formato:
{"tags": {"<nome EXATO do prato>": ["<restrição>", "<restrição>"], "<outro prato>": []}}`

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(Number(body.limit ?? 60), 1), 200)
    const dryRun: boolean = body.dry_run ?? false

    const URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const auth = req.headers.get('Authorization') ?? ''
    // tudo com o JWT do chamador (admin da governança) — respeita o gate pode_cardapio
    const db = createClient(URL, ANON, { global: { headers: { Authorization: auth } }, db: { schema: 'tata_plus' } })

    const { data: pode } = await db.rpc('pode_cardapio')
    if (!pode) return json({ error: 'sem permissão para classificar' }, 403)

    const { data: nomesData, error: nerr } = await db.rpc('refeicoes_pratos_sem_tag', { p_limit: limit })
    if (nerr) return json({ error: 'pratos: ' + nerr.message }, 500)
    const pratos: string[] = nomesData ?? []
    if (!pratos.length) return json({ ok: true, total: 0, classificados: 0, msg: 'nada a classificar' })

    const { data: restData } = await db.rpc('refeicoes_restricoes_catalogo')
    const restricoes: string[] = restData ?? []

    const user =
      'LISTA DE RESTRIÇÕES (use EXATAMENTE estes nomes):\n' + restricoes.map((r) => '- ' + r).join('\n') +
      '\n\nPRATOS PARA CLASSIFICAR (devolva uma entrada por prato, com o nome EXATO):\n' +
      pratos.map((p) => '- ' + p).join('\n')

    const llmUrl = Deno.env.get('LLM_API_URL')!
    const llmKey = Deno.env.get('LLM_API_KEY')!
    const llmModel = Deno.env.get('LLM_MODEL') ?? 'openai/gpt-4o-mini'
    const r = await fetch(llmUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${llmKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://plus.tatasushi.tech',
        'X-Title': 'Tata Cardapio Restricoes',
      },
      body: JSON.stringify({
        model: llmModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!r.ok) return json({ error: 'LLM ' + r.status, detail: await r.text() }, 502)
    const out = await r.json()
    const content: string = out.choices?.[0]?.message?.content ?? ''
    let parsed: any
    try {
      parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, '').trim())
    } catch {
      return json({ error: 'JSON inválido do LLM', content }, 502)
    }
    const tagsMap: Record<string, string[]> = parsed.tags ?? {}

    // só aceita nomes de restrição que existem no catálogo
    const validas = new Set(restricoes)
    let n = 0
    const amostra: any[] = []
    for (const nome of pratos) {
      const tags = (tagsMap[nome] ?? []).filter((t) => validas.has(t))
      if (!dryRun) await db.rpc('refeicoes_tag_prato', { p_nome: nome, p_tags: tags })
      n++
      if (amostra.length < 8) amostra.push({ prato: nome, tags })
    }
    // ainda faltam? (pra saber se precisa rodar de novo)
    const { data: rest2 } = await db.rpc('refeicoes_pratos_sem_tag', { p_limit: 1 })
    const faltam = (rest2 ?? []).length > 0
    return json({ ok: true, total: pratos.length, classificados: n, dry_run: dryRun, faltam_mais: faltam, amostra })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

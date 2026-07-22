// gerar-cardapio — propõe um cardápio (rascunho) via LLM e grava em
// `aguardando_aprovacao` para o cozinheiro revisar/aprovar.
//
// Provider-agnóstico (OpenAI-compatible). Testado com OpenRouter.
// Secrets necessários (Supabase → Edge Functions → Secrets):
//   LLM_API_URL   ex.: https://openrouter.ai/api/v1/chat/completions
//   LLM_API_KEY   sua chave do provedor
//   LLM_MODEL     ex.: openai/gpt-4o-mini  (ou um :free do OpenRouter)
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY são injetados.)
//
// Chamada (POST, JSON):
//   { "inicio":"2026-07-27", "dias":6, "janela":5, "max_pesados":2,
//     "feriados":["2026-07-30"], "dry_run":true }
// dry_run=true só devolve a proposta (não grava).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM = `Você é o chef-nutricionista responsável pelo cardápio do refeitório do Tatá Sushi.
Sua tarefa é PROPOR um cardápio para revisão e aprovação do cozinheiro responsável —
nada do que você gerar vai direto para produção; um cozinheiro sempre revisa e aprova.

Estilo da casa: comida caseira brasileira de refeitório (executável com
ingredientes comuns, panela/forno). Toda refeição tem esta estrutura fixa:
  • 1 PRATO PRINCIPAL
  • 1 GUARNIÇÃO (acompanhamento do prato principal)
  • 1 GUARNIÇÃO FIXA = "Arroz e Feijão" (é sempre igual, todo dia)
  • 1 SALADA
  • 1 SOBREMESA
  • 1 BEBIDA (refresco de um sabor)

REGRAS OBRIGATÓRIAS (não pode violar):
1. Não repita o PRATO PRINCIPAL já servido nos últimos {{JANELA}} dias (lista em "JÁ SERVIDO").
   Variações claramente diferentes são permitidas.
2. Preferencialmente, não use a mesma FAMÍLIA de proteína (frango / carne bovina /
   suíno / peixe) em dois dias seguidos.
3. Domingos e feriados levam MARMITA (marque tem_marmita=true).
4. Equilíbrio nutricional na semana: no máximo {{MAX_DIAS_PESADOS}} dias com
   índice saudável < 70. Priorize índice alto no conjunto da semana.

LIBERDADE:
• Você PODE sugerir pratos novos (marque novo_prato=true), desde que sejam
  executáveis num refeitório e no estilo caseiro. Use o REPERTÓRIO como referência.
• Para pratos do repertório, use a nutrição conhecida. Para pratos novos, ESTIME
  a nutrição (kcal e macros por porção) com bom senso.

CONSIDERE (informativo, não bloqueia a geração):
• Restrições da equipe (lista em "RESTRIÇÕES"): quando o PRATO PRINCIPAL conflitar
  com alguma restrição, registre em alerta_restricao e lembre da substituição
  padrão da casa (OVO FRITO).

INSUMOS (obrigatório): para CADA prato do dia (principal, guarnição, guarnição fixa,
salada, sobremesa e bebida), liste os INSUMOS — as matérias-primas cruas para comprar.
Ex.: "Carne de Panela em Cubos com Batata" → ["carne bovina","batata inglesa"];
"Arroz e Feijão" → ["arroz","feijão"]; "Repolho Roxo com Cenoura" → ["repolho roxo","cenoura"].
É o que alimenta o Compras. Apenas o nome do ingrediente (sem quantidade).

SAÍDA: responda APENAS com JSON válido, sem texto fora do JSON. Todos os campos em
português. "Arroz e Feijão" DEVE aparecer (campo guarnicao_fixa). Formato:
{"cardapio":[{"data":"YYYY-MM-DD","dia_semana":"...","principal":"...","guarnicao":"...",
"guarnicao_fixa":"Arroz e Feijão","salada":"...","sobremesa":"...","bebida":"...",
"tem_marmita":false,"novo_prato":false,"nutricao":{"kcal":0,"proteina_g":0,"carb_g":0,
"gordura_g":0,"fibra_g":0,"porcao_g":0,"indice_saudavel":0},
"insumos":{"principal":["..."],"guarnicao":["..."],"guarnicao_fixa":["arroz","feijão"],"salada":["..."],"sobremesa":["..."],"bebida":["..."]},
"alerta_restricao":[],"justificativa":"1 frase"}],"resumo_semana":{"indice_medio":0,"variedade_proteinas":"...","observacoes":"..."}}`

function buildUser(ctx: any, datas: any[]): string {
  const lin = (arr: any[]) => (arr ?? []).map((x) => '- ' + x).join('\n')
  const feriados = datas.filter((d) => d.feriado).map((d) => d.data)
  return [
    'PERÍODO — gere um dia para cada data abaixo (marque tem_marmita=true nos domingos/feriados):',
    datas.map((d) => `- ${d.data} (${d.dia})${d.domingo ? ' [DOMINGO]' : ''}${d.feriado ? ' [FERIADO]' : ''}`).join('\n'),
    feriados.length ? `Feriados no período: ${feriados.join(', ')}` : '',
    '',
    'REPERTÓRIO DA CASA (principal | guarnição | Arroz e Feijão | salada | sobremesa (índice)):',
    lin(ctx.catalogo),
    '',
    'PRATOS MAIS SERVIDOS (evite concentrar nestes):',
    (ctx.top_pratos ?? []).map((t: any) => `- ${t.item} (${t.vezes}x)`).join('\n'),
    '',
    'JÁ SERVIDO recentemente (NÃO repetir o principal):',
    (ctx.historico ?? []).map((h: any) => `- ${h.data}: ${h.principal}`).join('\n') || '- (sem histórico)',
    '',
    'RESTRIÇÕES cadastradas na equipe (item → nº de pessoas):',
    (ctx.restricoes ?? []).map((r: any) => `- ${r.item}: ${r.pessoas}`).join('\n') || '- (nenhuma)',
    '',
    `SABORES de refresco disponíveis (varie ao longo dos dias): ${(ctx.sabores ?? []).join(', ')}`,
  ].join('\n')
}

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
    const inicio: string = body.inicio
    const dias: number = body.dias ?? 6
    const janela: number = body.janela ?? 5
    const maxPesados: number = body.max_pesados ?? 2
    const feriados: string[] = body.feriados ?? []
    const dryRun: boolean = body.dry_run ?? false
    if (!inicio) return json({ error: 'informe inicio (YYYY-MM-DD)' }, 400)

    const URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const auth = req.headers.get('Authorization') ?? ''

    // 1) permissão — com o JWT do chamador (admin da governança)
    const asUser = createClient(URL, ANON, {
      global: { headers: { Authorization: auth } },
      db: { schema: 'tata_plus' },
    })
    const { data: pode, error: perr } = await asUser.rpc('pode_cardapio')
    if (perr || !pode) return json({ error: 'sem permissão para gerar cardápio' }, 403)

    // 2) contexto — service role
    const svc = createClient(URL, SERVICE, { db: { schema: 'tata_plus' } })
    const { data: ctx, error: cerr } = await svc.rpc('cardapio_ia_contexto', {
      p_inicio: inicio,
      p_janela: janela,
    })
    if (cerr) return json({ error: 'contexto: ' + cerr.message }, 500)

    // 3) datas do período
    const DOW = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    const datas: any[] = []
    const d0 = new Date(inicio + 'T12:00:00')
    for (let i = 0; i < dias; i++) {
      const dt = new Date(d0)
      dt.setDate(d0.getDate() + i)
      const iso = dt.toISOString().slice(0, 10)
      datas.push({ data: iso, dia: DOW[dt.getDay()], domingo: dt.getDay() === 0, feriado: feriados.includes(iso) })
    }

    // 4) prompt
    const system = SYSTEM.replaceAll('{{JANELA}}', String(janela)).replaceAll('{{MAX_DIAS_PESADOS}}', String(maxPesados))
    const user = buildUser(ctx, datas)

    // 5) LLM (OpenAI-compatible)
    const llmUrl = Deno.env.get('LLM_API_URL')!
    const llmKey = Deno.env.get('LLM_API_KEY')!
    const llmModel = Deno.env.get('LLM_MODEL') ?? 'openai/gpt-4o-mini'
    const r = await fetch(llmUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${llmKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://plus.tatasushi.tech',
        'X-Title': 'Tata Cardapio',
      },
      body: JSON.stringify({
        model: llmModel,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
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
    const cardapio: any[] = parsed.cardapio ?? []

    // 6) preview (dry_run) ou grava rascunho
    if (dryRun) return json({ ok: true, dry_run: true, resumo: parsed.resumo_semana, cardapio })
    const { data: grav, error: gerr } = await svc.rpc('cardapio_rascunho_gravar', { p_dias: cardapio })
    if (gerr) return json({ error: 'gravar: ' + gerr.message }, 500)
    return json({ ok: true, resumo: parsed.resumo_semana, ...(grav as object), cardapio })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

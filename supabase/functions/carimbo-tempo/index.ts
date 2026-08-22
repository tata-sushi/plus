// Carimbo de tempo RFC 3161: recebe { sha256 } (hex de 64 chars) e devolve um
// token de tempo assinado por uma TSA pública gratuita (FreeTSA). O hash não é
// segredo; gate por JWT (verify_jwt) só pra evitar abuso do proxy.
//
// Deploy:  supabase functions deploy carimbo-tempo
// (verify_jwt fica ligado por padrão — o app chama via supabase.functions.invoke
//  com a sessão do usuário.)

const TSA_URL = 'https://freetsa.org/tsr'
const TSA_NOME = 'freetsa.org'

function hexToBytes(hex: string): Uint8Array {
  const clean = String(hex || '').trim().toLowerCase().replace(/[^0-9a-f]/g, '')
  if (clean.length !== 64) throw new Error('sha256 hex invalido')
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}

// TimeStampReq DER para SHA-256 com certReq=TRUE (template fixo + 32 bytes de hash)
function montarReq(hash: Uint8Array): Uint8Array {
  const prefixo = [
    0x30, 0x39, 0x02, 0x01, 0x01, 0x30, 0x31, 0x30, 0x0d, 0x06, 0x09,
    0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00,
    0x04, 0x20,
  ]
  const sufixo = [0x01, 0x01, 0xff]
  const out = new Uint8Array(prefixo.length + 32 + sufixo.length)
  out.set(prefixo, 0)
  out.set(hash, prefixo.length)
  out.set(sufixo, prefixo.length + 32)
  return out
}

function b64(bytes: Uint8Array): string {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[])
  }
  return btoa(s)
}

// heurística: acha o genTime (GeneralizedTime, tag 0x18) dentro do TSTInfo
function acharGenTime(resp: Uint8Array): string | null {
  for (let i = 0; i + 1 < resp.length; i++) {
    if (resp[i] === 0x18) {
      const len = resp[i + 1]
      if (len >= 13 && len <= 24 && i + 2 + len <= resp.length) {
        let txt = ''
        for (let j = 0; j < len; j++) txt += String.fromCharCode(resp[i + 2 + j])
        const m = txt.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
        if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`
      }
    }
  }
  return null
}

// OID do signedData (1.2.840.113549.1.7.2) — presença indica token emitido
const SIGNED_DATA_OID = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]
function temToken(resp: Uint8Array): boolean {
  outer: for (let i = 0; i + SIGNED_DATA_OID.length <= resp.length; i++) {
    for (let j = 0; j < SIGNED_DATA_OID.length; j++) {
      if (resp[i + j] !== SIGNED_DATA_OID[j]) continue outer
    }
    return true
  }
  return false
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    const hash = hexToBytes(body?.sha256)
    const reqDer = montarReq(hash)
    const r = await fetch(TSA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/timestamp-query' },
      body: reqDer,
    })
    if (!r.ok) throw new Error('tsa http ' + r.status)
    const resp = new Uint8Array(await r.arrayBuffer())
    if (!temToken(resp)) throw new Error('tsa nao emitiu token')
    const tempo = acharGenTime(resp)
    return new Response(
      JSON.stringify({ ok: true, tsa: TSA_NOME, tempo, token_base64: b64(resp) }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, erro: String((e as Error)?.message || e) }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

import { createClient } from 'npm:@supabase/supabase-js@2'

// Web Push (RFC 8291 aes128gcm + VAPID ES256) com SÓ Web Crypto + fetch.
// Sem libs externas: `web-push` (npm) e `@negrel/webpush` (jsr) não rodam/baixam
// no runtime Deno da Edge Function. Esta implementação em Web Crypto roda igual
// em Node e Deno e foi validada contra o FCM (201). Deploy: enviar_push (verify_jwt=true).
const enc = new TextEncoder()
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  const bin = atob(b64 + pad)
  const a = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i)
  return a
}
function bytesToB64url(a: Uint8Array | ArrayBuffer): string {
  const arr = new Uint8Array(a)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function concat(...arrs: Uint8Array[]): Uint8Array {
  let len = 0
  for (const a of arrs) len += a.length
  const out = new Uint8Array(len)
  let o = 0
  for (const a of arrs) { out.set(a, o); o += a.length }
  return out
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8)
  return new Uint8Array(bits)
}
async function vapidJwt(endpoint: string, subject: string, vapidPublic: string, vapidPrivate: string) {
  const aud = new URL(endpoint).origin
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600
  const payload = bytesToB64url(enc.encode(JSON.stringify({ aud, exp, sub: subject })))
  const signingInput = `${header}.${payload}`
  const pub = b64urlToBytes(vapidPublic)
  const x = bytesToB64url(pub.slice(1, 33))
  const y = bytesToB64url(pub.slice(33, 65))
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, d: vapidPrivate }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(signingInput))
  return `${signingInput}.${bytesToB64url(sig)}`
}
async function encryptPayload(sub: { keys: { p256dh: string; auth: string } }, payloadBytes: Uint8Array) {
  const uaPublic = b64urlToBytes(sub.keys.p256dh)
  const authSecret = b64urlToBytes(sub.keys.auth)
  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, concat(payloadBytes, new Uint8Array([2]))))
  const rs = new Uint8Array([0, 0, 0x10, 0x00]) // record size 4096
  const idlen = new Uint8Array([asPublic.length]) // 65
  return concat(salt, rs, idlen, asPublic, ct)
}
async function enviarUm(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payloadObj: unknown, vapid: { subject: string; publicKey: string; privateKey: string }) {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(payloadObj)))
  const jwt = await vapidJwt(sub.endpoint, vapid.subject, vapid.publicKey, vapid.privateKey)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '2419200',
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
    },
    body,
  })
  return res.status
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { pub_id } = await req.json()
    if (!pub_id) return json({ erro: 'pub_id_obrigatorio' }, 400)
    const url = Deno.env.get('SUPABASE_URL')!
    const authHeader = req.headers.get('Authorization') ?? ''
    // client do usuário: push_payload só devolve algo se for admin (pode_publicar)
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      db: { schema: 'tata_plus' },
      global: { headers: { Authorization: authHeader } },
    })
    const { data: payload, error } = await userClient.rpc('push_payload', { p_pub: pub_id })
    if (error) return json({ erro: error.message }, 400)
    if (!payload) return json({ erro: 'sem_permissao' }, 403)
    const subs = (payload.subs ?? []) as Array<{ endpoint: string; p256dh: string; auth: string }>
    if (!subs.length) return json({ enviados: 0, removidos: 0 })

    // service role: lê as chaves VAPID e limpa inscrições mortas
    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'tata_plus' } })
    const { data: cfg } = await svc.from('push_config').select('vapid_public, vapid_private, subject').eq('id', 1).single()
    if (!cfg) return json({ erro: 'sem_config' }, 500)
    const vapid = { subject: cfg.subject, publicKey: cfg.vapid_public, privateKey: cfg.vapid_private }
    const payloadObj = { title: payload.titulo, body: payload.corpo, url: payload.url }

    let enviados = 0
    const mortos: string[] = []
    await Promise.all(subs.map(async (s) => {
      try {
        const st = await enviarUm({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payloadObj, vapid)
        if (st >= 200 && st < 300) enviados++
        else if (st === 404 || st === 410) mortos.push(s.endpoint)
      } catch (_e) { /* erro de rede numa inscrição: ignora */ }
    }))
    if (mortos.length) await svc.from('push_subscriptions').delete().in('endpoint', mortos)
    return json({ enviados, removidos: mortos.length })
  } catch (e) {
    return json({ erro: String((e as Error)?.message ?? e) }, 500)
  }
})

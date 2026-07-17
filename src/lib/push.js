import { supabase } from './supabase.js'

// Web Push (notificação no celular via app instalado).
// Android: completo. iPhone: só com o app na tela inicial + iOS 16.4+.

export function pushSuportado() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function base64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function registrationPronta() {
  return (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready)
}

export async function estadoPush() {
  if (!pushSuportado()) return { suportado: false, ativo: false, permissao: 'unsupported' }
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  return { suportado: true, ativo: !!sub, permissao: Notification.permission }
}

export async function ativarPush() {
  if (!pushSuportado()) return { ok: false, erro: 'nao_suportado' }
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return { ok: false, erro: 'permissao' }

  const reg = await registrationPronta()
  const { data: chave } = await supabase.rpc('push_chave_publica')
  if (!chave) return { ok: false, erro: 'sem_chave' }

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(chave),
    })
  }
  const j = sub.toJSON()
  const { error } = await supabase.rpc('salvar_push_inscricao', {
    p_endpoint: sub.endpoint,
    p_p256dh: j.keys.p256dh,
    p_auth: j.keys.auth,
    p_ua: navigator.userAgent,
  })
  if (error) return { ok: false, erro: 'salvar' }
  return { ok: true }
}

export async function desativarPush() {
  if (!pushSuportado()) return { ok: true }
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (sub) {
    await supabase.rpc('remover_push_inscricao', { p_endpoint: sub.endpoint })
    await sub.unsubscribe()
  }
  return { ok: true }
}

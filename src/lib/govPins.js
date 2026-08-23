// Store dos atalhos/pins de Governança fixados NESTE aparelho (localStorage).
//
// Guarda metadados completos { id, label, url, icon, admin?, need? } — assim dá
// pra fixar QUALQUER página do portal (não só as da lista estática
// governancaCatalogo), inclusive pelo botão "alfinete" no header das páginas.
//
// Retrocompatível: entradas antigas eram só o id (string) de governancaCatalogo;
// na leitura elas são resolvidas para o objeto completo. O `id` de um pin novo é
// o GOV_PAGE_ID da página (mesmo id do catálogo do banco / rota /painel/:id).
import { governancaCatalogo, MAX_PAGINAS_FIXADAS } from './mockData.js'

export const PINS_KEY = 'tata_gov_pinned'
export const MAX_PINS = MAX_PAGINAS_FIXADAS
const EVT = 'gov-pins-changed'

// Normaliza uma entrada (string legada = id do catálogo estático, ou objeto).
function normalizar(entry) {
  if (typeof entry === 'string') {
    const c = governancaCatalogo.find((g) => g.id === entry)
    return c ? { ...c } : null
  }
  if (entry && typeof entry === 'object' && entry.id && entry.url) {
    return {
      id: String(entry.id),
      label: entry.label || String(entry.id),
      url: entry.url,
      icon: entry.icon || 'Pin',
      ...(entry.admin ? { admin: true } : {}),
      ...(entry.need ? { need: entry.need } : {}),
    }
  }
  return null
}

// Lê os pins, já normalizados e sem duplicatas (por id).
export function loadPins() {
  try {
    const raw = localStorage.getItem(PINS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    if (!Array.isArray(arr)) return []
    const out = []
    const seen = new Set()
    for (const e of arr) {
      const n = normalizar(e)
      if (n && !seen.has(n.id)) {
        seen.add(n.id)
        out.push(n)
      }
    }
    return out
  } catch {
    return []
  }
}

function persist(pins) {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins))
  } catch {
    /* ignore */
  }
  // Avisa os componentes desta mesma aba (o evento 'storage' só dispara noutras).
  try {
    window.dispatchEvent(new Event(EVT))
  } catch {
    /* ignore */
  }
}

export function isPinned(id) {
  return loadPins().some((p) => p.id === id)
}

// Fixa uma página. Retorna { ok, pins, already?, reason? }.
export function addPin(page) {
  const n = normalizar(page)
  if (!n) return { ok: false, reason: 'invalid' }
  const pins = loadPins()
  if (pins.some((p) => p.id === n.id)) return { ok: true, pins, already: true }
  if (pins.length >= MAX_PINS) return { ok: false, reason: 'limit', pins }
  const next = [...pins, n]
  persist(next)
  return { ok: true, pins: next }
}

export function removePin(id) {
  const next = loadPins().filter((p) => p.id !== id)
  persist(next)
  return next
}

// Alterna: se já está fixado, desafixa; senão fixa. Retorna { pinned, ... }.
export function togglePin(page) {
  if (isPinned(page.id)) return { ok: true, pinned: false, pins: removePin(page.id) }
  const r = addPin(page)
  return { ...r, pinned: !!r.ok }
}

// Salva a lista inteira (usado pelo gerenciador de atalhos), já normalizada.
export function savePins(pins) {
  const clean = []
  const seen = new Set()
  for (const e of Array.isArray(pins) ? pins : []) {
    const n = normalizar(e)
    if (n && !seen.has(n.id)) {
      seen.add(n.id)
      clean.push(n)
    }
  }
  persist(clean)
  return clean
}

// Assina mudanças (nesta aba via evento próprio, e noutras via 'storage').
export function subscribePins(cb) {
  const handler = () => cb(loadPins())
  const storageHandler = (e) => {
    if (e.key === PINS_KEY) cb(loadPins())
  }
  window.addEventListener(EVT, handler)
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener(EVT, handler)
    window.removeEventListener('storage', storageHandler)
  }
}

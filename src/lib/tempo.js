// Data de hoje como 'yyyy-mm-dd' no fuso local
function hojeISO() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
}

// O timestamp é de hoje?
export function ehHoje(iso) {
  if (!iso) return false
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === hojeISO()
}

// Data de evento ('yyyy-mm-dd') é hoje ou no futuro?
export function eventoVigente(dataEvento) {
  if (!dataEvento) return false
  return String(dataEvento).slice(0, 10) >= hojeISO()
}

// Formata uma data pura 'yyyy-mm-dd' em dd/mm/aaaa (sem conversão de fuso)
export function dataBR(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : ''
}

// Data curta pt-BR (ex.: "10/09/2024")
export function dataCurta(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Tempo relativo curto em pt-BR (ex.: "agora", "há 15 min", "há 2 h", "ontem")
export function tempoRelativo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const seg = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seg < 45) return 'agora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const dias = Math.floor(h / 24)
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

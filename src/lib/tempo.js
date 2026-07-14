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

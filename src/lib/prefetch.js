import { supabase } from './supabase.js'

// Aquece imagens em segundo plano (sem travar a UI). O service worker
// (StaleWhileRevalidate) guarda no cache, então a tela abre fluída depois.
export function prefetchImagens(urls) {
  if (typeof window === 'undefined' || !Array.isArray(urls)) return
  for (const u of urls) {
    if (typeof u === 'string' && u) {
      const img = new Image()
      img.decoding = 'async'
      img.src = u
    }
  }
}

// Chamado uma vez após o login. Aquece as imagens das telas mais "pesadas"
// de imagem (recompensas), que não abrem junto com a Início — assim, quando o
// colaborador navegar pra lá, já está pronto.
export async function prefetchAoAbrir() {
  try {
    const { data } = await supabase.rpc('recompensas_disponiveis')
    if (Array.isArray(data)) {
      prefetchImagens(data.map((r) => r?.imagem_url).filter(Boolean))
    }
  } catch {
    /* prefetch é best-effort; falha silenciosa */
  }
}

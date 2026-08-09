// Carrega a IFrame API do Spotify uma única vez e resolve com o objeto da API.
// Ela permite controlar a reprodução (play/pause/loadUri) de forma programática,
// pra a gente ter play automático e um botão de play/pausa próprio.
let promessa = null

export function carregarSpotifyApi() {
  if (promessa) return promessa
  promessa = new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    window.onSpotifyIframeApiReady = (API) => resolve(API)
    const s = document.createElement('script')
    s.src = 'https://open.spotify.com/embed/iframe-api/v1'
    s.async = true
    document.body.appendChild(s)
  })
  return promessa
}

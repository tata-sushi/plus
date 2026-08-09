import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Extrai o ID (22 chars) de uma faixa do Spotify de qualquer texto/URL compartilhado.
function extrairTrackId(txt) {
  if (!txt) return null
  const m = String(txt).match(/track[/:]([A-Za-z0-9]{22})/)
  return m ? m[1] : null
}

// Alvo do "Compartilhar → Tatá Plus" (Web Share Target, Android). Recebe o
// link do Spotify (url/text/title), extrai a faixa e redireciona pra Rádio já
// com a música pronta pra confirmar. Se não achar faixa, abre a Rádio normal.
export function Compartilhar() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  useEffect(() => {
    const bruto = params.get('url') || params.get('text') || params.get('title') || ''
    const id = extrairTrackId(bruto)
    navigate(id ? `/radio?add=${id}` : '/radio', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <img src="/icons/icon-192.png" alt="Tatá" className="h-16 w-16 animate-pulse rounded-2xl" />
    </div>
  )
}

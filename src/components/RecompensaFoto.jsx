import { useState } from 'react'

// Mostra a foto do item; se ainda não existir (ex.: foto não subiu no bucket)
// ou falhar, cai pro emoji. O tamanho do emoji vem do container pai (text-*).
export function RecompensaFoto({ src, emoji, alt = '', className = '' }) {
  const [erro, setErro] = useState(false)
  if (src && !erro) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => setErro(true)}
      />
    )
  }
  return <span>{emoji || '🎁'}</span>
}

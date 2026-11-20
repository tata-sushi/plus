// Compressão/redução de imagem no próprio navegador, antes de subir pro storage.
//
// Lê o arquivo que a pessoa escolheu (inclusive HEIC do iPhone, PNG, webp ou mime
// vazio — o decoder do <img> é o mais compatível pra foto de celular), redimensiona
// num <canvas> e reencoda em JPEG. Assim uma foto de vários MB vira um arquivo
// pequeno e o tamanho original deixa de travar o upload.
//
// Opções:
//   maxLado   lado maior (px) do resultado; nunca amplia além do original. Padrão 1280.
//   q         qualidade do JPEG (0–1). Padrão 0.82.
//   quadrado  recorta um quadrado central e devolve maxLado×maxLado (ex.: avatar). Padrão false.
//   rejeitar  se true, lança erro quando não consegue ler/encodar a imagem, em vez
//             de devolver o arquivo original. Padrão false.
//
// Retorno (Promise): um Blob JPEG. No modo "fit" (sem quadrado e sem rejeitar), se o
// reencode não ficou menor que o original, devolve o próprio arquivo (não vale a pena
// reencodar algo que já era pequeno). Se não conseguir decodificar e rejeitar=false,
// também devolve o arquivo original.
export function comprimirImagem(file, opcoes = {}) {
  const { maxLado = 1280, q = 0.82, quadrado = false, rejeitar = false } = opcoes
  return new Promise((resolve, reject) => {
    const falhar = (e) =>
      rejeitar ? reject(e instanceof Error ? e : new Error(String(e))) : resolve(file)

    let url
    try {
      url = URL.createObjectURL(file)
    } catch {
      return falhar(new Error('objectURL'))
    }

    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const bw = img.naturalWidth
        const bh = img.naturalHeight
        const c = document.createElement('canvas')
        const ctx = c.getContext('2d')
        if (quadrado) {
          // Recorte central: pega o maior quadrado possível e reduz pro alvo.
          const lado = Math.min(bw, bh)
          const sx = Math.round((bw - lado) / 2)
          const sy = Math.round((bh - lado) / 2)
          const destino = Math.max(1, Math.min(maxLado, lado))
          c.width = destino
          c.height = destino
          ctx.drawImage(img, sx, sy, lado, lado, 0, 0, destino, destino)
        } else {
          const escala = Math.min(1, maxLado / Math.max(bw, bh))
          const w = Math.max(1, Math.round(bw * escala))
          const h = Math.max(1, Math.round(bh * escala))
          c.width = w
          c.height = h
          ctx.drawImage(img, 0, 0, w, h)
        }
        c.toBlob(
          (b) => {
            if (!b || b.size === 0) return falhar(new Error('encode'))
            // No modo "fit" não troca por algo maior; com quadrado/rejeitar sempre usa o blob.
            if (!quadrado && !rejeitar && b.size >= file.size) return resolve(file)
            resolve(b)
          },
          'image/jpeg',
          q,
        )
      } catch (e) {
        falhar(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      falhar(new Error('decode'))
    }
    img.src = url
  })
}

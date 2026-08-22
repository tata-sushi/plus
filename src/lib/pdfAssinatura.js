// Gera o "PDF único carimbado": carrega o PDF de origem e anexa uma página final
// de assinatura (rubrica + selfie + declaração + carimbo de auditoria). Usa
// pdf-lib carregada sob demanda pra não pesar o bundle de quem não usa.

// As fontes padrão do pdf-lib (WinAnsi) cobrem acentos e pontuação, mas estouram
// com emoji/pictogramas. Remove esses caracteres pra geração nunca falhar.
function limpar(s) {
  return String(s || '').replace(
    /[\u{1F000}-\u{1FFFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
    '',
  )
}

async function embedImagem(doc, blob) {
  const bytes = await blob.arrayBuffer()
  const tipo = (blob.type || '').toLowerCase()
  if (tipo.includes('png')) return doc.embedPng(bytes)
  try {
    return await doc.embedJpg(bytes)
  } catch {
    return doc.embedPng(bytes)
  }
}

// quebra o texto em linhas que cabem em maxWidth
function quebrar(texto, font, size, maxWidth) {
  const linhas = []
  for (const paragrafo of limpar(texto).split('\n')) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean)
    let linha = ''
    for (const p of palavras) {
      const teste = linha ? linha + ' ' + p : p
      if (font.widthOfTextAtSize(teste, size) > maxWidth && linha) {
        linhas.push(linha)
        linha = p
      } else linha = teste
    }
    linhas.push(linha)
  }
  return linhas
}

export async function carimbarPdf({ pdfBytes, rubricaBlob, selfieBlob, dados }) {
  const pdfLib = await import('pdf-lib')
  const { PDFDocument, StandardFonts, rgb } = pdfLib
  // `degrees(a)` só devolve { type:'degrees', angle:a }; fallback cobre o interop CJS.
  const degrees = pdfLib.degrees ?? ((angle) => ({ type: 'degrees', angle }))
  const doc = await PDFDocument.load(pdfBytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)

  const cinza = rgb(0.42, 0.45, 0.42)
  const escuro = rgb(0.1, 0.1, 0.1)

  // Imagens embutidas uma única vez (reutilizadas no rodapé e na rubrica lateral).
  let rubricaImg = null
  let selfieImg = null
  if (rubricaBlob) {
    try {
      rubricaImg = await embedImagem(doc, rubricaBlob)
    } catch {
      /* rubrica inválida — segue sem ela */
    }
  }
  if (selfieBlob) {
    try {
      selfieImg = await embedImagem(doc, selfieBlob)
    } catch {
      /* selfie inválida — segue sem ela */
    }
  }

  const paginas = doc.getPages()
  const ultima = paginas.length - 1
  const totalPag = paginas.length

  // === Marca d'água: camada visual de autenticidade em TODAS as páginas ===
  // Texto diagonal repetido, bem discreto (baixa opacidade), pra marcar a folha
  // como assinada. É visual — a integridade de fato é o hash + a trilha imutável.
  // Desenhada antes do rodapé/rubrica, pra esses ficarem por cima.
  const marca = 'ASSINADO ELETRONICAMENTE'
  const passoX = 232
  const passoY = 168
  for (const p of paginas) {
    const pw = p.getWidth()
    const ph = p.getHeight()
    let linha = 0
    for (let yy = -60; yy < ph + 120; yy += passoY) {
      const off = (linha % 2) * (passoX / 2) // tijolo: alterna as linhas
      for (let xx = -80 + off; xx < pw + 80; xx += passoX) {
        p.drawText(marca, {
          x: xx,
          y: yy,
          size: 19,
          font: bold,
          color: rgb(0.55, 0.6, 0.55),
          rotate: degrees(45),
          opacity: 0.07,
        })
      }
      linha += 1
    }
  }

  // === ÚLTIMA página: campo de assinatura completo no rodapé (~150pt na base) ===
  // Sem separador nem cabeçalho: só o campo de assinatura (rubrica + selfie
  // alinhada na mesma altura) com o resto dos textos embaixo, todos no mesmo
  // padrão cinza. Selfie e rubrica ficam no tamanho cheio.
  const page = paginas[ultima]
  const { width } = page.getSize()
  const m = 40

  // declaração curta no topo do bloco (consentimento; até 2 linhas)
  let dy = 138
  for (const ln of quebrar(dados.declaracao, font, 7, width - 2 * m - 70).slice(0, 2)) {
    page.drawText(ln, { x: m, y: dy, size: 7, font, color: cinza })
    dy -= 9
  }

  // campo de assinatura: rubrica sobre a linha + nome/matrícula (esquerda).
  // rubrica no tamanho cheio (até 150×40)
  if (rubricaImg) {
    const w = 150
    const h = Math.min(40, rubricaImg.height * (w / rubricaImg.width))
    page.drawImage(rubricaImg, { x: m, y: 74, width: w, height: h })
  }
  page.drawLine({ start: { x: m, y: 70 }, end: { x: m + 190, y: 70 }, thickness: 0.7, color: rgb(0.6, 0.6, 0.6) })
  page.drawText(limpar(dados.assinante), { x: m, y: 59, size: 9, font: bold, color: escuro })
  page.drawText(
    limpar(`Matricula ${dados.matricula || ''}${dados.cargo ? ' - ' + dados.cargo : ''}${dados.unidade ? ' - ' + dados.unidade : ''}`),
    { x: m, y: 49, size: 7, font, color: cinza },
  )

  // selfie no canto direito, centralizada na vertical à altura do campo de
  // assinatura (campo ocupa y≈49..114 → centro ≈81; selfie 54 → base 54)
  if (selfieImg) {
    const s = 54
    page.drawImage(selfieImg, { x: width - m - s, y: 54, width: s, height: s })
    page.drawText('Selfie', { x: width - m - s + 15, y: 46, size: 6.5, font, color: cinza })
  }

  // rodapé: comprovante + auditoria + base legal, todos no mesmo padrão cinza
  page.drawText('Comprovante de Assinatura Eletronica', { x: m, y: 37, size: 7, font, color: cinza })
  page.drawText(
    `${dados.nivelRotulo || 'Assinatura eletronica simples'} - Assinado em ${dados.assinadoEm || ''}${dados.ip ? ' - IP ' + dados.ip : ''}`,
    { x: m, y: 28, size: 7, font, color: cinza },
  )
  page.drawText(`Documento v${dados.versao || 1} - impressao digital ${dados.hash || ''}`, { x: m, y: 19, size: 6.5, font: mono, color: cinza })
  page.drawText('Assinado eletronicamente nos termos da MP 2.200-2/2001.', { x: m, y: 10, size: 6.5, font, color: rgb(0.6, 0.62, 0.6) })

  // === DEMAIS páginas: rubrica lateral (amarração com a assinatura final) ===
  // Em cada folha que não é a última, repete a rubrica em miniatura + a
  // impressão digital do documento na lateral direita, ligando todas as
  // páginas à assinatura completa da última. Texto vertical (lê de baixo p/ cima).
  const hash = limpar(dados.hash || '')
  const rot = degrees(90)
  for (let i = 0; i < ultima; i++) {
    const p = paginas[i]
    const ph = p.getHeight()
    const pw = p.getWidth()
    const size = 6.5
    const texto = limpar(
      `Rubrica eletronica - ${dados.assinante || ''} - mat ${dados.matricula || ''} - pag ${i + 1}/${totalPag} - impressao digital ${hash}`,
    )
    const tw = font.widthOfTextAtSize(texto, size)
    const rw = rubricaImg ? 44 : 0
    const gap = rubricaImg ? 10 : 0
    const bloco = tw + gap + rw
    const y0 = Math.max(20, (ph - bloco) / 2)
    // texto vertical junto à borda direita
    p.drawText(texto, { x: pw - 11, y: y0, size, font, color: cinza, rotate: rot })
    // rubrica em miniatura acima do texto (rotacionada 90°)
    if (rubricaImg) {
      const w = rw
      const h = Math.min(13, rubricaImg.height * (w / rubricaImg.width))
      p.drawImage(rubricaImg, { x: pw - 9, y: y0 + tw + gap, width: w, height: h, rotate: rot })
    }
  }

  return doc.save() // Uint8Array
}

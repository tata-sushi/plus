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
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.load(pdfBytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)

  const page = doc.addPage([595.28, 841.89]) // A4 em pontos
  const { width, height } = page.getSize()
  const m = 48
  const cinza = rgb(0.42, 0.45, 0.42)
  const escuro = rgb(0.1, 0.1, 0.1)
  const verde = rgb(0.15, 0.61, 0.2)
  let y = height - m

  page.drawText('Comprovante de Assinatura Eletronica', { x: m, y, size: 15, font: bold, color: escuro })
  y -= 8
  page.drawLine({ start: { x: m, y }, end: { x: width - m, y }, thickness: 0.7, color: rgb(0.85, 0.87, 0.84) })
  y -= 26

  page.drawText(limpar(dados.titulo), { x: m, y, size: 12, font: bold, color: escuro })
  y -= 22

  // declaração (com quebra)
  for (const ln of quebrar(dados.declaracao || '', font, 10, width - 2 * m)) {
    page.drawText(ln, { x: m, y, size: 10, font, color: cinza })
    y -= 14
  }
  y -= 18

  // selfie no canto superior direito do bloco
  if (selfieBlob) {
    try {
      const img = await embedImagem(doc, selfieBlob)
      const s = 96
      const sx = width - m - s
      const sy = y - s
      page.drawImage(img, { x: sx, y: sy, width: s, height: s })
      page.drawText('Selfie de confirmacao', { x: sx, y: sy - 11, size: 7, font, color: cinza })
    } catch {
      /* ignora selfie inválida */
    }
  }

  // rubrica sobre a linha de assinatura
  if (rubricaBlob) {
    try {
      const img = await embedImagem(doc, rubricaBlob)
      const w = 190
      const h = Math.min(70, img.height * (w / img.width))
      page.drawImage(img, { x: m, y: y - h, width: w, height: h })
      y -= h + 3
    } catch {
      y -= 40
    }
  } else {
    y -= 40
  }
  page.drawLine({ start: { x: m, y }, end: { x: m + 230, y }, thickness: 0.7, color: rgb(0.6, 0.6, 0.6) })
  y -= 14
  page.drawText(limpar(dados.assinante), { x: m, y, size: 11, font: bold, color: escuro })
  y -= 13
  const sub = limpar(`Matricula ${dados.matricula || ''}${dados.cargo ? ' - ' + dados.cargo : ''}${dados.unidade ? ' - ' + dados.unidade : ''}`)
  page.drawText(sub, { x: m, y, size: 9, font, color: cinza })
  y -= 28

  // carimbo de auditoria
  const auditLinhas = [
    dados.nivelRotulo || 'Assinatura eletronica simples',
    `Assinado em ${dados.assinadoEm || ''}${dados.ip ? ' - IP ' + dados.ip : ''}`,
    `Documento v${dados.versao || 1} - impressao digital ${dados.hash || ''}`,
  ]
  const boxAlt = 16 * auditLinhas.length + 30
  page.drawRectangle({ x: m, y: y - boxAlt, width: width - 2 * m, height: boxAlt, color: rgb(0.97, 0.98, 0.97), borderColor: rgb(0.88, 0.9, 0.88), borderWidth: 0.7 })
  let ay = y - 18
  page.drawText('Trilha de auditoria', { x: m + 12, y: ay, size: 9, font: bold, color: verde })
  ay -= 16
  for (const ln of auditLinhas) {
    page.drawText(ln, { x: m + 12, y: ay, size: 9, font: ln.includes('impressao') ? mono : font, color: cinza })
    ay -= 15
  }
  y -= boxAlt + 16
  page.drawText('Assinado eletronicamente nos termos da MP 2.200-2/2001.', { x: m, y, size: 8, font, color: rgb(0.6, 0.62, 0.6) })

  return doc.save() // Uint8Array
}

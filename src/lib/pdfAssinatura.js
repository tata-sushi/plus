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

  // Carimba no rodapé da ÚLTIMA página do próprio conteúdo (mesma folha),
  // em vez de adicionar uma página nova. Banda compacta de ~190pt na base.
  const paginas = doc.getPages()
  const page = paginas[paginas.length - 1]
  const { width } = page.getSize()
  const m = 40
  const cinza = rgb(0.42, 0.45, 0.42)
  const escuro = rgb(0.1, 0.1, 0.1)
  const verde = rgb(0.15, 0.61, 0.2)

  // separador no topo do bloco de assinatura
  page.drawLine({ start: { x: m, y: 190 }, end: { x: width - m, y: 190 }, thickness: 0.8, color: rgb(0.8, 0.82, 0.8) })
  page.drawText('Comprovante de Assinatura Eletronica', { x: m, y: 176, size: 9, font: bold, color: verde })

  // selfie no canto direito do bloco
  if (selfieBlob) {
    try {
      const img = await embedImagem(doc, selfieBlob)
      const s = 54
      page.drawImage(img, { x: width - m - s, y: 92, width: s, height: s })
      page.drawText('Selfie', { x: width - m - s + 15, y: 82, size: 7, font, color: cinza })
    } catch {
      /* selfie inválida — segue sem ela */
    }
  }

  // declaração curta (até 2 linhas, sem invadir a selfie à direita)
  let dy = 162
  for (const ln of quebrar(dados.declaracao, font, 8, width - 2 * m - 76).slice(0, 2)) {
    page.drawText(ln, { x: m, y: dy, size: 8, font, color: cinza })
    dy -= 11
  }

  // rubrica sobre a linha de assinatura
  if (rubricaBlob) {
    try {
      const img = await embedImagem(doc, rubricaBlob)
      const w = 150
      const h = Math.min(40, img.height * (w / img.width))
      page.drawImage(img, { x: m, y: 94, width: w, height: h })
    } catch {
      /* rubrica inválida — segue sem ela */
    }
  }
  page.drawLine({ start: { x: m, y: 90 }, end: { x: m + 210, y: 90 }, thickness: 0.7, color: rgb(0.6, 0.6, 0.6) })
  page.drawText(limpar(dados.assinante), { x: m, y: 78, size: 10, font: bold, color: escuro })
  page.drawText(
    limpar(`Matricula ${dados.matricula || ''}${dados.cargo ? ' - ' + dados.cargo : ''}${dados.unidade ? ' - ' + dados.unidade : ''}`),
    { x: m, y: 67, size: 8, font, color: cinza },
  )

  // auditoria compacta
  page.drawText(
    `${dados.nivelRotulo || 'Assinatura eletronica simples'} - Assinado em ${dados.assinadoEm || ''}${dados.ip ? ' - IP ' + dados.ip : ''}`,
    { x: m, y: 50, size: 8, font, color: cinza },
  )
  page.drawText(`Documento v${dados.versao || 1} - impressao digital ${dados.hash || ''}`, { x: m, y: 39, size: 7.5, font: mono, color: cinza })
  page.drawText('Assinado eletronicamente nos termos da MP 2.200-2/2001.', { x: m, y: 26, size: 7, font, color: rgb(0.6, 0.62, 0.6) })

  return doc.save() // Uint8Array
}

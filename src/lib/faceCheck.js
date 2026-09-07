// Checagem facial da selfie de assinatura — roda 100% no aparelho (MediaPipe
// Tasks Vision), sem enviar imagem pra lugar nenhum e sem guardar biometria.
// Objetivo: garantir que a selfie tem MESMO um rosto enquadrado (anti "foto da
// mão / teto / tela preta") antes de aceitar como prova de autoria.
//
// Hospedagem in-house: o runtime (.wasm) e o modelo (.tflite) são servidos do
// próprio domínio do app (public/mediapipe, public/models) — nada de CDN
// externo, então funciona até em rede corporativa fechada.
//
// FAIL-OPEN: se o modelo não carregar (aparelho antigo sem WebAssembly SIMD,
// falha de rede, etc.), a checagem LIBERA a selfie. Ela é uma trava
// anti-abuso, não pode travar a assinatura de quem está de boa.

let _detectorPromise = null

// Carrega o FaceDetector uma vez só (singleton). Import dinâmico → o MediaPipe
// só entra no bundle (e o wasm só baixa) quando a tela de assinatura precisa.
async function getDetector() {
  if (!_detectorPromise) {
    _detectorPromise = (async () => {
      const { FilesetResolver, FaceDetector } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
      return FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/models/face_detector.tflite' },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.4,
      })
    })().catch((e) => {
      _detectorPromise = null // permite tentar de novo numa próxima selfie
      throw e
    })
  }
  return _detectorPromise
}

// Pré-aquece o detector (chama quando a tela de assinatura abre, pra o wasm já
// estar pronto quando a pessoa tirar a selfie). Silencioso: erro aqui não faz nada.
export function preaquecerFaceCheck() {
  getDetector().catch(() => {})
}

// Carrega o Blob/File num <img> decodificado (compat ampla, inclusive iOS).
function carregarImagem(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('imagem inválida'))
    }
    img.src = url
  })
}

// Luminância média (0..255) de uma região da imagem — pra pegar selfie no escuro.
function brilhoMedio(img, box) {
  try {
    const alvo = 48 // amostra pequena, rápida
    const c = document.createElement('canvas')
    c.width = alvo
    c.height = alvo
    const ctx = c.getContext('2d', { willReadFrequently: true })
    // recorta a região do rosto (com margem) e reduz pra 48x48
    const sx = Math.max(0, box.x)
    const sy = Math.max(0, box.y)
    const sw = Math.min(img.naturalWidth - sx, box.w)
    const sh = Math.min(img.naturalHeight - sy, box.h)
    if (sw <= 0 || sh <= 0) return 255
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, alvo, alvo)
    const { data } = ctx.getImageData(0, 0, alvo, alvo)
    let soma = 0
    for (let i = 0; i < data.length; i += 4) {
      // luma perceptual
      soma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    }
    return soma / (data.length / 4)
  } catch {
    return 255 // não conseguiu medir → não reprova por brilho
  }
}

// Mensagens amigáveis por motivo de reprovação.
export const MOTIVO_MSG = {
  sem_rosto: 'Não identifiquei um rosto. Enquadre o rosto e tire a selfie de novo.',
  longe: 'Chegue mais perto: seu rosto está pequeno/longe demais.',
  escuro: 'Ambiente muito escuro. Procure um lugar mais iluminado.',
}

// Confere a selfie. Retorna:
//   { ok: true }                      → rosto ok, pode usar
//   { ok: false, motivo, msg }        → reprovado (refazer)
//   { ok: true, pulou: true }         → não deu pra checar (fail-open, liberou)
export async function checarSelfie(blob) {
  if (!blob) return { ok: false, motivo: 'sem_rosto', msg: MOTIVO_MSG.sem_rosto }
  let recurso = null
  try {
    const detector = await getDetector()
    recurso = await carregarImagem(blob)
    const { img } = recurso
    const res = detector.detect(img)
    const dets = res?.detections || []

    if (dets.length === 0) {
      return { ok: false, motivo: 'sem_rosto', msg: MOTIVO_MSG.sem_rosto }
    }

    // pega a detecção de maior score
    const melhor = dets.reduce((a, b) =>
      (b.categories?.[0]?.score ?? 0) > (a.categories?.[0]?.score ?? 0) ? b : a,
    )
    const score = melhor.categories?.[0]?.score ?? 0
    if (score < 0.5) {
      return { ok: false, motivo: 'sem_rosto', msg: MOTIVO_MSG.sem_rosto }
    }

    const bb = melhor.boundingBox || {}
    const box = { x: bb.originX || 0, y: bb.originY || 0, w: bb.width || 0, h: bb.height || 0 }

    // Rosto pequeno demais → longe / mal enquadrado (usa o maior lado da imagem)
    const fracao = box.w / (img.naturalWidth || 1)
    if (fracao < 0.2) {
      return { ok: false, motivo: 'longe', msg: MOTIVO_MSG.longe }
    }

    // Selfie muito escura
    if (brilhoMedio(img, box) < 45) {
      return { ok: false, motivo: 'escuro', msg: MOTIVO_MSG.escuro }
    }

    return { ok: true }
  } catch {
    // Não carregou/rodou o modelo → não trava a assinatura.
    return { ok: true, pulou: true }
  } finally {
    if (recurso?.url) URL.revokeObjectURL(recurso.url)
  }
}

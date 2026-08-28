// Termo Tatá — desafio diário no estilo "Termo/Wordle", em pt-BR e com tema do
// restaurante + culinária oriental. A palavra do dia é GLOBAL (a mesma pra todo
// mundo no Brasil naquele dia), diferente do puzzle por-fase do Tango/Rota.
//
// A pessoa digita SEM acento; o jogo normaliza (á→a, ç→c) na comparação e mostra
// a forma com acento na revelação. Tamanho variável (4 a 8 letras) — a grade se
// ajusta ao tamanho da palavra do dia.

import { hojeSP } from './tatatango.js'

export { hojeSP }

export const TENTATIVAS = 6

// ── Lista-semente (SUBSTITUÍVEL) ─────────────────────────────────────────────
// Palavras do universo do restaurante e da culinária oriental. Pode ter acento;
// a normalização cuida do resto. Trocar/expandir esta lista é só editar o array.
export const BANCO_BRUTO = [
  // pratos e peças
  'SUSHI', 'TEMAKI', 'SASHIMI', 'NIGIRI', 'URAMAKI', 'FUTOMAKI', 'MAKI', 'GUNKAN',
  'TATAKI', 'TEMPURÁ', 'YAKISOBA', 'GYOZA', 'RAMEN', 'KATSU', 'KARAAGE', 'YAKITORI',
  'MOCHI', 'SOMEN', 'UDON', 'SOBA', 'NABE', 'BENTO', 'DONBURI', 'ONIGIRI',
  'CHIRASHI', 'SUNOMONO', 'ROBATA', 'SUKIYAKI', 'YAKINIKU', 'IZAKAYA', 'OMAKASE', 'TARTAR',
  // ingredientes e temperos
  'WASABI', 'SHOYU', 'MISSÔ', 'TOFU', 'NORI', 'ARROZ', 'SHIMEJI', 'SHIITAKE',
  'KOMBU', 'WAKAME', 'GENGIBRE', 'GERGELIM', 'CEBOLA', 'ALHO', 'MANGA', 'ABACATE',
  'PEPINO', 'CENOURA', 'RÁBANO', 'LIMÃO', 'PONZU', 'MIRIN', 'SAQUÊ', 'DAIKON',
  'UMAMI', 'DASHI', 'TERIYAKI', 'EDAMAME',
  // peixes e frutos do mar
  'SALMÃO', 'ATUM', 'POLVO', 'CAMARÃO', 'LULA', 'OSTRA', 'PEIXE', 'IKURA', 'UNAGI', 'KANI',
  // salão, serviço e cozinha
  'GARÇOM', 'SALÃO', 'COZINHA', 'BALCÃO', 'CAIXA', 'COMANDA', 'PEDIDO', 'MESA',
  'PRATO', 'COPO', 'TAÇA', 'BANDEJA', 'TALHER', 'HASHI', 'CLIENTE', 'EQUIPE',
  'CHEFE', 'LÍDER', 'TURNO', 'RESERVA', 'ESPERA', 'SERVIR', 'SERVIÇO', 'ATENDER',
  'LIMPEZA', 'HIGIENE', 'PADRÃO', 'SABOR', 'AROMA', 'TEXTURA',
]

// ── Normalização: MAIÚSCULA, sem acento (á→A, ç→C, ñ→N) ─────────────────────
export function normaliza(w) {
  return String(w || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

// Banco processado: { display (com acento), palavra (normalizada) }, filtrado por
// tamanho (4–8) e deduplicado pela forma normalizada.
export const BANCO = (() => {
  const vistos = new Set()
  const out = []
  for (const bruto of BANCO_BRUTO) {
    const palavra = normaliza(bruto)
    if (palavra.length < 4 || palavra.length > 8) continue
    if (vistos.has(palavra)) continue
    vistos.add(palavra)
    out.push({ display: String(bruto).toUpperCase(), palavra })
  }
  return out
})()

// ── RNG determinístico (mulberry32) só pra embaralhar o banco uma vez ───────
function makeRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Ordem fixa (embaralhada com semente constante) pra ciclar o banco inteiro
// antes de repetir. Assim a sequência de palavras é estável e sem repetição
// dentro de um ciclo de BANCO.length dias.
const BANCO_ORDENADO = (() => {
  const arr = BANCO.slice()
  const rng = makeRng(0x7a7a1234)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
})()

// Nº de dias desde a época (UTC) a partir de 'YYYY-MM-DD'.
function diaEpoca(iso) {
  const ms = Date.parse(iso + 'T00:00:00Z')
  return Math.floor(ms / 86400000)
}

// Palavra do dia — global (mesma pra todo mundo). Retorna { display, palavra }.
export function palavraDoDia(iso = hojeSP()) {
  if (!BANCO_ORDENADO.length) return { display: 'SUSHI', palavra: 'SUSHI' }
  const d = diaEpoca(iso)
  const i = ((d % BANCO_ORDENADO.length) + BANCO_ORDENADO.length) % BANCO_ORDENADO.length
  return BANCO_ORDENADO[i]
}

// ── Avaliação de uma tentativa (algoritmo clássico do Wordle, com letra dupla) ─
// tentativa e alvo: strings normalizadas do mesmo tamanho.
// Retorna array de 'certo' | 'presente' | 'ausente'.
export function avalia(tentativa, alvo) {
  const n = alvo.length
  const res = Array(n).fill('ausente')
  const resto = {}
  for (const ch of alvo) resto[ch] = (resto[ch] || 0) + 1
  // 1ª passada: letras na posição certa
  for (let i = 0; i < n; i++) {
    if (tentativa[i] === alvo[i]) {
      res[i] = 'certo'
      resto[tentativa[i]]--
    }
  }
  // 2ª passada: letra existe em outra posição (respeitando a contagem)
  for (let i = 0; i < n; i++) {
    if (res[i] === 'certo') continue
    const ch = tentativa[i]
    if (resto[ch] > 0) {
      res[i] = 'presente'
      resto[ch]--
    }
  }
  return res
}

// Melhor estado por letra ao longo de todas as tentativas (pro teclado).
// prioridade: certo > presente > ausente.
export function estadosDoTeclado(tentativas, alvo) {
  const rank = { ausente: 0, presente: 1, certo: 2 }
  const mapa = {}
  for (const t of tentativas) {
    const av = avalia(t, alvo)
    for (let i = 0; i < t.length; i++) {
      const ch = t[i]
      if (mapa[ch] == null || rank[av[i]] > rank[mapa[ch]]) mapa[ch] = av[i]
    }
  }
  return mapa
}

// Layout do teclado (sem Ç — a cedilha entra como C e é revelada com acento).
export const TECLADO = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'APAGAR'],
]

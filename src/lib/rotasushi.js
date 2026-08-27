// Rota do Sushi — puzzle diário no estilo "Zip" (LinkedIn).
//
// Um único traço que começa no número 1, passa por todos os números em ordem
// (1→2→…→K) e preenche TODAS as células do tabuleiro (cada uma uma vez).
// Versão sem paredes: os checkpoints numerados é que garantem a solução única.
//
// O puzzle é GERADO a partir da fase/data (mesmo desafio pra todo mundo) e tem
// SOLUÇÃO ÚNICA — garantida contando as soluções (backtracking) e revelando
// números até sobrar só uma. Tudo roda no front.

// ── RNG determinístico (mulberry32) ─────────────────────────────────────────
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

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
  return arr
}

// 'YYYY-MM-DD' no fuso de São Paulo (o "dia" bate pra todos no Brasil).
export function hojeSP(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

// Seed determinístico por (jogo, fase) — FNV-1a.
export function seedDaFase(jogo, fase) {
  let h = 2166136261 >>> 0
  const s = String(jogo) + ':' + String(fase)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

// Dificuldade pela fase: cresce o tabuleiro; "extras" revela checkpoints além
// do mínimo (mais guiado = mais fácil) nas primeiras fases.
//   1–5    5×5  (bem guiado)
//   6–30   6×6
//   31+    6×6  (menos checkpoints — só o mínimo pra ser único)
export function tierDaFase(fase) {
  if (fase <= 5) return { rows: 5, cols: 5, extras: 4 }
  if (fase <= 30) return { rows: 6, cols: 6, extras: 2 }
  return { rows: 6, cols: 6, extras: 0 }
}

// ── Vizinhos ortogonais (índice = r*cols + c) ────────────────────────────────
function vizinhos(cell, rows, cols) {
  const r = (cell / cols) | 0
  const c = cell % cols
  const out = []
  if (r > 0) out.push(cell - cols)
  if (r < rows - 1) out.push(cell + cols)
  if (c > 0) out.push(cell - 1)
  if (c < cols - 1) out.push(cell + 1)
  return out
}

// ── Caminho hamiltoniano aleatório (cobre todas as casas) via "backbite" ─────
function montarHamiltoniano(rng, rows, cols) {
  const n = rows * cols
  // começa numa serpentina
  const path = []
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) for (let c = 0; c < cols; c++) path.push(r * cols + c)
    else for (let c = cols - 1; c >= 0; c--) path.push(r * cols + c)
  }
  const pos = new Array(n)
  for (let i = 0; i < n; i++) pos[path[i]] = i

  const reverter = (i, j) => {
    while (i < j) {
      const a = path[i]
      const b = path[j]
      path[i] = b
      path[j] = a
      pos[b] = i
      pos[a] = j
      i++
      j--
    }
  }

  const iters = n * n * 3
  for (let it = 0; it < iters; it++) {
    if (rng() < 0.5) {
      // ponta = cabeça (índice 0): liga c0 ao vizinho c_k reversendo [0..k-1]
      const nbs = vizinhos(path[0], rows, cols)
      const nb = nbs[(rng() * nbs.length) | 0]
      const k = pos[nb]
      if (k >= 1) reverter(0, k - 1)
    } else {
      // ponta = cauda (índice n-1)
      const nbs = vizinhos(path[n - 1], rows, cols)
      const nb = nbs[(rng() * nbs.length) | 0]
      const k = pos[nb]
      if (k <= n - 2) reverter(k + 1, n - 1)
    }
  }
  return path
}

// ── Conta soluções (até um limite) do puzzle numeros = {cell: num} ───────────
// Regras: começa no número 1, entra num numerado só quando é o próximo esperado,
// preenche todas as casas. Poda por conectividade das casas restantes.
export function contarSolucoes(rows, cols, numeros, limite = 2) {
  const n = rows * cols
  const numAt = new Array(n).fill(0)
  let start = -1
  let maxNum = 0
  for (const k in numeros) {
    const cell = +k
    const num = numeros[k]
    numAt[cell] = num
    if (num === 1) start = cell
    if (num > maxNum) maxNum = num
  }
  if (start < 0) return 0

  const visited = new Array(n).fill(false)
  let count = 0

  // Todas as casas não-visitadas continuam alcançáveis a partir de `cell`?
  function alcancaTudo(cell, restam) {
    if (restam === 0) return true
    const seen = new Uint8Array(n)
    const pilha = []
    for (const nb of vizinhos(cell, rows, cols))
      if (!visited[nb] && !seen[nb]) {
        seen[nb] = 1
        pilha.push(nb)
      }
    let vistos = pilha.length
    if (vistos === 0) return false
    while (pilha.length) {
      const x = pilha.pop()
      for (const nb of vizinhos(x, rows, cols))
        if (!visited[nb] && !seen[nb]) {
          seen[nb] = 1
          vistos++
          pilha.push(nb)
        }
    }
    return vistos === restam
  }

  function dfs(cell, depth, esperado) {
    if (depth === n) {
      if (esperado === maxNum + 1) count++
      return
    }
    if (!alcancaTudo(cell, n - depth)) return
    for (const nb of vizinhos(cell, rows, cols)) {
      if (visited[nb]) continue
      const nn = numAt[nb]
      if (nn !== 0 && nn !== esperado) continue
      visited[nb] = true
      dfs(nb, depth + 1, nn !== 0 ? esperado + 1 : esperado)
      visited[nb] = false
      if (count >= limite) return
    }
  }

  visited[start] = true
  dfs(start, 1, 2)
  return count
}

// ── Gera um puzzle com solução única ─────────────────────────────────────────
// Retorna { rows, cols, numeros:{cell:num}, ordem:K, solucao:[cells] } ou null.
export function gerarRota(seed, opts = {}) {
  const rows = opts.rows || 6
  const cols = opts.cols || 6
  const extras = opts.extras || 0
  const rng = makeRng((seed ^ 0x9e3779b9) >>> 0)
  const n = rows * cols

  for (let tentativa = 0; tentativa < 300; tentativa++) {
    const path = montarHamiltoniano(rng, rows, cols)

    // Começa com TODAS as posições numeradas (único trivial) e remove enquanto
    // a solução continua única → conjunto mínimo. Início e fim ficam sempre.
    const marcado = new Array(n).fill(true)
    const construir = () => {
      const numeros = {}
      let num = 0
      for (let p = 0; p < n; p++) if (marcado[p]) numeros[path[p]] = ++num
      return numeros
    }
    const interiores = []
    for (let p = 1; p < n - 1; p++) interiores.push(p)
    shuffle(interiores, rng)
    for (const p of interiores) {
      marcado[p] = false
      if (contarSolucoes(rows, cols, construir(), 2) !== 1) marcado[p] = true // volta
    }

    // fases fáceis: readiciona alguns checkpoints removidos (segue único)
    if (extras > 0) {
      const removidos = interiores.filter((p) => !marcado[p])
      shuffle(removidos, rng)
      for (let e = 0; e < extras && e < removidos.length; e++) marcado[removidos[e]] = true
    }

    const numeros = construir()
    if (contarSolucoes(rows, cols, numeros, 2) !== 1) continue // garantia
    let ordem = 0
    for (let p = 0; p < n; p++) if (marcado[p]) ordem++
    return { rows, cols, numeros, ordem, solucao: path }
  }
  return null
}

// ── Validação da jogada do usuário ───────────────────────────────────────────
// caminho = array de cells na ordem em que foram desenhados.
// Resolve se: contíguo (vizinhos ortogonais), sem repetir, cobre TODAS as casas,
// começa no 1 e passa pelos números em ordem crescente.
export function estaResolvida(caminho, puzzle) {
  const { rows, cols, numeros } = puzzle
  const n = rows * cols
  if (!caminho || caminho.length !== n) return false
  const visto = new Set()
  let esperado = 1
  for (let i = 0; i < caminho.length; i++) {
    const cell = caminho[i]
    if (visto.has(cell)) return false
    visto.add(cell)
    if (i > 0 && !vizinhos(caminho[i - 1], rows, cols).includes(cell)) return false
    const num = numeros[cell]
    if (num != null) {
      if (num !== esperado) return false
      esperado++
    }
  }
  return visto.size === n
}

export { vizinhos }

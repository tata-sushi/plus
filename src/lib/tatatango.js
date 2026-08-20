// Tatá Tango — desafio diário no estilo "Tango" do LinkedIn (Takuzu com dicas =/×).
//
// Grade 6×6 com dois valores (0/1). Regras:
//   • 3 de cada valor por linha e por coluna;
//   • nunca 3 iguais seguidos (na horizontal ou vertical);
//   • dicas entre vizinhos: '=' (iguais) ou '×' (diferentes).
//
// O puzzle é GERADO a partir da data (mesmo desafio pra todo mundo no mesmo dia)
// e tem SOLUÇÃO ÚNICA. Tudo roda no front — sem backend.

export const N = 6
const HALF = N / 2 // 3 de cada por linha/coluna

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
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// 'YYYY-MM-DD' no fuso de São Paulo (o "dia" bate pra todos os usuários no Brasil)
export function hojeSP(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(d) // en-CA → YYYY-MM-DD
}

export function seedDoDia(iso = hojeSP()) {
  return parseInt(iso.replace(/-/g, ''), 10) // AAAAMMDD
}

// ── Gera uma solução completa válida (backtracking) ─────────────────────────
function gerarSolucao(rng) {
  const g = Array.from({ length: N }, () => Array(N).fill(-1))
  const rowCount = Array.from({ length: N }, () => [0, 0])
  const colCount = Array.from({ length: N }, () => [0, 0])
  function ok(r, c, v) {
    if (rowCount[r][v] >= HALF) return false
    if (colCount[c][v] >= HALF) return false
    if (c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) return false
    if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) return false
    return true
  }
  function bt(idx) {
    if (idx === N * N) return true
    const r = (idx / N) | 0
    const c = idx % N
    const vals = rng() < 0.5 ? [0, 1] : [1, 0]
    for (const v of vals) {
      if (ok(r, c, v)) {
        g[r][c] = v
        rowCount[r][v]++
        colCount[c][v]++
        if (bt(idx + 1)) return true
        g[r][c] = -1
        rowCount[r][v]--
        colCount[c][v]--
      }
    }
    return false
  }
  bt(0)
  return g
}

// ── Solver: conta soluções (até `limite`) dado givens + dicas ───────────────
// givens[r][c] ∈ {-1,0,1}; H[r][c] = relação entre (r,c) e (r,c+1); V[r][c] = (r,c)-(r+1,c)
// relação: 0 nada · 1 '=' · 2 '×'
export function contarSolucoes(givens, H, V, limite = 2) {
  const g = givens.map((row) => row.slice())
  const rowCount = Array.from({ length: N }, () => [0, 0])
  const colCount = Array.from({ length: N }, () => [0, 0])
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (g[r][c] >= 0) {
        rowCount[r][g[r][c]]++
        colCount[c][g[r][c]]++
      }
  let count = 0
  function ok(r, c, v) {
    if (rowCount[r][v] >= HALF) return false
    if (colCount[c][v] >= HALF) return false
    const row = g[r]
    // trincas envolvendo (r,c) com vizinhos já determinados
    if (c >= 2 && row[c - 1] === v && row[c - 2] === v) return false
    if (c >= 1 && c + 1 < N && row[c - 1] === v && row[c + 1] === v) return false
    if (c + 2 < N && row[c + 1] === v && row[c + 2] === v) return false
    if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) return false
    if (r >= 1 && r + 1 < N && g[r - 1][c] === v && g[r + 1][c] === v) return false
    if (r + 2 < N && g[r + 1][c] === v && g[r + 2][c] === v) return false
    // dicas com vizinhos determinados
    if (c >= 1 && row[c - 1] >= 0) {
      const rel = H[r][c - 1]
      if (rel === 1 && v !== row[c - 1]) return false
      if (rel === 2 && v === row[c - 1]) return false
    }
    if (c + 1 < N && row[c + 1] >= 0) {
      const rel = H[r][c]
      if (rel === 1 && v !== row[c + 1]) return false
      if (rel === 2 && v === row[c + 1]) return false
    }
    if (r >= 1 && g[r - 1][c] >= 0) {
      const rel = V[r - 1][c]
      if (rel === 1 && v !== g[r - 1][c]) return false
      if (rel === 2 && v === g[r - 1][c]) return false
    }
    if (r + 1 < N && g[r + 1][c] >= 0) {
      const rel = V[r][c]
      if (rel === 1 && v !== g[r + 1][c]) return false
      if (rel === 2 && v === g[r + 1][c]) return false
    }
    return true
  }
  function bt(idx) {
    if (count >= limite) return
    if (idx === N * N) {
      count++
      return
    }
    const r = (idx / N) | 0
    const c = idx % N
    if (g[r][c] >= 0) {
      bt(idx + 1)
      return
    }
    for (let v = 0; v <= 1; v++) {
      if (ok(r, c, v)) {
        g[r][c] = v
        rowCount[r][v]++
        colCount[c][v]++
        bt(idx + 1)
        g[r][c] = -1
        rowCount[r][v]--
        colCount[c][v]--
        if (count >= limite) return
      }
    }
  }
  bt(0)
  return count
}

// ── Monta o puzzle do dia: poucos givens + dicas até ficar único ────────────
export function montarPuzzle(seed, extras = 0) {
  const rng = makeRng((seed ^ 0x9e3779b9) >>> 0)
  const solution = gerarSolucao(rng)

  const Hall = []
  const Vall = []
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N - 1; c++)
      Hall.push([r, c, solution[r][c] === solution[r][c + 1] ? 1 : 2])
  for (let r = 0; r < N - 1; r++)
    for (let c = 0; c < N; c++)
      Vall.push([r, c, solution[r][c] === solution[r + 1][c] ? 1 : 2])

  const cells = []
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c])
  shuffle(cells, rng)
  shuffle(Hall, rng)
  shuffle(Vall, rng)

  const givens = Array.from({ length: N }, () => Array(N).fill(-1))
  const H = Array.from({ length: N }, () => Array(N - 1).fill(0))
  const V = Array.from({ length: N - 1 }, () => Array(N).fill(0))

  // poucos givens iniciais (sabor "LinkedIn"): 4 a 6
  const nGivens = 4 + Math.floor(rng() * 3)
  let usedCells = 0
  for (; usedCells < nGivens && usedCells < cells.length; usedCells++) {
    const [r, c] = cells[usedCells]
    givens[r][c] = solution[r][c]
  }

  // adiciona dicas (e, se preciso, mais givens) até a solução ficar única.
  // termina sempre: no limite, tudo revelado ⇒ único.
  let hi = 0
  let vi = 0
  let guarda = 0
  while (contarSolucoes(givens, H, V, 2) !== 1 && guarda++ < 500) {
    if (hi < Hall.length) {
      const [r, c, rel] = Hall[hi++]
      if (H[r][c] === 0) H[r][c] = rel
    } else if (vi < Vall.length) {
      const [r, c, rel] = Vall[vi++]
      if (V[r][c] === 0) V[r][c] = rel
    } else if (usedCells < cells.length) {
      const [r, c] = cells[usedCells++]
      givens[r][c] = solution[r][c]
    } else break
  }

  // Minimiza: remove dicas/givens redundantes mantendo a solução única (puzzle
  // mais limpo e mais dedutivo). Mantém um piso de givens como âncoras visuais.
  const PISO_GIVENS = 4
  const clues = []
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (givens[r][c] >= 0) clues.push(['g', r, c])
  for (let r = 0; r < N; r++) for (let c = 0; c < N - 1; c++) if (H[r][c]) clues.push(['h', r, c])
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < N; c++) if (V[r][c]) clues.push(['v', r, c])
  shuffle(clues, rng)
  const nGivens2 = () => givens.reduce((a, row) => a + row.filter((x) => x >= 0).length, 0)
  for (const [t, r, c] of clues) {
    if (t === 'g') {
      if (nGivens2() <= PISO_GIVENS) continue
      const old = givens[r][c]
      givens[r][c] = -1
      if (contarSolucoes(givens, H, V, 2) !== 1) givens[r][c] = old
    } else if (t === 'h') {
      const old = H[r][c]
      H[r][c] = 0
      if (contarSolucoes(givens, H, V, 2) !== 1) H[r][c] = old
    } else {
      const old = V[r][c]
      V[r][c] = 0
      if (contarSolucoes(givens, H, V, 2) !== 1) V[r][c] = old
    }
  }

  // Níveis mais fáceis: revela algumas peças extras (âncoras) além do mínimo.
  if (extras > 0) {
    const escondidas = []
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (givens[r][c] < 0) escondidas.push([r, c])
    shuffle(escondidas, rng)
    for (let i = 0; i < extras && i < escondidas.length; i++) {
      const [r, c] = escondidas[i]
      givens[r][c] = solution[r][c]
    }
  }

  return { solution, givens, H, V }
}

// Seed determinístico por (jogo, fase) — a MESMA fase gera o MESMO puzzle pra
// todo mundo (tipo "nível N" de um jogo). FNV-1a.
export function seedDaFase(jogo, fase) {
  let h = 2166136261 >>> 0
  const s = String(jogo) + ':' + String(fase)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

// Dificuldade pela fase. Por ora tudo 6×6 (o gerador rápido pra 8×8/10×10 está
// no backlog); a dificuldade varia pela quantidade de dicas/peças reveladas.
// Futuro: fase 51–100 → 8×8; 101+ → 10×10.
export function tierDaFase(fase) {
  // tamanho fica 6×6 por ora (8×8/10×10 esperam o solver rápido — ver backlog);
  // rótulo e pontos já seguem os 4 níveis por fase.
  if (fase <= 20) return { tamanho: 6, extras: 8, rotulo: 'Aprendiz', pontos: 10 }
  if (fase <= 50) return { tamanho: 6, extras: 0, rotulo: 'Afiado', pontos: 15 }
  if (fase <= 100) return { tamanho: 6, extras: 0, rotulo: 'Mestre', pontos: 20 }
  return { tamanho: 6, extras: 0, rotulo: 'Lenda', pontos: 25 }
}

// ── Conflitos ao vivo (células a destacar em vermelho) ──────────────────────
// grid[r][c] ∈ {-1,0,1} (-1 = vazio). Retorna Set de "r,c".
export function conflitos(grid, puzzle) {
  const bad = new Set()
  const mark = (r, c) => bad.add(r + ',' + c)
  const { H, V } = puzzle
  // trincas
  for (let r = 0; r < N; r++)
    for (let c = 0; c <= N - 3; c++)
      if (grid[r][c] !== -1 && grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) {
        mark(r, c)
        mark(r, c + 1)
        mark(r, c + 2)
      }
  for (let c = 0; c < N; c++)
    for (let r = 0; r <= N - 3; r++)
      if (grid[r][c] !== -1 && grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c]) {
        mark(r, c)
        mark(r + 1, c)
        mark(r + 2, c)
      }
  // excesso por linha/coluna (mais de 3 de um valor)
  for (let r = 0; r < N; r++) {
    const z = [],
      o = []
    for (let c = 0; c < N; c++) {
      if (grid[r][c] === 0) z.push(c)
      else if (grid[r][c] === 1) o.push(c)
    }
    if (z.length > HALF) z.forEach((c) => mark(r, c))
    if (o.length > HALF) o.forEach((c) => mark(r, c))
  }
  for (let c = 0; c < N; c++) {
    const z = [],
      o = []
    for (let r = 0; r < N; r++) {
      if (grid[r][c] === 0) z.push(r)
      else if (grid[r][c] === 1) o.push(r)
    }
    if (z.length > HALF) z.forEach((r) => mark(r, c))
    if (o.length > HALF) o.forEach((r) => mark(r, c))
  }
  // dicas violadas (só quando ambos preenchidos)
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N - 1; c++) {
      const rel = H[r][c]
      if (!rel || grid[r][c] === -1 || grid[r][c + 1] === -1) continue
      if ((rel === 1) !== (grid[r][c] === grid[r][c + 1])) {
        mark(r, c)
        mark(r, c + 1)
      }
    }
  for (let r = 0; r < N - 1; r++)
    for (let c = 0; c < N; c++) {
      const rel = V[r][c]
      if (!rel || grid[r][c] === -1 || grid[r + 1][c] === -1) continue
      if ((rel === 1) !== (grid[r][c] === grid[r + 1][c])) {
        mark(r, c)
        mark(r + 1, c)
      }
    }
  return bad
}

// ── Validação final: grade completa que satisfaz todas as regras + givens ───
export function estaResolvido(grid, puzzle) {
  const { givens } = puzzle
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (grid[r][c] !== 0 && grid[r][c] !== 1) return false
      if (givens[r][c] >= 0 && grid[r][c] !== givens[r][c]) return false
    }
  // como a solução é única, "sem conflitos + completo" ⇒ resolvido
  return conflitos(grid, puzzle).size === 0
}

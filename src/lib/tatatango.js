// Tatá Tango — desafio diário no estilo "Tango" do LinkedIn (Takuzu com dicas =/×).
//
// Grade n×n (n par) com dois valores (0/1). Regras:
//   • n/2 de cada valor por linha e por coluna;
//   • nunca 3 iguais seguidos (na horizontal ou vertical);
//   • dicas entre vizinhos: '=' (iguais) ou '×' (diferentes).
//
// O puzzle é GERADO a partir da fase/data (mesmo desafio pra todo mundo) e tem
// SOLUÇÃO ÚNICA — garantida por construção: geramos removendo pistas só enquanto
// o solver LÓGICO (por propagação, sem chute) ainda fecha a grade inteira. Se a
// lógica fecha tudo, a solução é necessariamente única. Tudo roda no front.
//
// Tamanhos suportados: 6×6, 8×8 e 10×10 (o solver por propagação torna a geração
// dos maiores viável no celular — o backtracking cego não escalava).

// Tamanho padrão (dias/fases antigos que não passam tamanho caem em 6×6).
export const N = 6

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

// ── Gera uma solução completa válida (backtracking com reinício) ────────────
function gerarSolucao(rng, n) {
  const half = n / 2
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const g = Array.from({ length: n }, () => Array(n).fill(-1))
    const rowCount = Array.from({ length: n }, () => [0, 0])
    const colCount = Array.from({ length: n }, () => [0, 0])
    function ok(r, c, v) {
      if (rowCount[r][v] >= half) return false
      if (colCount[c][v] >= half) return false
      if (c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) return false
      if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) return false
      return true
    }
    let estouros = 0
    function bt(idx) {
      if (idx === n * n) return true
      if (estouros > 60000) return false // reinicia com outra ordem
      const r = (idx / n) | 0
      const c = idx % n
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
      estouros++
      return false
    }
    if (bt(0)) return g
  }
  // fallback (praticamente nunca): grade em faixas — válida em balanço/trincas
  const g = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => ((c + (r % 2) + Math.floor(c / 2)) % 2)))
  return g
}

// ── Núcleo: pode colocar `v` em (r,c) sem violar regra local? ────────────────
// givens[r][c] ∈ {-1,0,1}; H[r][c] relação entre (r,c) e (r,c+1); V[r][c] entre
// (r,c) e (r+1,c). relação: 0 nada · 1 '=' · 2 '×'.
function podeColocar(g, rc, cc, H, V, n, half, r, c, v) {
  if (rc[r][v] >= half) return false
  if (cc[c][v] >= half) return false
  const row = g[r]
  // trincas envolvendo (r,c) com vizinhos já determinados
  if (c >= 2 && row[c - 1] === v && row[c - 2] === v) return false
  if (c >= 1 && c + 1 < n && row[c - 1] === v && row[c + 1] === v) return false
  if (c + 2 < n && row[c + 1] === v && row[c + 2] === v) return false
  if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) return false
  if (r >= 1 && r + 1 < n && g[r - 1][c] === v && g[r + 1][c] === v) return false
  if (r + 2 < n && g[r + 1][c] === v && g[r + 2][c] === v) return false
  // dicas com vizinhos determinados
  if (c >= 1 && row[c - 1] >= 0) {
    const rel = H[r][c - 1]
    if (rel === 1 && v !== row[c - 1]) return false
    if (rel === 2 && v === row[c - 1]) return false
  }
  if (c + 1 < n && row[c + 1] >= 0) {
    const rel = H[r][c]
    if (rel === 1 && v !== row[c + 1]) return false
    if (rel === 2 && v === row[c + 1]) return false
  }
  if (r >= 1 && g[r - 1][c] >= 0) {
    const rel = V[r - 1][c]
    if (rel === 1 && v !== g[r - 1][c]) return false
    if (rel === 2 && v === g[r - 1][c]) return false
  }
  if (r + 1 < n && g[r + 1][c] >= 0) {
    const rel = V[r][c]
    if (rel === 1 && v !== g[r + 1][c]) return false
    if (rel === 2 && v === g[r + 1][c]) return false
  }
  return true
}

// ── Propagação: preenche todas as células FORÇADAS até o ponto fixo ──────────
// Muta g. Retorna false se achar contradição (nenhum valor cabe em alguma célula).
function propagar(g, H, V, n) {
  const half = n / 2
  const rc = Array.from({ length: n }, () => [0, 0])
  const cc = Array.from({ length: n }, () => [0, 0])
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (g[r][c] >= 0) {
        rc[r][g[r][c]]++
        cc[c][g[r][c]]++
      }
  let mudou = true
  while (mudou) {
    mudou = false
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (g[r][c] >= 0) continue
        const p0 = podeColocar(g, rc, cc, H, V, n, half, r, c, 0)
        const p1 = podeColocar(g, rc, cc, H, V, n, half, r, c, 1)
        if (!p0 && !p1) return false
        if (p0 !== p1) {
          const v = p0 ? 0 : 1
          g[r][c] = v
          rc[r][v]++
          cc[c][v]++
          mudou = true
        }
      }
  }
  return true
}

// Resolve SÓ por lógica (sem chute). Devolve a grade cheia se a propagação
// fechou tudo; senão null (ficou ambíguo pra pura dedução).
export function resolvePorLogica(givens, H, V, n) {
  const g = givens.map((row) => row.slice())
  if (!propagar(g, H, V, n)) return null
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g[r][c] < 0) return null
  return g
}

// Conta soluções (até `limite`) com propagação + ramificação. Usado nos testes
// e como rede de segurança; a geração se apoia no resolvePorLogica.
export function contarSolucoes(givens, H, V, n, limite = 2) {
  function rec(base) {
    const g = base.map((row) => row.slice())
    if (!propagar(g, H, V, n)) return 0
    let er = -1
    let ec = -1
    for (let r = 0; r < n && er < 0; r++)
      for (let c = 0; c < n; c++)
        if (g[r][c] < 0) {
          er = r
          ec = c
          break
        }
    if (er < 0) return 1
    let total = 0
    for (let v = 0; v <= 1; v++) {
      g[er][ec] = v
      total += rec(g)
      g[er][ec] = -1
      if (total >= limite) return total
    }
    return total
  }
  return rec(givens)
}

// ── Monta o puzzle: parte de tudo revelado e remove pistas enquanto a lógica
//    ainda fecha a grade (⇒ único e dedutível). Ordem aleatória → variedade. ──
export function montarPuzzle(seed, opts = {}) {
  const n = opts.tamanho || N
  const extras = opts.extras || 0
  const rng = makeRng((seed ^ 0x9e3779b9) >>> 0)
  const solution = gerarSolucao(rng, n)

  // dicas completas a partir da solução
  const H = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n - 1 }, (_, c) => (solution[r][c] === solution[r][c + 1] ? 1 : 2)),
  )
  const V = Array.from({ length: n - 1 }, (_, r) =>
    Array.from({ length: n }, (_, c) => (solution[r][c] === solution[r + 1][c] ? 1 : 2)),
  )
  // começa com TODAS as peças reveladas
  const givens = solution.map((row) => row.slice())

  // lista de todas as pistas presentes, embaralhada
  const clues = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) clues.push(['g', r, c])
  for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) clues.push(['h', r, c])
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) clues.push(['v', r, c])
  shuffle(clues, rng)

  const PISO_GIVENS = 2 // mantém ao menos 2 peças como âncora visual
  const contaGivens = () => givens.reduce((a, row) => a + row.filter((x) => x >= 0).length, 0)

  for (const [t, r, c] of clues) {
    if (t === 'g') {
      if (givens[r][c] < 0 || contaGivens() <= PISO_GIVENS) continue
      const old = givens[r][c]
      givens[r][c] = -1
      if (!resolvePorLogica(givens, H, V, n)) givens[r][c] = old
    } else if (t === 'h') {
      const old = H[r][c]
      if (!old) continue
      H[r][c] = 0
      if (!resolvePorLogica(givens, H, V, n)) H[r][c] = old
    } else {
      const old = V[r][c]
      if (!old) continue
      V[r][c] = 0
      if (!resolvePorLogica(givens, H, V, n)) V[r][c] = old
    }
  }

  // Níveis fáceis: revela algumas peças extras (âncoras) além do mínimo.
  if (extras > 0) {
    const escondidas = []
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (givens[r][c] < 0) escondidas.push([r, c])
    shuffle(escondidas, rng)
    for (let i = 0; i < extras && i < escondidas.length; i++) {
      const [r, c] = escondidas[i]
      givens[r][c] = solution[r][c]
    }
  }

  return { n, solution, givens, H, V }
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

// Dificuldade pela fase: cresce o tabuleiro e os pontos.
//   1–5    Aprendiz  6×6 (bem guiado, ~24/36 reveladas)  · 10 pts
//   6–20   Aprendiz  6×6 (guiado, ~20/36 reveladas)      · 10 pts
//   21–50  Afiado    6×6 (~12/36 reveladas)              · 15 pts
//   51–100 Mestre    8×8                                 · 20 pts
//   101+   Lenda     10×10                               · 25 pts
export function tierDaFase(fase) {
  // Rampa suave de entrada: as primeiras fases vêm com bem mais âncoras
  // reveladas pra quem está aprendendo, afrouxando gradualmente.
  if (fase <= 5) return { tamanho: 6, extras: 20, rotulo: 'Aprendiz', pontos: 10 }
  if (fase <= 20) return { tamanho: 6, extras: 16, rotulo: 'Aprendiz', pontos: 10 }
  if (fase <= 50) return { tamanho: 6, extras: 8, rotulo: 'Afiado', pontos: 15 }
  if (fase <= 100) return { tamanho: 8, extras: 0, rotulo: 'Mestre', pontos: 20 }
  return { tamanho: 10, extras: 0, rotulo: 'Lenda', pontos: 25 }
}

// ── Conflitos ao vivo (células a destacar em vermelho) ──────────────────────
// grid[r][c] ∈ {-1,0,1} (-1 = vazio). Retorna Set de "r,c". Tamanho vem da grade.
export function conflitos(grid, puzzle) {
  const n = grid.length
  const half = n / 2
  const bad = new Set()
  const mark = (r, c) => bad.add(r + ',' + c)
  const { H, V } = puzzle
  // trincas
  for (let r = 0; r < n; r++)
    for (let c = 0; c <= n - 3; c++)
      if (grid[r][c] !== -1 && grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) {
        mark(r, c)
        mark(r, c + 1)
        mark(r, c + 2)
      }
  for (let c = 0; c < n; c++)
    for (let r = 0; r <= n - 3; r++)
      if (grid[r][c] !== -1 && grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c]) {
        mark(r, c)
        mark(r + 1, c)
        mark(r + 2, c)
      }
  // excesso por linha/coluna (mais de n/2 de um valor)
  for (let r = 0; r < n; r++) {
    const z = []
    const o = []
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 0) z.push(c)
      else if (grid[r][c] === 1) o.push(c)
    }
    if (z.length > half) z.forEach((c) => mark(r, c))
    if (o.length > half) o.forEach((c) => mark(r, c))
  }
  for (let c = 0; c < n; c++) {
    const z = []
    const o = []
    for (let r = 0; r < n; r++) {
      if (grid[r][c] === 0) z.push(r)
      else if (grid[r][c] === 1) o.push(r)
    }
    if (z.length > half) z.forEach((r) => mark(r, c))
    if (o.length > half) o.forEach((r) => mark(r, c))
  }
  // dicas violadas (só quando ambos preenchidos)
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n - 1; c++) {
      const rel = H[r][c]
      if (!rel || grid[r][c] === -1 || grid[r][c + 1] === -1) continue
      if ((rel === 1) !== (grid[r][c] === grid[r][c + 1])) {
        mark(r, c)
        mark(r, c + 1)
      }
    }
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n; c++) {
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
  const n = grid.length
  const { givens } = puzzle
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== 0 && grid[r][c] !== 1) return false
      if (givens[r][c] >= 0 && grid[r][c] !== givens[r][c]) return false
    }
  // como a solução é única, "sem conflitos + completo" ⇒ resolvido
  return conflitos(grid, puzzle).size === 0
}

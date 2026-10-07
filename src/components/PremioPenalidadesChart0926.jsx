import { useEffect, useState } from 'react'

// Gráfico animado: prêmio perdido por apontamentos da qualidade, por unidade.
// As barras crescem na entrada e são escaladas pela maior. A barra menor fica
// mais clara (opacidade por proporção). Dados editáveis aqui no topo OU via props.
//
// Versão do mês: 0926 (Setembro/2026). Convenção: a cada mês cria-se um novo
// arquivo/componente com o sufixo MMAA (ex.: PremioPenalidadesChart1026).
const DADOS = [
  { unidade: 'Pinheiros', valor: 1022 },
  { unidade: 'Itaim', valor: 2380 },
]

// R$ sem centavos, com separador de milhar (ex.: R$ 2.380).
const BRL0 = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

export function PremioPenalidadesChart0926({
  dados = DADOS,
  titulo = 'Prêmio perdido devido apontamentos da qualidade',
  subtitulo = 'Setembro',
  rotuloTotal = 'Total perdido',
  altura = 200,
}) {
  // Respeita "reduzir movimento": sem animação de crescimento.
  const reduz =
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [animar, setAnimar] = useState(reduz)
  useEffect(() => {
    if (reduz) return
    const r = requestAnimationFrame(() => setAnimar(true))
    return () => cancelAnimationFrame(r)
  }, [reduz])

  const max = Math.max(...dados.map((d) => d.valor), 1)
  const total = dados.reduce((a, d) => a + d.valor, 0)

  return (
    <div className="my-5 overflow-hidden rounded-card border border-line bg-surface p-5">
      {/* Título */}
      <div className="text-center">
        <h3 className="text-balance font-display text-base font-extrabold leading-tight text-text">
          {titulo}
        </h3>
        {subtitulo && <p className="mt-1 text-xs font-medium text-muted">{subtitulo}</p>}
      </div>

      {/* Barras */}
      <div className="mt-6 flex items-end justify-center gap-5" style={{ height: altura }}>
        {dados.map((d) => {
          const alturaPct = (d.valor / max) * 100
          const intensidade = 0.5 + 0.5 * (d.valor / max) // menor valor = barra mais clara
          return (
            <div
              key={d.unidade}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <div className="mb-2 whitespace-nowrap font-display text-base font-extrabold text-danger sm:text-lg">
                − {BRL0(d.valor)}
              </div>
              <div
                className="w-full max-w-[150px] rounded-t-lg bg-danger transition-[height] duration-700 ease-out"
                style={{ height: animar ? `${alturaPct}%` : '0%', opacity: intensidade }}
              />
            </div>
          )
        })}
      </div>

      {/* Eixo + rótulos das unidades */}
      <div className="h-px w-full bg-line" />
      <div className="mt-2 flex justify-center gap-5">
        {dados.map((d) => (
          <div
            key={d.unidade}
            className="min-w-0 flex-1 truncate text-center text-sm font-medium text-muted"
          >
            {d.unidade}
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 text-center text-sm font-extrabold text-danger">
        {rotuloTotal}: {BRL0(total)}
      </div>
    </div>
  )
}

export default PremioPenalidadesChart0926

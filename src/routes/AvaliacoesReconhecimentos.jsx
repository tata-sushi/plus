import { useState } from 'react'
import { Header } from '../components/Header.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { podeVerReconhecimento } from '../lib/reconhecimento.js'
import { MinhaExperiencia } from './MinhaExperiencia.jsx'
import { Reconhecimentos } from './Reconhecimentos.jsx'
import { cn } from '../lib/cn'

// Página única "Avaliações e Reconhecimentos": um cabeçalho só e, para quem tem
// acesso a Reconhecimentos (soft-launch), um seletor de abas. Cada aba embute a
// tela existente sem o cabeçalho próprio (prop `embutido`).
export function AvaliacoesReconhecimentos() {
  const { usuario } = useAuth()
  const temRec = podeVerReconhecimento(usuario)
  const [aba, setAba] = useState('avaliacoes')

  return (
    <>
      <Header />
      <CabecalhoPagina
        titulo="Avaliações e Reconhecimentos"
        descricao="Seja parte do desenvolvimento. Avalie e reconheça."
      />

      {temRec && (
        <div className="px-5 pt-1">
          <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-2 p-1">
            {[
              ['avaliacoes', 'Avaliações'],
              ['reconhecimentos', 'Reconhecimentos'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={cn(
                  'rounded-full py-2 text-sm font-semibold tap',
                  aba === id ? 'bg-accent text-black' : 'text-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {temRec && aba === 'reconhecimentos' ? (
        <Reconhecimentos embutido />
      ) : (
        <MinhaExperiencia embutido />
      )}
    </>
  )
}

export default AvaliacoesReconhecimentos

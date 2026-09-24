import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn'
import { NavGovernanca } from './NavGovernanca.jsx'

// Menu de navegação lateral (drawer) da Governança no CELULAR. Desliza da
// esquerda e encaixa ACIMA da barra inferior (não a cobre). O conteúdo é o
// componente compartilhado NavGovernanca; aqui só cuidamos da moldura/animação
// e de para onde as ações levam (abrir a página / o portal, e fechar).
export function MenuLateral({ aberto, onClose }) {
  const [render, setRender] = useState(aberto)
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  // Entrada suave: monta primeiro, deixa o navegador pintar o estado inicial
  // (fora da tela) e só então dispara a transição — dois requestAnimationFrame
  // evitam a "truncada" de quando classe inicial e final entram no mesmo frame.
  useEffect(() => {
    if (aberto) {
      setRender(true)
      let r2
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShow(true))
      })
      return () => {
        cancelAnimationFrame(r1)
        if (r2) cancelAnimationFrame(r2)
      }
    }
    setShow(false)
    const t = setTimeout(() => setRender(false), 300)
    return () => clearTimeout(t)
  }, [aberto])

  // Trava a rolagem do fundo enquanto aberto.
  useEffect(() => {
    if (!render) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [render])

  // Esc fecha.
  useEffect(() => {
    if (!render) return
    const aoTeclar = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [render, onClose])

  if (!render) return null

  const selecionar = (p) => {
    onClose()
    navigate(`/painel/${p.id}`)
  }
  const abrirPortal = () => {
    onClose()
    navigate('/governanca')
  }

  return createPortal(
    // Encaixa ACIMA da barra de navegação inferior (não a cobre): a base para na
    // altura publicada pela barra (--tp-nav-h), então a barra segue visível/clicável.
    <div className="fixed inset-x-0 top-0 z-40" style={{ bottom: 'var(--tp-nav-h, 3.5rem)' }}>
      {/* Fundo escuro (fecha ao tocar) */}
      <button
        aria-label="Fechar menu"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          show ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Painel lateral */}
      <aside
        role="dialog"
        aria-label="Menu da Governança"
        className={cn(
          'absolute left-0 top-0 h-full w-[86vw] max-w-[340px] bg-bg shadow-2xl',
          'transition-transform duration-300 ease-out will-change-transform',
          show ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <NavGovernanca onSelecionar={selecionar} onAbrirPortal={abrirPortal} />
      </aside>
    </div>,
    document.body,
  )
}

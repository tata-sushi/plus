import { Component } from 'react'

// Rede de proteção pra rotas carregadas sob demanda: se o render OU o
// carregamento do chunk falhar, mostra um card com a mensagem em vez de deixar
// a tela preta (o app não tem boundary global).
export class ErroBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }
  static getDerivedStateFromError(erro) {
    return { erro }
  }
  componentDidCatch(erro, info) {
    // eslint-disable-next-line no-console
    console.error('ErroBoundary:', erro, info)
  }
  render() {
    if (this.state.erro) {
      const msg = String(this.state.erro?.message || this.state.erro || 'Erro desconhecido')
      return (
        <div className="grid min-h-[100dvh] place-items-center bg-bg px-6">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center">
            <div className="font-display text-base font-bold text-text">Algo quebrou aqui</div>
            <div className="mt-2 max-h-40 overflow-auto break-words text-left text-[11px] leading-relaxed text-muted">
              {msg}
            </div>
            <button
              onClick={() => {
                this.setState({ erro: null })
                window.location.href = '/'
              }}
              className="btn-primary mt-4 w-full !py-2.5 text-sm"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

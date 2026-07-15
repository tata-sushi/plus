import { useRef, useState } from 'react'
import { Loader2, Upload, CheckCircle2, Clock, XCircle, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn'

const TAM_MAX = 15 * 1024 * 1024 // 15 MB

// Desafio de "envio moderado": o colaborador anexa um arquivo (imagem ou PDF)
// que vai pra um bucket privado e fica aguardando a moderação do admin. Só depois
// de aprovado é que os pontos entram. Estados: sem envio / pendente / aprovado / reprovado.
export function EnvioDesafio({ treinoId, matricula, envio, concluido, liberado, dataFim, pontos, onEnviado }) {
  const inputRef = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const status = concluido ? 'aprovado' : envio?.status || null
  const prazo = dataFim
    ? new Date(`${dataFim}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    : null

  async function escolher(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const ehImg = f.type.startsWith('image/')
    const ehPdf = f.type === 'application/pdf'
    if (!ehImg && !ehPdf) {
      setErro('Envie uma imagem ou um PDF.')
      return
    }
    if (f.size > TAM_MAX) {
      setErro('Arquivo muito grande (máx. 15 MB).')
      return
    }
    setErro('')
    setEnviando(true)
    const ext = ehPdf ? 'pdf' : (f.name.split('.').pop() || 'jpg').toLowerCase()
    const caminho = `${matricula}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('envios')
      .upload(caminho, f, { contentType: f.type, cacheControl: '3600' })
    if (upErr) {
      setEnviando(false)
      setErro('Não foi possível enviar o arquivo.')
      return
    }
    const { data, error } = await supabase.rpc('enviar_desafio', {
      p_treino: treinoId,
      p_arquivo_path: caminho,
      p_arquivo_tipo: ehPdf ? 'pdf' : 'image',
    })
    setEnviando(false)
    if (error || !data?.ok) {
      setErro('Não foi possível registrar o envio. Tente de novo.')
      return
    }
    onEnviado?.()
  }

  if (status === 'aprovado') {
    return (
      <div className="rounded-card border border-accent/30 bg-accent-soft px-4 py-5 text-center">
        <CheckCircle2 className="mx-auto text-accent" size={28} />
        <p className="mt-2 text-sm font-bold text-accent">Cartão aprovado! +{pontos} pontos</p>
        <p className="mt-0.5 text-xs text-muted">Seus pontos já entraram na carteira. 🎉</p>
      </div>
    )
  }

  if (status === 'pendente') {
    return (
      <div>
        <div className="rounded-card border border-warn/30 bg-warn/10 px-4 py-5 text-center">
          <Clock className="mx-auto text-warn" size={25} />
          <p className="mt-2 text-sm font-bold text-warn">Enviado! Aguardando análise</p>
          <p className="mt-0.5 text-xs text-muted">
            Assim que o RH validar seu cartão, seus {pontos} pontos entram.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={escolher}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="btn-ghost mt-3 w-full !py-2.5 text-xs text-muted"
        >
          {enviando ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <>
              <RotateCcw size={14} /> Trocar o anexo
            </>
          )}
        </button>
        {erro && <p className="mt-2 text-center text-xs font-medium text-danger">{erro}</p>}
      </div>
    )
  }

  // sem envio ou reprovado → área de upload
  return (
    <div>
      {status === 'reprovado' && (
        <div className="mb-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3">
          <div className="hstack gap-2 text-sm font-semibold text-danger">
            <XCircle size={17} /> Cartão não aprovado
          </div>
          {envio?.motivo && <p className="mt-1 text-xs text-muted">{envio.motivo}</p>}
          <p className="mt-1 text-[11px] text-muted-2">Confira o cartão e envie novamente.</p>
        </div>
      )}
      <p className="mb-2 text-sm font-semibold">Anexar cartão de ponto</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={escolher}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={enviando || !liberado}
        className={cn(
          'grid w-full place-items-center rounded-card border border-dashed border-line bg-surface-2 py-8 text-muted tap',
          (enviando || !liberado) && 'opacity-60',
        )}
      >
        {enviando ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <div className="text-center">
            <Upload size={24} className="mx-auto" />
            <div className="mt-1.5 text-xs font-semibold">Toque para anexar (imagem ou PDF)</div>
            {prazo && <div className="mt-0.5 text-[11px] text-muted-2">Envie até {prazo}</div>}
          </div>
        )}
      </button>
      {!liberado && (
        <p className="mt-2 text-center text-[11px] text-muted-2">Fora do período de envio.</p>
      )}
      {erro && <p className="mt-2 text-center text-xs font-medium text-danger">{erro}</p>}
    </div>
  )
}

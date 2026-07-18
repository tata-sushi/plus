import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Card } from '../components/Card.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// Ouvidoria nativa — mesmo formulário/envio da página externa (ouvidoria.tatasushi.tech),
// mas rodando dentro do app. Envia um POST (no-cors) para o Web App do Apps Script,
// que grava na planilha "Ouvidoria". Resposta é opaca (no-cors) → seguimos p/ sucesso.
const OUVIDORIA_URL =
  'https://script.google.com/macros/s/AKfycbwVPDROxvIfl4yaIZqNPlRdl5-UTtVSUeUMd5H9GdPn0wXnyaMKtwaLSvn1TdvTMw3Xnw/exec'

const inputCls =
  'w-full rounded-card border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-2 focus:border-accent'

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  )
}

function RadioGroup({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const on = value === o.v
          return (
            <button
              type="button"
              key={o.v}
              onClick={() => onChange(o.v)}
              className={cn(
                'hstack gap-2.5 rounded-card border px-4 py-3 text-left text-sm tap',
                on ? 'border-accent bg-accent-soft font-semibold' : 'border-line',
              )}
            >
              <span
                className={cn(
                  'grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                  on ? 'border-accent' : 'border-line',
                )}
              >
                {on && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Ouvidoria() {
  const [identificacao, setIdentificacao] = useState('')
  const [nome, setNome] = useState('')
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')
  const [devolutiva, setDevolutiva] = useState('')
  const [forma, setForma] = useState('')
  const [contato, setContato] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const mostraNome = identificacao === 'Sim'
  const mostraForma = devolutiva === 'Sim'
  const mostraContato = devolutiva === 'Sim' && forma !== ''

  const podeEnviar =
    !!identificacao &&
    (!mostraNome || nome.trim()) &&
    !!data &&
    !!descricao.trim() &&
    !!devolutiva &&
    (!mostraForma || forma) &&
    (!mostraContato || contato.trim()) &&
    !enviando

  async function enviar(e) {
    e.preventDefault()
    if (!podeEnviar) return
    tapHaptic()
    setEnviando(true)
    const payload = {
      identificacao,
      nome: mostraNome ? nome.trim() : '',
      data,
      descricao: descricao.trim(),
      devolutiva,
      forma: mostraForma ? forma : '',
      contato: mostraContato ? contato.trim() : '',
    }
    try {
      await fetch(OUVIDORIA_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      })
    } catch {
      /* no-cors: resposta opaca; segue para o sucesso mesmo assim */
    }
    setEnviando(false)
    setEnviado(true)
  }

  if (enviado) {
    return (
      <>
        <Header title="Ouvidoria" />
        <div className="grid place-items-center px-8 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent">
            <Check size={30} />
          </span>
          <div className="mt-4 font-display text-lg font-bold">Relato enviado!</div>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Recebemos seu relato. Ele será analisado com sigilo e, se solicitado, você receberá uma
            devolutiva em breve.
          </p>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Obrigado pelo seu relato e contribuição para um TATÁ melhor.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Ouvidoria" />
      <Voltar />

      <div className="px-5 pt-2">
        <Card>
          <h2 className="text-center font-display text-base font-bold">Sigiloso e seguro</h2>
          <p className="mt-2 text-justify text-sm text-muted">
            Use este canal para relatar feedbacks, sugestões, denúncias ou qualquer ocorrência. Você
            pode se identificar ou permanecer anônimo. Todas as manifestações são tratadas com
            sigilo.
          </p>
          <div className="mt-3 rounded-card border-l-2 border-accent bg-accent-soft px-3 py-2.5 text-[13px] text-muted">
            <strong className="text-text">Sigilo garantido.</strong> Suas informações serão tratadas
            com total confidencialidade. A identidade de quem se identifica nunca será revelada sem
            sua autorização.
          </div>

          <form onSubmit={enviar} className="mt-4 flex flex-col gap-4">
            <RadioGroup
              label="Você deseja identificar-se?"
              value={identificacao}
              onChange={setIdentificacao}
              options={[
                { v: 'Sim', label: 'Sim' },
                { v: 'Não', label: 'Não (permanecer anônimo)' },
              ]}
            />

            {mostraNome && (
              <Campo label="Qual seu nome?">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className={inputCls}
                />
              </Campo>
            )}

            <Campo label="Informe a data do ocorrido">
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputCls}
              />
            </Campo>

            <Campo label="Descreva seu feedback ou ocorrência">
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                placeholder="Descreva detalhadamente o que aconteceu, quando, onde e quem estava envolvido..."
                className={cn(inputCls, 'resize-none')}
              />
            </Campo>

            <RadioGroup
              label="Você gostaria de uma devolutiva?"
              value={devolutiva}
              onChange={setDevolutiva}
              options={[
                { v: 'Sim', label: 'Sim' },
                { v: 'Não', label: 'Não' },
              ]}
            />

            {mostraForma && (
              <Campo label="De qual forma gostaria de ter a devolutiva?">
                <select
                  value={forma}
                  onChange={(e) => setForma(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  <option value="Whatsapp">WhatsApp</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Pessoalmente">Pessoalmente</option>
                </select>
              </Campo>
            )}

            {mostraContato && (
              <Campo label="Informe os dados da opção escolhida acima">
                <input
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder="Ex: número de WhatsApp, e-mail ou nome para contato pessoal"
                  className={inputCls}
                />
              </Campo>
            )}

            <button
              type="submit"
              disabled={!podeEnviar}
              className={cn('btn-primary mt-1 w-full !py-3.5', !podeEnviar && 'opacity-50')}
            >
              {enviando ? <Loader2 size={18} className="animate-spin" /> : 'Enviar relato'}
            </button>
          </form>
        </Card>
      </div>
    </>
  )
}

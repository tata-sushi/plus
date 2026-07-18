import { useState } from 'react'
import { Check } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'

// Ouvidoria nativa — replica o formulário/design da página externa
// (ouvidoria.tatasushi.tech). As cores são as MESMAS do HTML original, fixas
// nos dois temas (claro/escuro): card branco, texto escuro, botão carbon+citric.
// Envia um POST (no-cors) ao mesmo Web App do Apps Script (planilha "Ouvidoria").
const OUVIDORIA_URL =
  'https://script.google.com/macros/s/AKfycbwVPDROxvIfl4yaIZqNPlRdl5-UTtVSUeUMd5H9GdPn0wXnyaMKtwaLSvn1TdvTMw3Xnw/exec'

// paleta do HTML original
const CARBON = '#35383F'
const CITRIC = '#CFFF00'

const inputCls =
  'w-full rounded-card border border-[#E2E2E2] bg-white px-3 py-2.5 text-[13px] text-[#111111] outline-none placeholder:text-[#9a9a9a] focus:border-[#35383F]'

function Label({ children }) {
  return (
    <label className="mb-2 block text-[13px] font-semibold text-[#111111]">
      {children}
      <span className="ml-0.5 text-[#D32F2F]">*</span>
    </label>
  )
}

function RadioGroup({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-col gap-2.5">
        {options.map((o) => {
          const on = value === o.v
          return (
            <button
              type="button"
              key={o.v}
              onClick={() => onChange(o.v)}
              className="hstack items-center gap-2.5 text-left tap"
            >
              <span
                className={cn(
                  'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2',
                  on ? 'border-[#35383F]' : 'border-[#bcbcbc]',
                )}
              >
                {on && <span className="h-2.5 w-2.5 rounded-full bg-[#35383F]" />}
              </span>
              <span className="text-[13px] text-[#555555]">{o.label}</span>
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
        <div className="px-5 pt-2">
          <div className="rounded-card border border-[#E2E2E2] bg-white p-8 text-center">
            <span
              className="mx-auto grid h-14 w-14 place-items-center rounded-full text-[#1A5C2A]"
              style={{ background: '#EAF4ED' }}
            >
              <Check size={28} strokeWidth={2.5} />
            </span>
            <div className="mt-4 font-display text-lg font-bold text-[#111111]">Relato enviado!</div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#555555]">
              Recebemos seu relato. Ele será analisado com sigilo e, se solicitado, você receberá
              uma devolutiva em breve.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[#555555]">
              Obrigado pelo seu relato e contribuição para um TATÁ melhor.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Ouvidoria" />

      <div className="px-5 pt-2">
        <div className="rounded-card border border-[#E2E2E2] bg-white p-6">
          <h2 className="text-center font-display text-lg font-bold text-[#111111]">
            Sigiloso e seguro
          </h2>
          <p className="mt-2 border-b border-[#E2E2E2] pb-5 text-justify text-[13px] leading-relaxed text-[#555555]">
            Use este canal para relatar feedbacks, sugestões, denúncias ou qualquer ocorrência. Você
            pode se identificar ou permanecer anônimo. Todas as manifestações são tratadas com
            sigilo.
          </p>

          {/* Info box citric */}
          <div
            className="mt-5 rounded-r-card px-3.5 py-3 text-[12.5px] leading-relaxed text-[#555555]"
            style={{ borderLeft: `3px solid ${CITRIC}`, background: 'rgba(207,255,0,0.10)' }}
          >
            <strong className="font-semibold text-[#111111]">Sigilo garantido.</strong> Suas
            informações serão tratadas com total confidencialidade. A identidade de quem se
            identifica nunca será revelada sem sua autorização.
          </div>

          <form onSubmit={enviar} className="mt-5 flex flex-col gap-5">
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
              <div>
                <Label>Qual seu nome?</Label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className={inputCls}
                />
              </div>
            )}

            <div>
              <Label>Informe a data do ocorrido</Label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <Label>Descreva seu feedback ou ocorrência</Label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
                placeholder="Descreva detalhadamente o que aconteceu, quando, onde e quem estava envolvido..."
                className={cn(inputCls, 'resize-none leading-relaxed')}
              />
            </div>

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
              <div>
                <Label>De qual forma gostaria de ter a devolutiva?</Label>
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
              </div>
            )}

            {mostraContato && (
              <div>
                <Label>Informe os dados da opção escolhida acima</Label>
                <input
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder="Ex: número de WhatsApp, e-mail ou nome para contato pessoal"
                  className={inputCls}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!podeEnviar}
              className={cn(
                'mt-1 w-full rounded-pill py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] transition-opacity tap',
                !podeEnviar && 'opacity-50',
              )}
              style={{ background: CARBON, color: CITRIC }}
            >
              {enviando ? 'Enviando...' : 'Enviar relato'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

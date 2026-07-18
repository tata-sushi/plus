import { useEffect, useState } from 'react'
import { Lock, Eye, EyeOff, Check, Loader2, ShieldCheck, Sun, Moon, Bell, BellOff } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Voltar } from '../components/Voltar.jsx'
import { Section } from '../components/Section.jsx'
import { cn } from '../lib/cn'
import { tapHaptic } from '../lib/haptics.js'
import { getTheme, applyTheme } from '../lib/theme.js'
import { estadoPush, ativarPush, desativarPush } from '../lib/push.js'
import { useAuth } from '../lib/AuthContext.jsx'

const TEMAS = [
  { v: 'light', label: 'Claro', Icon: Sun },
  { v: 'dark', label: 'Escuro', Icon: Moon },
]

export function Manutencao() {
  const { updatePassword } = useAuth()
  const [tema, setTema] = useState(getTheme)
  const [push, setPush] = useState({ suportado: false, ativo: false, permissao: 'default' })
  const [pushBusy, setPushBusy] = useState(false)
  const [pushErro, setPushErro] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const curta = nova.length > 0 && nova.length < 6
  const naoConfere = confirma.length > 0 && nova !== confirma
  const podeSalvar =
    nova.length >= 6 && nova === confirma && !enviando

  function trocarTema(t) {
    tapHaptic()
    setTema(applyTheme(t))
  }

  useEffect(() => {
    let ativo = true
    estadoPush().then((e) => ativo && setPush(e))
    return () => {
      ativo = false
    }
  }, [])

  async function alternarPush() {
    if (pushBusy) return
    tapHaptic()
    setPushBusy(true)
    setPushErro('')
    const r = push.ativo ? await desativarPush() : await ativarPush()
    if (!r.ok) {
      setPushErro(
        r.erro === 'permissao'
          ? 'Permissão de notificação negada. Ative nas configurações do navegador.'
          : 'Não foi possível ativar as notificações neste aparelho.',
      )
    }
    setPush(await estadoPush())
    setPushBusy(false)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!podeSalvar) return
    tapHaptic()
    setErro('')
    setOk(false)
    setEnviando(true)
    const { error } = await updatePassword(nova)
    setEnviando(false)
    if (error) {
      setErro(
        error.message?.includes('should be different')
          ? 'A nova senha precisa ser diferente da atual.'
          : 'Não foi possível alterar a senha. Tente novamente.',
      )
      return
    }
    setOk(true)
    setNova('')
    setConfirma('')
  }

  return (
    <>
      <Header title="Painel de Ajustes" />
      <Voltar />

      <Section className="mt-2" title="Notificações">
        <div className="card p-4">
          <div className="hstack gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Bell size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold">Ativar notificação</div>
              {!push.suportado && (
                <div className="text-xs text-muted">
                  Instale o app na tela inicial para ativar as notificações.
                </div>
              )}
            </div>
            {/* Seletor liga/desliga no mesmo padrão do Contraste. */}
            <div className="hstack shrink-0 gap-1 rounded-pill bg-surface-2 p-1">
              {[
                { on: false, label: 'Desligar', Icon: BellOff },
                { on: true, label: 'Ativar', Icon: Bell },
              ].map(({ on, label, Icon }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (on !== push.ativo) alternarPush()
                  }}
                  disabled={!push.suportado || pushBusy}
                  aria-label={label}
                  aria-pressed={push.ativo === on}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full tap',
                    push.ativo === on ? 'bg-accent text-black' : 'text-muted',
                    (!push.suportado || pushBusy) && 'opacity-50',
                  )}
                >
                  {pushBusy && on === !push.ativo ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Icon size={15} />
                  )}
                </button>
              ))}
            </div>
          </div>
          {pushErro && <div className="mt-2 text-[11px] font-medium text-danger">{pushErro}</div>}
        </div>
      </Section>

      <Section className="mt-5" title="Aparência">
        <div className="card p-4">
          <div className="hstack gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              {tema === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold">Contraste</div>
            </div>
            <div className="hstack shrink-0 gap-1 rounded-pill bg-surface-2 p-1">
              {TEMAS.map(({ v, label, Icon }) => (
                <button
                  key={v}
                  onClick={() => trocarTema(v)}
                  aria-label={label}
                  aria-pressed={tema === v}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full tap',
                    tema === v ? 'bg-accent text-black' : 'text-muted',
                  )}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="mt-5" title="Segurança">
        <div className="card p-4">
          <div className="hstack gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <ShieldCheck size={20} />
            </span>
            <div className="min-w-0">
              <div className="font-display text-sm font-bold">Alterar senha</div>
              <div className="text-xs text-muted">Defina uma nova senha de acesso.</div>
            </div>
          </div>

          <form onSubmit={salvar} className="mt-4 flex flex-col gap-3">
            <label className="hstack gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
              <Lock size={18} className="shrink-0 text-muted" />
              <input
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nova senha"
                value={nova}
                onChange={(e) => {
                  setNova(e.target.value)
                  setOk(false)
                  setErro('')
                }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
              />
              <button
                type="button"
                onClick={() => setMostrar((s) => !s)}
                className="shrink-0 text-muted tap"
                aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>

            <label className="hstack gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
              <Lock size={18} className="shrink-0 text-muted" />
              <input
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirmar nova senha"
                value={confirma}
                onChange={(e) => {
                  setConfirma(e.target.value)
                  setOk(false)
                  setErro('')
                }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
              />
            </label>

            <div className="min-h-[16px] text-[11px]">
              {curta && <span className="text-danger">Use pelo menos 6 caracteres.</span>}
              {!curta && naoConfere && (
                <span className="text-danger">As senhas não conferem.</span>
              )}
              {!curta && !naoConfere && (
                <span className="text-muted-2">Mínimo de 6 caracteres.</span>
              )}
            </div>

            {erro && (
              <div className="rounded-card border border-danger/30 bg-danger/10 px-4 py-2.5 text-center text-xs font-medium text-danger">
                {erro}
              </div>
            )}

            {ok && (
              <div className="hstack justify-center gap-2 rounded-card border border-accent/30 bg-accent-soft px-4 py-2.5 text-center text-xs font-semibold text-accent">
                <Check size={16} /> Senha alterada com sucesso.
              </div>
            )}

            <button
              type="submit"
              disabled={!podeSalvar}
              className={cn('btn-primary mt-1 w-full !py-3.5', !podeSalvar && 'opacity-50')}
            >
              {enviando ? <Loader2 size={18} className="animate-spin" /> : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </Section>
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Search, Loader2, HeartHandshake, Check } from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { ReconhecerSheet } from '../components/ReconhecerSheet.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { tempoRelativo } from '../lib/tempo.js'
import {
  carregarMotivos,
  iconeMotivo,
  rotuloMotivo,
  podeVerReconhecimento,
} from '../lib/reconhecimento.js'
import { tapHaptic } from '../lib/haptics.js'
import { cn } from '../lib/cn'

const soPrimeiro = (n) => (n || 'Colaborador').split(/\s+/)[0]

// Uma linha do histórico de reconhecimentos. Na aba "dei" o destaque é quem
// recebeu; na "recebi", quem deu.
function Linha({ rec, aba, motivos }) {
  const navigate = useNavigate()
  const outro =
    aba === 'dei'
      ? { m: rec.para_matricula, nome: rec.para_nome, avatar: rec.para_avatar }
      : { m: rec.de_matricula, nome: rec.de_nome, avatar: rec.de_avatar }
  const Icon = iconeMotivo(rec.motivo)
  return (
    <div className="hstack items-start gap-3 px-4 py-3">
      <button
        onClick={() => outro.m && navigate(`/perfil/${outro.m}`)}
        className="shrink-0 tap"
        aria-label={`Perfil de ${outro.nome}`}
      >
        <Avatar name={outro.nome} src={outro.avatar} size={40} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug">
          {aba === 'dei' ? (
            <>
              <span className="text-muted">Você reconheceu </span>
              <span className="font-semibold">{soPrimeiro(outro.nome)}</span>
            </>
          ) : (
            <>
              <span className="font-semibold">{soPrimeiro(outro.nome)}</span>
              <span className="text-muted"> reconheceu você</span>
            </>
          )}
        </div>
        <div className="mt-1 hstack flex-wrap gap-2">
          <span className="hstack gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold">
            <Icon size={12} className="text-accent" />
            {rotuloMotivo(rec.motivo, motivos)}
          </span>
          <span className="text-[11px] text-muted-2">{tempoRelativo(rec.created_at)}</span>
        </div>
        {rec.mensagem && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted">“{rec.mensagem}”</p>
        )}
      </div>
    </div>
  )
}

export function Reconhecimentos() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const matricula = usuario?.matricula
  const podeRec = podeVerReconhecimento(usuario) // soft-launch: só admin por ora

  const [motivos, setMotivos] = useState([])
  const [aba, setAba] = useState('dei') // 'dei' | 'recebi'
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)

  // Busca de colega
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)

  // Sheet + toast
  const [alvo, setAlvo] = useState(null) // { matricula, nome }
  const [toast, setToast] = useState('')

  useEffect(() => {
    carregarMotivos().then(setMotivos)
  }, [])

  const carregar = useCallback(async () => {
    if (!matricula || !podeRec) return
    setCarregando(true)
    const params = aba === 'dei' ? { p_de: matricula } : { p_para: matricula }
    const { data } = await supabase.rpc('reconhecimento_feed', { p_limite: 50, ...params })
    setLista(data || [])
    setCarregando(false)
  }, [matricula, aba, podeRec])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Busca debounced (mesma RPC do "Buscar colaborador")
  useEffect(() => {
    const t = termo.trim()
    if (t.length < 2) {
      setResultados([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    const timer = setTimeout(() => {
      let ativo = true
      supabase.rpc('buscar_colaboradores', { p_termo: t }).then(({ data }) => {
        if (!ativo) return
        setResultados((data || []).filter((c) => c.matricula !== matricula))
        setBuscando(false)
      })
      return () => {
        ativo = false
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [termo, matricula])

  const curto = termo.trim().length < 2

  // Soft-launch: quem não é admin não acessa a página por enquanto.
  if (usuario && !podeRec) return <Navigate to="/" replace />

  return (
    <>
      <Header title="Reconhecimentos" />

      <div className="px-5 pt-4">
        <button onClick={() => navigate(-1)} className="hstack gap-1 text-sm text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      {toast && (
        <div className="mt-3 px-5">
          <div className="hstack gap-2 rounded-card bg-accent-soft px-3.5 py-3 text-sm font-semibold text-accent">
            <Check size={16} className="shrink-0" /> {toast}
          </div>
        </div>
      )}

      {/* Reconhecer um colega */}
      <Section className="mt-4" title="Reconhecer um colega">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" />
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar colega pelo nome…"
            className="w-full rounded-full border border-line bg-surface py-3 pl-10 pr-4 text-sm outline-none focus:border-accent"
          />
        </div>

        {!curto && (
          <div className="mt-2">
            {buscando ? (
              <div className="hstack justify-center py-4 text-muted-2">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : resultados.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Ninguém encontrado.</p>
            ) : (
              <div className="card overflow-hidden">
                {resultados.map((c, i) => (
                  <button
                    key={c.matricula}
                    onClick={() => {
                      tapHaptic()
                      setAlvo({ matricula: c.matricula, nome: c.nome })
                    }}
                    className={cn(
                      'hstack w-full gap-3 px-4 py-3 text-left tap',
                      i > 0 && 'border-t border-line',
                    )}
                  >
                    <Avatar name={c.nome} src={c.avatar_url} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{c.nome}</div>
                      <div className="truncate text-[11px] text-muted">
                        {c.departamento}
                        {c.departamento && c.unidade ? ' · ' : ''}
                        {c.unidade}
                      </div>
                    </div>
                    <HeartHandshake size={16} className="shrink-0 text-accent" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Histórico */}
      <Section className="mt-5" title="Histórico">
        <div className="mb-3 flex gap-2">
          {[
            { id: 'dei', label: 'Enviadas' },
            { id: 'recebi', label: 'Recebidas' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className={cn(
                'flex-1 rounded-pill border px-3.5 py-2.5 text-center text-xs font-semibold tap',
                aba === t.id
                  ? 'border-accent bg-accent text-black'
                  : 'border-line bg-surface text-muted',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {aba === 'dei'
              ? 'Você ainda não reconheceu ninguém. Que tal começar? 👏'
              : 'Você ainda não recebeu reconhecimentos.'}
          </p>
        ) : (
          <Card className="!p-0">
            <div className="divide-y divide-line">
              {lista.map((rec) => (
                <Linha key={rec.id} rec={rec} aba={aba} motivos={motivos} />
              ))}
            </div>
          </Card>
        )}
      </Section>

      {alvo && (
        <ReconhecerSheet
          paraMatricula={alvo.matricula}
          paraNome={alvo.nome}
          onClose={() => setAlvo(null)}
          onSucesso={({ motivoLabel }) => {
            setToast(`Você reconheceu ${soPrimeiro(alvo.nome)} por ${motivoLabel}.`)
            setAlvo(null)
            setTermo('')
            setResultados([])
            if (aba === 'dei') carregar()
            else setAba('dei')
          }}
        />
      )}
    </>
  )
}

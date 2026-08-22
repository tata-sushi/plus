import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  FileSignature,
  Check,
  Clock,
  Loader2,
  Users,
  ChevronRight,
  X,
  Search,
  ShieldCheck,
  Printer,
} from 'lucide-react'
import { Header } from '../components/Header.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { supabase } from '../lib/supabase.js'
import { tapHaptic } from '../lib/haptics.js'

const TIPOS = [
  { v: 'rh', label: 'RH — termo / advertência' },
  { v: 'politica', label: 'Política — ciência' },
  { v: 'recibo', label: 'Recibo / acordo' },
  { v: 'pdf', label: 'PDF — subir arquivo' },
]
const TIPO_ROTULO = { rh: 'RH', politica: 'Política', recibo: 'Recibo', pdf: 'Documento' }

function fmtData(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escaparHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
// texto simples do RH → parágrafos <p> (mantém {{placeholders}})
function textoParaHtml(txt) {
  return String(txt || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escaparHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function AssinaturasAdmin() {
  const navigate = useNavigate()
  const [podeGerir, setPodeGerir] = useState(null)
  const [view, setView] = useState('lista') // lista | detalhe | novo
  const [painel, setPainel] = useState(null)
  const [docSel, setDocSel] = useState(null) // detalhe (docs_painel_doc)
  const [carregando, setCarregando] = useState(false)
  const [provas, setProvas] = useState(null) // { nome, rubricaUrl, selfieUrl, ip, assinado_em }
  const [pickerAberto, setPickerAberto] = useState(false)

  useEffect(() => {
    supabase.rpc('docs_pode_gerir').then(({ data }) => setPodeGerir(!!data))
  }, [])

  const carregarPainel = useCallback(async () => {
    const { data } = await supabase.rpc('docs_painel')
    setPainel(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    if (podeGerir) carregarPainel()
  }, [podeGerir, carregarPainel])

  async function abrirDoc(id) {
    setCarregando(true)
    const { data } = await supabase.rpc('docs_painel_doc', { p_documento_id: id })
    setCarregando(false)
    if (data?.ok) {
      setDocSel(data)
      setView('detalhe')
    }
  }

  async function verProvas(a) {
    const url = async (path) =>
      path
        ? (await supabase.storage.from('assinaturas').createSignedUrl(path, 3600)).data?.signedUrl
        : null
    setProvas({ nome: a.nome, ip: a.ip, assinado_em: a.assinado_em, atribuicaoId: a.atribuicao_id, carregando: true })
    const [rubricaUrl, selfieUrl] = await Promise.all([url(a.rubrica_path), url(a.selfie_path)])
    setProvas({ nome: a.nome, ip: a.ip, assinado_em: a.assinado_em, atribuicaoId: a.atribuicao_id, rubricaUrl, selfieUrl })
  }

  if (podeGerir === null)
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-bg text-muted-2">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  if (!podeGerir) return <Navigate to="/" replace />

  // ── NOVO documento ─────────────────────────────────────────────────────────
  if (view === 'novo')
    return (
      <NovoDocumento
        onVoltar={() => setView('lista')}
        onCriado={async (id) => {
          await carregarPainel()
          await abrirDoc(id)
        }}
      />
    )

  // ── DETALHE ────────────────────────────────────────────────────────────────
  if (view === 'detalhe' && docSel) {
    const d = docSel.documento
    const ass = docSel.assinaturas || []
    return (
      <>
        <Header />
        <div className="px-5 pt-2">
          <button
            onClick={() => {
              setView('lista')
              carregarPainel()
            }}
            className="hstack gap-1 text-sm font-medium text-muted tap"
          >
            <ArrowLeft size={16} /> Documentos
          </button>
        </div>

        <div className="mx-auto w-full max-w-[620px] px-5 pb-28 pt-3">
          <span className="rounded-pill bg-fill px-2 py-0.5 text-[11px] font-semibold text-muted">
            {TIPO_ROTULO[d.tipo] || 'Documento'}
          </span>
          <h1 className="mt-2 font-display text-xl font-bold leading-tight">{d.titulo}</h1>
          <p className="mt-1 text-xs text-muted">Criado em {fmtData(d.criado_em)}</p>

          <details className="mt-3 rounded-card border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-muted">
              Ver conteúdo do modelo
            </summary>
            <div
              className="conteudo mt-3 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: d.corpo_html || '' }}
            />
            {d.declaracao && (
              <p className="mt-3 border-t border-line pt-3 text-xs italic text-muted">
                Aceite: “{d.declaracao}”
              </p>
            )}
          </details>

          <div className="mt-5 hstack justify-between">
            <span className="text-sm font-bold">
              Assinantes ({ass.filter((a) => a.status === 'assinado').length}/{ass.length})
            </span>
            <button
              onClick={() => setPickerAberto(true)}
              className="hstack gap-1 text-xs font-semibold text-accent tap"
            >
              <Plus size={14} /> Atribuir
            </button>
          </div>

          <div className="mt-2 card overflow-hidden">
            {ass.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Ninguém atribuído ainda. Toque em “Atribuir”.
              </p>
            ) : (
              ass.map((a, i) => {
                const assinado = a.status === 'assinado'
                return (
                  <div
                    key={a.matricula}
                    className={`hstack gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                        assinado ? 'bg-accent-soft text-accent' : 'bg-fill text-muted-2'
                      }`}
                    >
                      {assinado ? <Check size={16} strokeWidth={3} /> : <Clock size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.nome || a.matricula}</div>
                      <div className="truncate text-[11px] text-muted">
                        {assinado ? `Assinado em ${fmtData(a.assinado_em)}` : 'Pendente'}
                      </div>
                    </div>
                    {assinado && (a.rubrica_path || a.selfie_path) && (
                      <button
                        onClick={() => verProvas(a)}
                        className="shrink-0 rounded-pill border border-line px-2.5 py-1 text-[11px] font-semibold text-accent tap"
                      >
                        Ver provas
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {pickerAberto && (
          <PickerColaboradores
            onFechar={() => setPickerAberto(false)}
            onAtribuir={async (mats) => {
              await supabase.rpc('docs_atribuir', {
                p_documento_id: d.id,
                p_matriculas: mats,
                p_prazo: null,
              })
              setPickerAberto(false)
              abrirDoc(d.id)
            }}
          />
        )}
        {provas && (
          <ProvasModal
            provas={provas}
            onFechar={() => setProvas(null)}
            onImprimir={(id) => navigate(`/comprovante/${id}`)}
          />
        )}
      </>
    )
  }

  // ── LISTA ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      <div className="px-5 pt-3">
        <div className="hstack justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">Assinaturas — RH</h1>
            <p className="mt-0.5 text-sm text-muted">Crie, atribua e acompanhe as assinaturas.</p>
          </div>
          <button onClick={() => setView('novo')} className="btn-primary shrink-0 !py-2.5 text-sm">
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      <div className="mt-4 px-5 pb-24">
        {painel === null ? (
          <div className="hstack justify-center py-20 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : painel.length === 0 ? (
          <div className="grid place-items-center px-8 py-16 text-center text-muted">
            <FileSignature size={30} className="text-muted-2" />
            <p className="mt-3 text-sm">Nenhum documento criado ainda.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {painel.map((d, i) => (
              <button
                key={d.id}
                onClick={() => abrirDoc(d.id)}
                className={`hstack w-full gap-3 px-4 py-3.5 text-left tap ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <FileSignature size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{d.titulo}</div>
                  <div className="mt-0.5 hstack gap-1.5 text-[11px] text-muted">
                    <span className="rounded-pill bg-fill px-1.5 py-px font-semibold">
                      {TIPO_ROTULO[d.tipo] || 'Documento'}
                    </span>
                    <span className="hstack gap-1">
                      <Users size={11} /> {d.assinados}/{d.atribuidos} assinados
                    </span>
                  </div>
                </div>
                {carregando ? (
                  <Loader2 size={16} className="animate-spin text-muted-2" />
                ) : (
                  <ChevronRight size={16} className="shrink-0 text-carbon" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ── Formulário de novo documento ─────────────────────────────────────────────
function NovoDocumento({ onVoltar, onCriado }) {
  const [tipo, setTipo] = useState('rh')
  const [titulo, setTitulo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [declaracao, setDeclaracao] = useState('Declaro que li e concordo com o documento acima.')
  const [rubrica, setRubrica] = useState(true)
  const [selfie, setSelfie] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // política = ciência (1 toque): sem rubrica/selfie por padrão
  function trocarTipo(v) {
    setTipo(v)
    if (v === 'politica') {
      setRubrica(false)
      setSelfie(false)
    } else {
      setRubrica(true)
      setSelfie(true)
    }
  }

  async function criar() {
    if (salvando) return
    if (!titulo.trim()) {
      setErro('Preencha o título.')
      return
    }
    if (tipo === 'pdf' ? !pdfFile : !corpo.trim()) {
      setErro(tipo === 'pdf' ? 'Selecione o arquivo PDF.' : 'Preencha o conteúdo.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      let arquivoPath = null
      if (tipo === 'pdf') {
        arquivoPath = `docs/${crypto.randomUUID()}.pdf`
        const { error } = await supabase.storage
          .from('assinaturas')
          .upload(arquivoPath, pdfFile, { contentType: 'application/pdf' })
        if (error) throw error
      }
      const { data } = await supabase.rpc('docs_criar', {
        p_tipo: tipo,
        p_titulo: titulo.trim(),
        p_corpo_html: tipo === 'pdf' ? null : textoParaHtml(corpo),
        p_declaracao: declaracao.trim() || null,
        p_exige_rubrica: rubrica,
        p_exige_selfie: selfie,
        p_nivel: 'simples',
        p_arquivo_path: arquivoPath,
      })
      if (!data?.ok) throw new Error('falhou')
      tapHaptic()
      onCriado(data.id)
    } catch {
      setErro('Não foi possível criar agora. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Header />
      <div className="px-5 pt-2">
        <button onClick={onVoltar} className="hstack gap-1 text-sm font-medium text-muted tap">
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>
      <div className="mx-auto w-full max-w-[620px] px-5 pb-28 pt-3">
        <h1 className="font-display text-xl font-bold">Novo documento</h1>

        <label className="mt-4 block text-xs font-semibold text-muted">Tipo</label>
        <select
          value={tipo}
          onChange={(e) => trocarTipo(e.target.value)}
          className="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        >
          {TIPOS.map((t) => (
            <option key={t.v} value={t.v}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-semibold text-muted">Título</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Termo de responsabilidade de uniforme"
          className="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        />

        {tipo === 'pdf' ? (
          <>
            <label className="mt-4 block text-xs font-semibold text-muted">Arquivo PDF</label>
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-card border border-dashed border-line bg-surface px-3 py-3 text-sm tap">
              <Plus size={16} className="text-accent" />
              <span className="min-w-0 flex-1 truncate">
                {pdfFile ? pdfFile.name : 'Escolher PDF…'}
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-[11px] text-muted-2">
              O colaborador lê este PDF no app e a assinatura vira um PDF único carimbado.
            </p>
          </>
        ) : (
          <>
            <label className="mt-4 block text-xs font-semibold text-muted">Conteúdo</label>
            <textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={7}
              placeholder="Escreva o documento. Deixe uma linha em branco para separar parágrafos."
              className="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent"
            />
            <p className="mt-1 text-[11px] text-muted-2">
              Campos automáticos: <code>{'{{nome}}'}</code> <code>{'{{matricula}}'}</code>{' '}
              <code>{'{{cargo}}'}</code> <code>{'{{unidade}}'}</code> <code>{'{{data}}'}</code> — são
              preenchidos com os dados de quem assina.
            </p>
          </>
        )}

        <label className="mt-4 block text-xs font-semibold text-muted">Declaração de aceite</label>
        <input
          value={declaracao}
          onChange={(e) => setDeclaracao(e.target.value)}
          className="mt-1 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        />

        <div className="mt-4 space-y-2">
          <label className="hstack gap-2.5 text-sm">
            <input type="checkbox" checked={rubrica} onChange={(e) => setRubrica(e.target.checked)} className="h-4 w-4 accent-accent" />
            Exigir rubrica (assinatura desenhada)
          </label>
          <label className="hstack gap-2.5 text-sm">
            <input type="checkbox" checked={selfie} onChange={(e) => setSelfie(e.target.checked)} className="h-4 w-4 accent-accent" />
            Exigir selfie de confirmação
          </label>
          {!rubrica && !selfie && (
            <p className="text-[11px] text-muted-2">
              Sem rubrica e sem selfie = ciência com 1 toque (“Li e concordo”).
            </p>
          )}
        </div>

        <div className="mt-6 space-y-2">
          {erro && <p className="text-center text-xs font-medium text-danger">{erro}</p>}
          <button
            onClick={criar}
            disabled={salvando}
            className={`btn-primary w-full !py-3.5 text-sm ${salvando ? 'opacity-60' : ''}`}
          >
            {salvando ? <Loader2 size={18} className="animate-spin" /> : 'Criar e atribuir'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Picker de colaboradores (busca + multi-seleção) ──────────────────────────
function PickerColaboradores({ onFechar, onAtribuir }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [sel, setSel] = useState({}) // matricula -> nome
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const t = termo.trim()
    if (t.length < 2) {
      setResultados([])
      return
    }
    setCarregando(true)
    const timer = setTimeout(() => {
      let ativo = true
      supabase.rpc('buscar_colaboradores', { p_termo: t }).then(({ data }) => {
        if (!ativo) return
        setResultados(data || [])
        setCarregando(false)
      })
      return () => {
        ativo = false
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [termo])

  const marcados = Object.keys(sel)

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="safe-top hstack justify-between border-b border-line px-5 py-3">
        <span className="font-display text-lg font-bold">Atribuir a…</span>
        <button onClick={onFechar} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-carbon tap">
          <X size={18} />
        </button>
      </div>

      <div className="px-5 pt-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" />
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar pelo nome…"
            className="w-full rounded-full border border-line bg-surface py-3 pl-10 pr-4 text-sm outline-none focus:border-accent"
          />
        </div>
        {marcados.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {marcados.map((m) => (
              <button
                key={m}
                onClick={() => setSel((s) => { const n = { ...s }; delete n[m]; return n })}
                className="hstack gap-1 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent tap"
              >
                {sel[m]} <X size={11} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-5">
        {carregando ? (
          <div className="hstack justify-center py-10 text-muted-2">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            {resultados.map((c, i) => {
              const on = !!sel[c.matricula]
              return (
                <button
                  key={c.matricula}
                  onClick={() =>
                    setSel((s) => {
                      const n = { ...s }
                      if (on) delete n[c.matricula]
                      else n[c.matricula] = c.nome
                      return n
                    })
                  }
                  className={`hstack w-full gap-3 px-4 py-3 text-left tap ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <Avatar name={c.nome} src={c.avatar_url} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.nome}</div>
                    <div className="truncate text-[11px] text-muted">
                      {c.departamento}
                      {c.departamento && c.unidade ? ' · ' : ''}
                      {c.unidade}
                    </div>
                  </div>
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      on ? 'border-accent bg-accent text-black' : 'border-line'
                    }`}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="safe-bottom border-t border-line px-5 py-3">
        <button
          onClick={async () => {
            if (!marcados.length || enviando) return
            setEnviando(true)
            await onAtribuir(marcados)
            setEnviando(false)
          }}
          disabled={!marcados.length || enviando}
          className={`btn-primary w-full !py-3.5 text-sm ${!marcados.length || enviando ? 'opacity-60' : ''}`}
        >
          {enviando ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            `Atribuir${marcados.length ? ` (${marcados.length})` : ''}`
          )}
        </button>
      </div>
    </div>,
    document.body,
  )
}

// ── Modal de provas (selfie + rubrica + auditoria) ───────────────────────────
function ProvasModal({ provas, onFechar, onImprimir }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      <button aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-bg px-5 pb-8 pt-4 shadow-xl sm:max-w-[460px] sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line sm:hidden" />
        <button onClick={onFechar} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted tap">
          <X size={16} />
        </button>
        <div className="font-display text-lg font-bold">Provas da assinatura</div>
        <p className="text-sm text-muted">{provas.nome}</p>

        {provas.carregando ? (
          <div className="hstack justify-center py-12 text-muted-2">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold text-muted">Selfie</p>
                {provas.selfieUrl ? (
                  <img src={provas.selfieUrl} alt="Selfie" className="aspect-square w-full rounded-xl border border-line object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center rounded-xl border border-line text-[11px] text-muted-2">—</div>
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-muted">Rubrica</p>
                {provas.rubricaUrl ? (
                  <img src={provas.rubricaUrl} alt="Rubrica" className="aspect-square w-full rounded-xl border border-line bg-white object-contain" />
                ) : (
                  <div className="grid aspect-square place-items-center rounded-xl border border-line text-[11px] text-muted-2">—</div>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-card border border-line bg-surface px-4 py-3 text-xs text-muted">
              <div className="hstack items-start gap-2">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent" />
                <div className="space-y-0.5">
                  <div>
                    Assinado em <b className="text-text">{fmtData(provas.assinado_em)}</b>
                  </div>
                  {provas.ip && (
                    <div>
                      IP: <b className="text-text">{provas.ip}</b>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => onImprimir?.(provas.atribuicaoId)}
              className="btn-primary mt-4 w-full !py-3 text-sm"
            >
              <Printer size={16} /> Imprimir comprovante
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default AssinaturasAdmin

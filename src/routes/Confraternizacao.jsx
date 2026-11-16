import { useEffect, useState } from 'react'
import { PartyPopper, Calendar, Clock, MapPin, UtensilsCrossed, Wine, Gift, Ticket, Check, QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { ConfraCard } from '../components/ConfraCard.jsx'
import { supabase } from '../lib/supabase.js'

// Página da Confraternização de fim de ano (em teste, acessível pelo tile das
// Sugestões liberado só pra matrícula 7). Textos explicativos são PROVISÓRIOS —
// trocar pelos reais (horário, cardápio, consumo, cesta). A presença (Sim/Não)
// reaproveita o ConfraCard; os sorteios usam confra_sorteio_* por categoria.

function Info({ Icon, label, children }) {
  return (
    <div className="hstack items-start gap-3 py-2">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">{label}</div>
        <div className="text-sm text-text">{children}</div>
      </div>
    </div>
  )
}

function Provisorio() {
  return <div className="mt-3 text-[11px] italic text-muted-2">Texto provisório — me manda o conteúdo real.</div>
}

// Pílulas automáticas (não-clicáveis): a base calcula em quais categorias a
// pessoa concorre (confra_minhas_categorias). Mostra só as elegíveis; as que
// ainda não têm critério definido aparecem como "em definição".
function SorteioPills() {
  const [cats, setCats] = useState(null)

  useEffect(() => {
    let ativo = true
    supabase.rpc('confra_minhas_categorias').then(({ data }) => {
      if (ativo) setCats(Array.isArray(data) ? data : [])
    })
    return () => {
      ativo = false
    }
  }, [])

  if (!cats) return <div className="text-xs text-muted">Carregando…</div>

  const minhas = cats.filter((c) => c.elegivel)

  return (
    <>
      {/* texto: explicação de todas as categorias */}
      <div className="flex flex-col gap-1.5">
        {cats.map((c) => (
          <div key={c.slug} className="text-[12px] leading-snug text-muted">
            <span className="font-semibold text-text">{c.nome}</span>
            {c.descricao ? ` — ${c.descricao}` : ''}
            {c.pendente ? <span className="text-muted-2"> (em definição)</span> : null}
          </div>
        ))}
      </div>

      {/* pílulas: as categorias em que a pessoa concorre */}
      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Você concorre em</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {minhas.length > 0 ? (
          minhas.map((c) => (
            <span
              key={c.slug}
              className="hstack gap-1.5 rounded-pill border border-accent bg-accent-soft px-3 py-2 text-[13px] font-semibold text-accent"
            >
              <Check size={14} />
              {c.nome}
            </span>
          ))
        ) : (
          <span className="text-[13px] text-muted">Nenhuma categoria por enquanto.</span>
        )}
      </div>
      <div className="mt-2 text-[11px] text-muted-2">Definido automaticamente pelo seu perfil (tempo de casa, assiduidade…).</div>
    </>
  )
}

export function Confraternizacao() {
  return (
    <>
      <Header />
      <CabecalhoPagina titulo="Confraternização" descricao="Nossa festa de fim de ano 🎉" />

      {/* Sobre a festa */}
      <Section className="mt-4" title="Sobre a festa">
        <Card className="reveal p-4">
          <Info Icon={Calendar} label="Data">Sábado, 26 de dezembro</Info>
          <Info Icon={Clock} label="Horário">A partir das 12h</Info>
          <Info Icon={MapPin} label="Local">Tatu Bola — Rua Clodomiro Amazonas, 260, Itaim Bibi</Info>
          <Info Icon={UtensilsCrossed} label="Cardápio">A definir</Info>
          <Info Icon={Wine} label="Consumo">A definir</Info>
          <Provisorio />
        </Card>
      </Section>

      {/* Presença (Sim/Não) — reaproveita o card */}
      <ConfraCard />

      {/* Sorteios */}
      <Section className="mt-5" title="Sorteios">
        <Card className="reveal p-4">
          <div className="hstack gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Ticket size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold">Vamos ter sorteios! 🎁</div>
              <div className="mt-0.5 text-[12px] text-muted">
                As categorias em que você concorre, definidas automaticamente pelo seu perfil.
              </div>
            </div>
          </div>
          <div className="mt-4">
            <SorteioPills />
          </div>
          <Provisorio />
        </Card>
      </Section>

      {/* Cesta de Natal */}
      <Section className="mt-5 mb-6" title="Cesta de Natal">
        <Card className="reveal p-4">
          <div className="hstack gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Gift size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold">Cesta de Natal 🎄</div>
              <div className="mt-0.5 text-[12px] text-muted">
                Este ano a cesta está ainda melhor que as anteriores!
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-text">
            <div className="hstack items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-accent" />
              <span>A retirada acontece no [local/data a definir].</span>
            </div>
          </div>
          <Link to="/check-in" className="btn-primary mt-3 w-full">
            <QrCode size={16} /> Abrir o scanner
          </Link>
          <Provisorio />
        </Card>
      </Section>
    </>
  )
}

export default Confraternizacao

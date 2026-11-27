import { useEffect, useState } from 'react'
import { PartyPopper, Calendar, Clock, MapPin, UtensilsCrossed, Wine, Gift, Ticket, Check, QrCode, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header.jsx'
import { CabecalhoPagina } from '../components/CabecalhoPagina.jsx'
import { Section } from '../components/Section.jsx'
import { Card } from '../components/Card.jsx'
import { ConfraCard } from '../components/ConfraCard.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { ApuracaoSorteio } from '../components/ApuracaoSorteio.jsx'

// Ganhadores do sorteio — em teste, só aparece pra matrícula 7. Lê a lista
// gravada (confra_sorteio_ganhadores); some se ainda não há ninguém sorteado.
function GanhadoresSorteio() {
  const [gs, setGs] = useState(null)
  useEffect(() => {
    let ativo = true
    supabase.rpc('confra_sorteio_ganhadores').then(({ data }) => {
      if (ativo) setGs(Array.isArray(data) ? data : [])
    })
    return () => {
      ativo = false
    }
  }, [])
  if (!gs || gs.length === 0) return null
  return (
    <Section className="mt-5" title="Ganhadores">
      <Card className="reveal p-4">
        <ul className="flex flex-col gap-3">
          {gs.map((g, i) => (
            <li key={i} className="hstack gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-card bg-white">
                {g.foto && <img src={g.foto} alt="" className="h-full w-full object-contain" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold leading-tight">{g.nome}</div>
                <div className="text-[12px] text-muted">
                  {g.premio} · {g.categoria}
                </div>
              </div>
              <Trophy size={16} className="shrink-0 text-accent" />
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  )
}

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

// Conteúdo dos sorteios: texto fixo + categorias (descrições vêm da base) e as
// pílulas das categorias em que a pessoa concorre (confra_minhas_categorias).
function SorteioConteudo() {
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

  const minhas = (cats || []).filter((c) => c.elegivel)

  return (
    <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-muted">
      <p>
        Como não poderia faltar, teremos nossos tradicionais sorteios de confraternização! Um momento de alegria,
        expectativa e muita torcida, que torna nossa celebração ainda mais especial.
      </p>
      <div>
        <p className="font-semibold text-text">Conheça as categorias deste ano:</p>
        {cats === null ? (
          <p className="mt-1 text-xs text-muted">Carregando…</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {cats.map((c) => (
              <li key={c.slug}>
                <span className="font-semibold text-text">{c.nome}:</span> {c.descricao}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="font-semibold text-text">Veja quais categorias está participando</p>
        {cats !== null && (
          <div className="mt-3 flex flex-wrap gap-2">
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
        )}
      </div>
    </div>
  )
}

// Prêmios do sorteio — fotos reais em public/brindes/. Nomes conforme a
// planilha oficial do RH. As fotos cobrem ~23 dos 36 itens da lista; itens
// sem foto não entram no carrossel (vitrine/prévia). Fotos duplicadas
// (b07 fone, b24 kit bar) foram retiradas. Ainda em teste (mat 7).
const BRINDES = [
  { foto: '/brindes/b04.jpg', nome: 'Smart TV 50" Philips' },
  { foto: '/brindes/b25.jpg', nome: 'Projetor Smart HY320' },
  { foto: '/brindes/b05.jpg', nome: 'Alexa (Echo Dot)' },
  { foto: '/brindes/b08.jpg', nome: 'Alto-falante JBL' },
  { foto: '/brindes/b13.jpg', nome: 'Fone de ouvido Philco' },
  { foto: '/brindes/b23.jpg', nome: 'Philips OneBlade (barbeador)' },
  { foto: '/brindes/b16.jpg', nome: 'Kit relógio, colar e brinco Mondaine' },
  { foto: '/brindes/b22.jpg', nome: 'Relógio Casio' },
  { foto: '/brindes/b01.jpg', nome: 'Prancha Taiff' },
  { foto: '/brindes/b06.jpg', nome: 'Escova rotativa Britânia' },
  { foto: '/brindes/b20.jpg', nome: 'Forno elétrico Philco' },
  { foto: '/brindes/b19.jpg', nome: 'Panela elétrica de arroz Oster' },
  { foto: '/brindes/b21.jpg', nome: 'Liquidificador Oster' },
  { foto: '/brindes/b11.jpg', nome: 'Mixer Mix Turbo' },
  { foto: '/brindes/b18.jpg', nome: 'Espremedor de laranja Electrolux' },
  { foto: '/brindes/b09.jpg', nome: 'Churrasqueira elétrica Mondial' },
  { foto: '/brindes/b02.jpg', nome: 'Churrasqueira a carvão' },
  { foto: '/brindes/b17.jpg', nome: 'Parafusadeira' },
  { foto: '/brindes/b14.jpg', nome: 'Kit jogo de facas inox' },
  { foto: '/brindes/b15.jpg', nome: 'Kit caipirinha / coqueteleira' },
  { foto: '/brindes/b10.jpg', nome: 'Garrafa térmica + kit 3 xícaras' },
  { foto: '/brindes/b03.jpg', nome: 'Kit tábua de frios' },
  { foto: '/brindes/b12.jpg', nome: 'Panettone Ofner' },
]

// Carrossel de prêmios — puxa do banco (confra_sorteio_vitrine) a categoria e o
// ganhador de cada prêmio. Fallback pra lista fixa (BRINDES) enquanto carrega.
// O ganhador só aparece quando `mostrarGanhador` (em teste, só mat 7).
function CarrosselBrindes({ mostrarGanhador }) {
  const [itens, setItens] = useState(null)
  useEffect(() => {
    let ativo = true
    supabase.rpc('confra_sorteio_vitrine').then(({ data }) => {
      if (ativo) setItens(Array.isArray(data) ? data : [])
    })
    return () => {
      ativo = false
    }
  }, [])
  const lista = itens && itens.length ? itens : BRINDES
  return (
    <div className="mt-4">
      <p className="mb-2 text-[13px] font-semibold text-text">Veja algumas das nossas premiações 🎁</p>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {lista.map((b, i) => (
          <div key={b.foto || i} className="w-[46%] shrink-0 snap-start">
            <div className="aspect-square w-full overflow-hidden rounded-card bg-white">
              <img src={b.foto} alt={b.nome} loading="lazy" className="h-full w-full object-contain" />
            </div>
            <div className="mt-2 text-[13px] font-bold leading-tight text-text">{b.nome}</div>
            {b.categoria && <div className="mt-0.5 text-[11px] font-semibold text-accent">{b.categoria}</div>}
            {mostrarGanhador && b.ganhador && (
              <div className="mt-0.5 hstack gap-1 text-[11px] text-muted">
                <Trophy size={11} className="shrink-0 text-accent" />
                <span className="truncate">{b.ganhador}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Confraternizacao() {
  const { usuario } = useAuth()
  const mat7 = String(usuario?.matricula) === '7'
  return (
    <>
      <Header />
      <CabecalhoPagina titulo="Confraternização" descricao="Veja o que preparamos para você nesse final de ano" />

      {/* Sobre a festa */}
      <Section className="mt-4" title="Almoço de confraternização">
        <Card className="reveal p-4">
          <Info Icon={Calendar} label="Data">Sábado, 26 de dezembro</Info>
          <Info Icon={Clock} label="Horário">A partir das 12h</Info>
          <Info Icon={MapPin} label="Local">Tatu Bola: Rua Clodomiro Amazonas, 260</Info>
          <Info Icon={UtensilsCrossed} label="Cardápio">Buffet à vontade</Info>
          <Info Icon={Wine} label="Consumação">3 bebidas (podendo ser 1 chopp Brahma + 2 não alcoólicas: água ou refrigerante)</Info>
        </Card>
      </Section>

      {/* Sorteios */}
      <Section className="mt-5" title="Sorteios">
        <Card className="reveal p-4">
          <div className="hstack gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Ticket size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold">Sorteio TATÁ</div>
            </div>
          </div>
          <div className="mt-3">
            <SorteioConteudo />
          </div>
          <CarrosselBrindes mostrarGanhador={mat7} />
        </Card>
      </Section>

      {/* Apuração do sorteio (RH) — em teste, só mat 7 */}
      {mat7 && <ApuracaoSorteio />}

      {/* Ganhadores do sorteio — em teste, só mat 7 */}
      {mat7 && <GanhadoresSorteio />}

      {/* Confirmação de presença */}
      <Section className="mt-5" title="Confirmação de presença">
        <ConfraCard />
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
                Este ano a cesta está ainda melhor!
              </div>
            </div>
          </div>
          <img src="/cesta-natal.webp" alt="Cesta de Natal da Tatá" className="mt-3 w-full rounded-card" />
          <div className="mt-3 text-sm text-text">
            <p className="font-semibold">Confira as regras de retirada das cestas:</p>
            <ul className="mt-2 flex flex-col gap-2 text-[13px] text-muted">
              <li className="hstack items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-accent" />
                <span>
                  <span className="font-semibold text-text">Itaim e TATÁ House:</span> retirada no escritório
                  administrativo a partir de 01/12/2026.
                </span>
              </li>
              <li className="hstack items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-accent" />
                <span>
                  <span className="font-semibold text-text">Pinheiros e Poke:</span> retirada na unidade a partir de
                  01/12/2026.
                </span>
              </li>
            </ul>
            <p className="mt-3 text-[13px] text-muted">
              A retirada deve ser feita individualmente e com validação. Não é permitida a retirada para outra pessoa.
            </p>
          </div>
          <Link to="/check-in" className="btn-primary mt-3 w-full">
            <QrCode size={16} /> Retirar
          </Link>
        </Card>
      </Section>
    </>
  )
}

export default Confraternizacao

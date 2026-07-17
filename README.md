# Tatá Plus

Portal do colaborador Tatá Sushi — PWA instalável servida em `plus.tatasushi.tech`.

## Stack

- **Vite + React 18** — SPA rápida, sem SSR
- **Tailwind CSS** — design system dark + verde neon (tema claro/escuro por tokens CSS)
- **React Router** — 5 tabs principais + rotas secundárias
- **vite-plugin-pwa** — manifest, service worker, cache offline
- **lucide-react** — ícones
- **Supabase** (Postgres, schema `tata_plus`) — auth, dados e RPCs `SECURITY DEFINER`

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de produção em dist/
npm run preview    # preview do build
```

## Ícones do PWA

Os ícones usados pelo app (favicon, apple-touch-icon, manifest do PWA) ficam em `public/icons/` como PNGs otimizados (`favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`), recortados do logo oficial da Tatá Sushi.

Os arquivos-fonte (logo original enviado pela marca, versão mestre 1024px e o lockup completo com o wordmark) ficam fora da pasta `public/` — em `design/brand-source/` — para não serem publicados nem entrarem no precache do service worker. Se precisar regenerar os ícones (outro recorte, outra cor), edite a partir desses arquivos-fonte.

## Deploy

Push em `main` dispara `.github/workflows/deploy.yml`, que buildeia e publica no GitHub Pages. O `CNAME` mantém `plus.tatasushi.tech`.

## Estrutura

```
src/
├── App.jsx                  # rotas
├── main.jsx                 # entry + registro do SW (BrowserRouter, sem basename)
├── index.css                # Tailwind + tokens + estilos do .conteudo (HTML dos desafios)
├── components/              # design system + desafios
│   ├── AppShell.jsx         # layout + bottom nav + trava de orientação por rota
│   ├── BottomNav.jsx        # tabs: Início · Ranking · Feed · Governança|Ouvidoria · Mais
│   ├── Header.jsx / Card.jsx / ProgressBar.jsx / ProgressRing.jsx / PromoCard.jsx
│   ├── Submodulo.jsx        # bancadas: presença (mês), série sequencial, reconhecimento,
│   │                        #   Metas & Prêmio (série de conteúdo mensal) e lista simples
│   ├── IntroDesafio.jsx     # capa do desafio (título + frase)
│   ├── ProvaDesafio.jsx     # quiz (correção no servidor)
│   ├── EnvioDesafio.jsx     # upload moderado
│   ├── CodigoEtica.jsx      # leitura em blocos + prova/aceite/assinatura
│   ├── LeituraProva.jsx / Avaliacao.jsx
│   ├── VideosYouTube.jsx / VideoPlayer.jsx / PdfViewer.jsx
│   └── AtalhosGovernanca.jsx
├── routes/
│   ├── Home.jsx             # Início (grid Sugestões + Atalhos gov)
│   ├── Comunicados.jsx / Treinamentos.jsx / Procedimentos.jsx / Jornada.jsx
│   ├── Recompensas.jsx      # catálogo + painel admin
│   ├── Mais.jsx
│   ├── Governanca.jsx       # iframe do portal Líderes
│   ├── Organograma.jsx      # iframe tela cheia (landscape) + botão flutuante
│   └── RhFacil / AssistenteIa / Manutencao (placeholders)
└── lib/
    ├── cn.js / haptics.js / icons.js (iconMap das trilhas)
    ├── supabase.js          # client
    ├── AuthContext.jsx      # sessão + perfil do usuário
    └── mockData.js          # dados ainda mockados (cardápio, catálogo gov, etc.)
```

## Documentação

O contexto detalhado do projeto — backend Supabase, modelo de pontuação, tipos de desafio,
séries de envio sequenciais, governança embutida, decisões e pendências — fica em
**`docs/CONTEXTO.md`**. É o documento de handoff, atualizado a cada bloco de trabalho (a §13
traz o histórico da sessão mais recente).

## Otimização e arquitetura (prioridade)

**Princípio do projeto: otimização, eficiência e o sistema o mais _clean_ possível.**
Toda mudança deve puxar nessa direção — e "clean" aqui **não** é "menos tabelas a qualquer
custo", é **responsabilidade única + zero duplicação + zero órfão**. Espremer tudo numa
tabela só (ou em blocos de JSON gigantes) deixa mais lento e mais bagunçado, não mais limpo.

Regras práticas antes de criar/alterar schema:

- **Antes de criar tabela nova**, verificar se o dado cabe numa existente (coluna ou `jsonb`
  quando a lista é pequena e "propriedade da linha", ex.: público-alvo de uma publicação) ou
  se **repete um padrão** já existente — nesse caso, **unificar** em vez de duplicar.
- **Config/singleton** pequeno (chaves, textos-modelo) não vira uma tabela por assunto: agrupa
  numa tabela de configuração única quando fizer sentido.
- **Remover o legado assim que migrado** (nada de tabela morta encostada).
- **RPCs enxutos**; índice só onde há filtro real; nada de coluna/tabela "por precaução".

Otimizações:

- [x] Fundir `publicacao_atribuicoes` em `publicacoes.alvos` (`jsonb`) — feito; o alvo é
      propriedade da publicação (‑1 tabela).
- [x] Remover o legado `comunicados` / `comunicado_leituras` / `comunicados_feed` (migrados para
      `publicacoes`) — feito (‑3 objetos).
- [ ] **Unificar o padrão de "atribuição/alvo"** entre `treinamentos` e `publicacoes` (hoje
      `treinamento_atribuicoes` ainda é tabela; publicações já usam `jsonb`) — a duplicação real
      a atacar quando for mexer nos desafios.
- [ ] Avaliar unir configs de singleton (`push_config`, mensagens de aniversário) numa tabela de
      configuração única.

> As tabelas que **têm** de existir por natureza (relação N‑para‑N como leituras, ou 1‑por‑aparelho
> como `push_subscriptions`) permanecem separadas — é o modelo correto e mais rápido.

## Conteúdo das trilhas (estado)

Detalhe por sessão em `docs/CONTEXTO.md` (§13–§14). Resumo:

- **Prontas:** Integração, Código de Ética, Qualidade, **Gente & Gestão** (12 desafios),
  Especiais (100% de Presença, Aniversário, Indicação, Saúde), Tatá News, **Tatá Plus**.
- **Gorjeta & Prêmio:** intros (vídeos) + **Metas & Prêmio mensal** — bancada de "caixinhas"
  por mês (série de conteúdo com janela de data), **direcionada por unidade+departamento**
  (alvo composto). Ver §14.
- **Soft Skill:** 3 submódulos (Inteligência Emocional, Missão dos Desbravadores, DISC).
  **Inteligência Emocional** montado (12/16); faltam 4 desafios de **formulário/texto livre**.

## Próximos passos

Roadmap e pendências vivas em `docs/CONTEXTO.md` (§11, §14). Em aberto no momento:

- [ ] **Mecânica de formulário / texto livre** (desafio com campos de texto + escolha) — fecha os
      4 itens de IE pendentes e as reflexões
- [ ] **Análise de perfil** — tabela `perfil_colaborador` (genérica, jsonb) + questionários DISC e
      MBTI (Desbravadores) com cálculo do perfil no servidor
- [ ] Ponte de sessão da Governança (login único do app → portal Líderes) + servir o portal na mesma origem
- [ ] Fase 2 RH nas Notícias (absenteísmo, sanções, banco de horas, gorjeta)
- [ ] Painel admin: CRUD de treinamentos/atribuições/grupos
- [ ] Afinar cores do tema claro

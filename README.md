# Tatá Plus

Portal do colaborador Tatá Sushi — PWA instalável servida em `plus.tatasushi.tech`.

## Stack

- **Vite + React 18** — SPA rápida, sem SSR
- **Tailwind CSS** — design system dark + verde neon
- **React Router** — 5 tabs principais + rotas secundárias
- **vite-plugin-pwa** — manifest, service worker, cache offline
- **lucide-react** — ícones

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
├── main.jsx                 # entry + registro do SW
├── index.css                # Tailwind + tokens
├── components/              # design system compartilhado
│   ├── AppShell.jsx         # layout com bottom nav
│   ├── BottomNav.jsx        # tabs: Início · Ranking · Feed · Governança|Ouvidoria · Mais
│   ├── Header.jsx
│   ├── Card.jsx / StatCard.jsx / Section.jsx
│   ├── ProgressBar.jsx / ProgressRing.jsx
│   ├── IconTile.jsx / Badge.jsx / Avatar.jsx / Tabs.jsx
│   └── ComingSoon.jsx
├── routes/
│   ├── Home.jsx             # Início — completo
│   ├── Comunicados.jsx      # Feed
│   ├── Treinamentos.jsx     # Desafios + pontuação
│   ├── Procedimentos.jsx    # Links úteis por setor
│   ├── Jornada.jsx          # Perfil, rank, carteira
│   ├── Recompensas.jsx      # Catálogo de resgate
│   ├── Mais.jsx             # Menu de acessos extras
│   ├── RhFacil.jsx          # placeholder
│   ├── AssistenteIa.jsx     # placeholder
│   └── Manutencao.jsx       # placeholder
└── lib/
    ├── cn.js                # utilitário de className
    └── mockData.js          # dados mockados (feed, treinamentos, etc.)
```

## Documentação

O contexto detalhado do projeto — backend Supabase, modelo de pontuação, tipos de desafio,
séries de envio sequenciais, governança embutida, decisões e pendências — fica em
**`docs/CONTEXTO.md`**. É o documento de handoff, atualizado a cada bloco de trabalho (a §13
traz o histórico da sessão mais recente).

## Próximos passos

Roadmap e pendências vivas em `docs/CONTEXTO.md` (§11). Em aberto no momento:

- [ ] Ponte de sessão da Governança (login único do app → portal Líderes) + servir o portal na mesma origem
- [ ] Fase 2 RH nas Notícias (absenteísmo, sanções, banco de horas, gorjeta)
- [ ] Painel admin: CRUD de treinamentos/atribuições/grupos
- [ ] Afinar cores do tema claro

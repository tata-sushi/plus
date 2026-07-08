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

O logo mestre fica em `public/icons/logo.svg` e é usado no manifest como ícone único (SVG escala para qualquer tamanho). Para gerar PNGs otimizados (recomendado antes de lançar em produção pra estar 100% compatível com iOS home screen):

```bash
npm i -D @vite-pwa/assets-generator
npx pwa-assets-generator --preset minimal-2023 public/icons/logo.svg
```

E incluir as PNGs geradas no `manifest.icons` do `vite.config.js`.

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
│   ├── BottomNav.jsx        # tabs: Início/Comunicados/Treinamentos/Procedimentos/Mais
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

## Próximos passos

- [ ] Integrar Supabase (auth, feed, ledger de pontos, catálogo de recompensas)
- [ ] Ativar assinatura em `push` real e notificações
- [ ] Painel de manutenção com CRUD
- [ ] RH Fácil (fluxo de tickets)
- [ ] Assistente IA

# niyet — app

This is the application package. For the full story, philosophy, and design notes, see the [root README](../README.md).

## Stack

React 19 · Vite 8 · vite-plugin-pwa · Supabase (Auth + Postgres + RLS) · Cloudflare (Wrangler) · Web Audio · Vitest · ESLint.

## Develop

```bash
npm install
npm run dev          # Vite dev server
npm run lint         # ESLint
npm run test         # Vitest
npm run build        # production build
npm run deploy       # build + wrangler deploy
```

## Sync (optional)

The app is fully usable anonymously/offline — state lives in `localStorage`. To enable cloud sync:

```bash
cp .env.example .env
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

Schema lives in [`supabase/migrations/`](supabase/migrations/) — apply it in the Supabase SQL editor or via the CLI/MCP. On first sign-in, `src/lib/sync.js` merges local state into the cloud so nothing is lost.

## Layout

```
src/
├── components/   # Queue, TaskCard, Chains, ChainEdit, Bostan, CalligraphicCut, Auth…
├── hooks/        # useQueue, useChains, useDone, useStreak, useAuth, useLongPress
├── context/      # AuthContext, StreakContext
├── lib/          # supabase, sync, storage, audio, garden, pwa
├── data/         # defaultChains.js — the seven seeded rituals
├── styles/       # bostan, calligraphic-cut, checkmark
└── tokens.js     # design system source of truth
```

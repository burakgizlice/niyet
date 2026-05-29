---
title: "feat: Niyet project skeleton (Block 1)"
type: feat
status: active
created: 2026-05-29
depth: lightweight
origin: specs/01-project-skeleton/spec.json
---

# feat: Niyet Project Skeleton (Block 1)

## Problem Frame

Niyet needs a renderable foundation before any feature work. This block scaffolds a
Vite + React SPA, strips all Vite boilerplate, establishes the full theme design-token
palette as CSS custom properties, and renders a styled-but-inert shell: a deep emerald
gradient background, a centred ~480 px container, the `niyet` wordmark in gold, and a
Turkish tagline. It also lays down placeholder file stubs for every component, hook, and
lib module that later blocks will fill in, so subsequent blocks produce clean diffs against
files that already exist.

**Deliverable:** `npm run dev` renders the styled empty shell with no interactive behaviour,
no console errors, and `npm run build` exits 0.

The spec (`specs/01-project-skeleton/spec.json`) is the authoritative origin document and is
fully prescriptive — this plan organises its 14 steps into dependency-ordered units and
carries forward its acceptance criteria. Canonical CSS variable names and exact placeholder
values live in the spec's `implementation_steps` 1.5–1.7; the implementer should read those
verbatim rather than relying on this plan to restate every hex value.

---

## Scope Boundaries

### In scope
- Vite + React scaffold (`npm create vite@latest niyet -- --template react`) and `npm install`
- Initial git commit inside the scaffolded app
- Full theme palette as CSS custom properties on `:root` in `src/index.css`
- Emerald gradient background + base typography + centred `#root` flex layout
- Centred container with `niyet` gold wordmark and Turkish tagline (App.jsx, inline styles)
- Removal of all Vite boilerplate (Counter, App.css, logos, demo markup)
- Placeholder stubs: 5 components, 2 hooks, 3 lib modules
- `.env.example` + `.gitignore` `.env` guard

### Outside this product's identity (from spec scope.out)
- Any queue/task/chain logic, audio, localStorage, Supabase, routing, PWA, interactive elements
- Final brand hex values (placeholders accepted; **variable names are canonical and frozen**)
- Google Fonts network import — system font stack is the placeholder for `--font-family-display`
  (overrides spec Q2's "import Cinzel" recommendation; spec scope.out is authoritative)
- Animations / transitions (the transition *variables* are defined, but nothing uses them yet)

### Deferred to follow-up blocks
- Block 2 (Queue), Block 5 (audio tick), Block 14 (localStorage), Block 18 (sync), Block 15 (PWA),
  Block 16 (Supabase). Each later block fills a stub created here.

---

## Key Technical Decisions

- **Nested directory layout.** `npm create vite@latest niyet` creates the app at
  `niyet/niyet/` relative to the current repo root (`/home/burak/MrEngineer/niyet`). All file
  paths below are written relative to the **scaffolded app root** (`niyet/`), i.e. `niyet/src/App.jsx`
  on disk is `/home/burak/MrEngineer/niyet/niyet/src/App.jsx`. Git is initialised *inside* the
  scaffolded app per spec step 1.2.
- **Inline styles + CSS variables** (spec Q1, PRD §4.1). Global `:root` tokens + body/`#root`
  rules live in `index.css`; all component styling uses inline `style={{ ... }}` referencing
  `var(--name)`. No CSS Modules, no styled-components. Deliberate PRD constraint.
- **`return null` stubs** (spec Q4). Components export a named default returning `null`; hooks
  export named functions returning `{}`; lib modules export the canonical names with empty bodies.
- **No router** (spec Q5, PRD §6). View state will be `useState` in App.jsx in Block 2.
- **`index.css` import stays in `main.jsx`** (resolves spec open-question). Do not also import it
  in App.jsx — single import point avoids double-imports in later blocks.
- **Placeholder hex values committed** (spec Q3) with `/* TODO: finalise */` comments so every
  later block renders consistently.

---

## Output Structure

```
niyet/                         # scaffolded app root (== /home/burak/MrEngineer/niyet/niyet)
├── index.html                 # modified: title=Niyet, lang=tr
├── .env.example               # created
├── .gitignore                 # modified: ensure .env ignored
├── package.json               # from scaffold
├── vite.config.js             # from scaffold (unchanged)
└── src/
    ├── main.jsx               # from scaffold; imports index.css (unchanged)
    ├── App.jsx                # rewritten: wordmark shell only
    ├── index.css              # rewritten: :root tokens + body/#root
    ├── components/
    │   ├── Queue.jsx          # stub
    │   ├── AddSteps.jsx       # stub
    │   ├── Chains.jsx         # stub
    │   ├── ChainEdit.jsx      # stub
    │   └── CelebrationBurst.jsx  # stub
    ├── hooks/
    │   ├── useQueue.js        # stub
    │   └── useChains.js       # stub
    └── lib/
        ├── storage.js         # stub
        ├── sync.js            # stub
        └── audio.js           # stub (exports playTickSound)
```

Deleted by this block: `src/App.css`, `src/assets/react.svg`, `public/vite.svg`.

---

## Implementation Units

### U1. Scaffold Vite + React app and initialise git
**Goal:** A working default Vite React app at `niyet/` with an initial commit.
**Requirements:** Deliverable foundation; AC "npm run dev starts without errors".
**Dependencies:** none.
**Files:** creates the entire `niyet/` scaffold (package.json, vite.config.js, src/*, public/*, .gitignore).
**Approach:** From the repo root run `npm create vite@latest niyet -- --template react`, then
`cd niyet && npm install`. Confirm `npm run dev` serves the default page at http://localhost:5173.
Then `git init && git add . && git commit -m "chore: scaffold vite react app"` inside `niyet/`.
**Patterns to follow:** Vite default React (non-TS) template.
**Test scenarios:** Test expectation: none — pure scaffold/tooling, verified by U6.
**Verification:** `npm run dev` serves default Vite page; one commit exists in `niyet/`.

### U2. Configure index.html, .env.example, and .gitignore
**Goal:** App metadata is Turkish/Niyet-branded; env vars documented; secrets ignored.
**Requirements:** AC ".env.example exists with VITE_SUPABASE_URL= and VITE_SUPABASE_ANON_KEY=";
AC "html lang='tr' and title='Niyet'"; verification ".gitignore contains .env".
**Dependencies:** U1.
**Files:** `niyet/index.html` (modify), `niyet/.env.example` (create), `niyet/.gitignore` (modify).
**Approach:** `index.html`: `<title>Niyet</title>`, `<html lang="tr">`, optional
`<meta name="description" content="Niyetini belirle, bir adım at.">`; leave the module script line
untouched. `.env.example`: two lines `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` (no values,
committed). `.gitignore`: confirm/add a `.env` line. Do **not** create a real `.env`.
**Test scenarios:** Test expectation: none — config files, verified by U6 acceptance checks.
**Verification:** DevTools shows `lang='tr'` + `<title>Niyet</title>`; `.env.example` present with both
keys empty; `.gitignore` contains `.env`.

### U3. Define theme CSS variables and base styles in index.css
**Goal:** The full canonical design-token palette plus emerald gradient background, base typography,
and centred `#root` layout.
**Requirements:** AC "index.css :root contains all CSS variables in step 1.5"; AC "background is a
dark emerald gradient"; data_structure `CSSCustomProperties`.
**Dependencies:** U1.
**Files:** `niyet/src/index.css` (replace entire contents).
**Approach:** Replace `index.css` with a `:root {}` block defining **every** variable named in spec
step 1.5 verbatim (colors, font families/sizes/weights, line-heights, spacing, radii, transitions,
`--container-max-width: 480px`, `--shadow-card`) using the spec's placeholder values, each color marked
`/* TODO: finalise */`. Then add the universal `box-sizing`/reset rule, the `body` rule (linear-gradient
135deg start→end, `background-attachment: fixed`, `min-height: 100vh`, text color, font family/size/
line-height, font smoothing), and the `#root` flex-centring rule, exactly as spec steps 1.5–1.6 state.
**Patterns to follow:** spec `implementation_steps` 1.5 and 1.6 (canonical var names — do not rename).
**Test scenarios:** Test expectation: none — styling. Behaviour covered by U6 visual + DevTools checks.
**Verification:** DevTools `:root` computed styles show all `--color-*`/`--font-*`/`--spacing-*` etc.;
viewport fills with emerald gradient.

### U4. Render the wordmark shell and remove Vite boilerplate
**Goal:** App.jsx renders only the centred container with the gold `niyet` wordmark and Turkish tagline;
all Vite demo content and unused asset files are gone.
**Requirements:** AC "word 'niyet' visible centred gold"; AC "Turkish tagline visible"; AC "no Vite
boilerplate"; AC "container centred on 375px viewport"; verification "src/App.css does NOT exist".
**Dependencies:** U1, U3 (uses the CSS variables).
**Files:** `niyet/src/App.jsx` (rewrite), `niyet/src/main.jsx` (confirm only), delete
`niyet/src/App.css`, `niyet/src/assets/react.svg`, `niyet/public/vite.svg`.
**Approach:** Rewrite `App.jsx` as a minimal functional component per spec step 1.7: outer `<div>` with
inline style (`width:100%`, `maxWidth: var(--container-max-width)`, padding, flex column, centred, gap);
inside, an `<h1>` reading `niyet` (lowercase) styled gold/display/3xl/bold with `letterSpacing:0.05em`,
and a `<p>` tagline `Bedeninin atacağı bir sonraki adımı gösterir.` styled sm/secondary/centered. Export
default. Confirm `main.jsx` still imports `./index.css` and renders `<App />` under StrictMode — make no
changes unless broken. Delete `App.css`, `assets/react.svg`, `public/vite.svg` and confirm no dangling
imports remain.
**Patterns to follow:** spec step 1.7 (exact text + inline-style shape); inline-styles-with-vars decision.
**Test scenarios:** Test expectation: none — static presentational markup; covered by U6 visual checks
(wordmark text/color, tagline text, no boilerplate, 375px centring).
**Verification:** Page shows gold `niyet` + tagline centred; no counter/logos; `src/App.css` absent;
no console import errors.

### U5. Create folder-structure stubs (components, hooks, lib)
**Goal:** Every file later blocks will fill exists now with a minimal valid export.
**Requirements:** ACs "5 component stubs export default function", "2 hook stubs export named functions",
"3 lib stubs with export names storage, sync, playTickSound".
**Dependencies:** U1.
**Files (create):** `niyet/src/components/{Queue,AddSteps,Chains,ChainEdit,CelebrationBurst}.jsx`;
`niyet/src/hooks/{useQueue,useChains}.js`; `niyet/src/lib/{storage,sync,audio}.js`.
**Approach:** Per spec steps 1.10–1.12. Components: `export default function <Name>() { return null; }`.
Hooks: `export function useQueue() { return {}; }` / `export function useChains() { return {}; }`.
Lib: `storage.js` → `// TODO Block 14...` + `export const storage = {};`; `sync.js` → `// TODO Block 18...`
+ `export const sync = {};`; `audio.js` → `// TODO Block 5...` + `export function playTickSound() {}`.
None of these are imported yet, so they must not break the build.
**Patterns to follow:** spec `interfaces` (signatures for App/playTickSound/useQueue/useChains) + Q4.
**Test scenarios:** Test expectation: none — inert stubs; build-cleanliness verified by U6.
**Verification:** `ls src/components|hooks|lib` shows all files; export names match spec exactly.

### U6. Verify dev render and production build
**Goal:** Confirm the deliverable and all acceptance criteria hold.
**Requirements:** ACs "npm run dev starts without errors", "no console errors/warnings",
"npm run build exits 0", plus the full `verification` checklist in the spec.
**Dependencies:** U2, U3, U4, U5.
**Files:** none (verification only).
**Approach:** Run `npm run dev`; in the browser confirm: emerald gradient fills viewport, gold `niyet`
centred, Turkish tagline below, zero console errors/warnings, no Vite boilerplate, container stays centred
and non-overflowing at 375 px width. Then run `npm run build` and confirm exit code 0 and `dist/index.html`
exists (dist is gitignored, not committed). Walk the spec's `verification` array as the checklist.
**Test scenarios:** This unit *is* the verification pass. Covers every acceptance criterion: dev server
boots; gradient present (not white/black/grey); wordmark gold+centred; tagline present; no boilerplate;
zero console errors; build exits 0; all 10 stubs present with correct exports; `.env.example` correct;
all `:root` vars present; 375 px centring holds; `src/App.css` absent.
**Execution note:** UI verification requires a browser — if the agent cannot drive a browser, it must say
so explicitly and fall back to `npm run build` + grep/`ls` checks for the structural acceptance criteria
rather than claiming visual success.
**Verification:** All spec acceptance criteria and verification steps pass.

---

## Dependencies & Sequencing

```
U1 (scaffold) ──┬── U2 (html/env/gitignore)
                ├── U3 (index.css tokens) ──┐
                ├── U4 (App shell) ←─────────┘ (needs U3 vars)
                └── U5 (stubs)
U2, U3, U4, U5 ──> U6 (verify dev + build)
```

U1 is the hard prerequisite for everything. U4 additionally depends on U3 (it consumes the CSS
variables). U2 and U5 are independent of U3/U4. U6 is the final gate.

---

## Risks & Notes

- **Nested `niyet/niyet/` path confusion** — the most likely execution error. The implementer must
  operate inside the scaffolded app dir; all paths in this plan are relative to that app root.
- **Turkish characters** (`atacağı`, `adımı`) must be preserved as UTF-8 in `App.jsx` and `index.html`.
- **Double CSS import** — keep the `index.css` import only in `main.jsx`; do not add it to App.jsx.
- **`background-attachment: fixed`** is kept per spec; the spec flags a possible iOS-Safari perf concern
  as an open question for a later design-polish block — not addressed here.
- **Headless verification** — if no browser is available, U6 degrades to build + structural checks and
  the agent must report visual criteria as unverified rather than assumed-passing.

---

## Open Questions (deferred to later blocks, from spec)

These do not block Block 1; recorded so they are not lost:
- Final calligraphic font choice for the wordmark (before design-polish block).
- Whether to render the Arabic glyph نية alongside the Latin wordmark (PRD: calligraphy is decoration).
- Exact emerald gradient direction/stops (sign-off before Block 4 motion design).
- `background-attachment: fixed` vs `scroll` on mobile.
- Final brand hex values (canonical var names are frozen; only values change).

---
title: "feat: Static queue render (Block 2)"
type: feat
status: active
created: 2026-05-29
depth: lightweight
origin: specs/02-static-queue/spec.json
---

# feat: Static Queue Render (Block 2)

## Problem Frame

With the styled shell from Block 1 in place, Niyet now needs its first real view: a
single-action queue. This block builds a `Queue` component that renders exactly **one**
task card (the first item of a hardcoded seed array) filling the ~480 px container in large
calm typography, with a `+N adım sırada` count label beneath it and an empty-state when the
array is empty. It also establishes two project-wide foundations: the canonical `Task` data
shape `{ id, text }` and a `TOKENS` design-token module (`src/tokens.js`) that every later
component imports instead of using magic strings.

**Deliverable:** `npm run dev` shows the emerald page with one centred task card, large text,
and `+4 adım sırada` beneath; `npm run build` exits 0; no interactivity, no new dependencies.

The spec (`specs/02-static-queue/spec.json`) is the authoritative origin document and is fully
prescriptive — exact token values, seed items, and inline-style shapes live in its
`implementation_steps` 2.1–2.9 and `data_structures`. The implementer should read those verbatim
rather than relying on this plan to restate every hex value.

**Target app root:** the Vite app lives at the nested path `niyet/niyet/` (created by Block 1).
All `src/...` paths below are relative to that app root, i.e. `src/components/Queue.jsx` on disk
is `niyet/niyet/src/components/Queue.jsx`.

---

## Scope Boundaries

### In scope
- `src/components/Queue.jsx` — zero-prop `Queue` view component
- `SEED_TASKS` constant (5 Namaz Hazırlığı steps) + `Task` JSDoc typedef, collocated in Queue.jsx
- `src/tokens.js` — `TOKENS` object (colors, typography, spacing, radii)
- Single task card (first item only) at full container width, large calm text, emerald-tinted surface
- `+N adım sırada` count label (`N = tasks.length - 1`); suppressed to empty string when N is 0
- Empty-state copy when the array is empty (no card, no count)
- `src/index.css` — declare the Block-2 `:root` custom properties + minimal reset/body rule
- `src/App.jsx` — render `<Queue />` in place of the Block-1 wordmark placeholder

### Outside this product's identity (from spec scope.out)
- Any completion logic, card tapping, checkboxes, or interactive elements
- Visible-count toggle / showing 2·3·5 cards (Block 3)
- Entry/exit animations (Blocks 4, 6), audio (Block 5), celebration (Block 7), streak (Block 8)
- Add-steps / done-log UI (Blocks 9, 10), richer empty-state variants (Block 11)
- Chains, localStorage, Supabase, auth, sync, PWA, deploy (Blocks 12–19)
- Any editing of the task list; UUID ids (simple string ids are fine for the seed)
- A `position` field on `Task` (ordering is array-index here; persistence concern for Block 14)

### Deferred to follow-up blocks
- Block 14 swaps `useState(SEED_TASKS)` for a `useQueue()` hook — a single-line change enabled by
  the zero-prop contract chosen here (spec Q3).

---

## Key Technical Decisions

- **`TOKENS` as JS constants, not CSS `var()` in inline styles** (spec Q1, PRD §4.1). Components
  read hardcoded values from `src/tokens.js` directly to avoid `getComputedStyle` round-trips. The
  `:root` CSS custom properties still exist in `index.css` for global/reset rules (body background).
  This means the design system has two parallel sources (TOKENS + CSS vars) carrying the same values;
  TOKENS is authoritative for component inline styles, CSS vars for global CSS.
- **Block-2 token palette supersedes Block-1 placeholders for component use.** Block 1 defined
  `--color-bg-start/-end` etc. as placeholders; Block 2 introduces `--color-bg` (singular) and the
  `TOKENS` values (`bg #0a1a12`, `surfaceRaised #163320`, `emerald #10b981`, `gold #d4af37`, …).
  Follow the Block-2 spec values verbatim; leftover Block-1 vars may remain in `index.css` harmlessly.
- **Zero-prop `Queue` with internal `useState(SEED_TASKS)`** (spec Q3). `const [tasks] = useState(SEED_TASKS)`
  — setter intentionally unused now so Block 14 swaps to `useQueue()` without touching App.jsx.
- **`Task` shape frozen at `{ id, text }`** (spec Q5). `id` is a short string in the seed; stays
  `string` project-wide. No `position` field. This is the canonical shape for the whole project.
- **`+0 adım sırada` suppressed to empty string, not `null`** (spec Q4) so vertical rhythm doesn't
  collapse when going 1 remaining → 0.
- **No new npm packages** — uses only React from Block 1.

---

## Implementation Units

### U1. Create the design-token module
**Goal:** A single source of truth for design values that every component imports.
**Requirements:** `TOKENS` interface; AC "no new dependencies".
**Dependencies:** none (Block 1 scaffold exists).
**Files:** `src/tokens.js` (create).
**Approach:** Export `const TOKENS` with the exact `colors`, `typography`, `spacing`, and `radii`
sub-objects and values from spec step 2.2 (e.g. `colors.bg '#0a1a12'`, `colors.surfaceRaised '#163320'`,
`colors.emerald '#10b981'`, `colors.gold '#d4af37'`, `typography.taskFontSize '2rem'`,
`spacing.containerMaxWidth '480px'`, `radii.card '1.25rem'`). An optional `style()` merge helper may be
added but is not required by any acceptance criterion.
**Patterns to follow:** spec step 2.2 verbatim (values are canonical).
**Test scenarios:** Test expectation: none — static data module; consumption verified via U5.
**Verification:** `TOKENS` imports cleanly and exposes all four sub-objects with spec values.

### U2. Declare CSS custom properties and base styles in index.css
**Goal:** Block-2 `:root` vars and the minimal reset/body rule exist for global/reset CSS.
**Requirements:** spec files entry for `src/index.css`; AC "deep emerald background fills viewport".
**Dependencies:** none.
**Files:** `src/index.css` (modify).
**Approach:** Add a `:root` block mapping the token values to CSS custom properties per spec step 2.3
(`--color-bg: #0a1a12;`, `--color-surface: #0f2318;`, `--color-surface-raised: #163320;`,
`--color-emerald: #10b981;`, `--color-gold: #d4af37;`, `--color-text-primary: #f0fdf4;`,
`--color-text-muted: #6b9e7a;`). Ensure the universal `box-sizing`/reset rule and a `body` rule
(`background: var(--color-bg)`, text color, font-family, `min-height: 100vh`) are present. Leftover
Block-1 variables may stay; do not rename Block-2 vars.
**Patterns to follow:** spec step 2.3.
**Test scenarios:** Test expectation: none — global styling; covered by U5 visual check.
**Verification:** DevTools `:root` shows the Block-2 vars; page background is deep emerald.

### U3. Build the Queue component (seed, card, count, empty state)
**Goal:** A zero-prop `Queue` that renders one task card + count label, or the empty-state.
**Requirements:** ACs — single ≥2rem card; emerald-tinted card surface distinct from page;
`+4 adım sırada` muted label; no interactive elements; no remaining-task list; `+0` suppressed;
empty-state copy; documented `Task` typedef. `Queue` interface; `Task`/`SEED_TASKS` data structures.
**Dependencies:** U1.
**Files:** `src/components/Queue.jsx` (replace the Block-1 stub).
**Approach:** Per spec steps 2.1, 2.4–2.8. Top of file: `/** @typedef {{ id: string, text: string }} Task */`
and `const SEED_TASKS` = the 5 Namaz Hazırlığı items from spec step 2.1 (preserve Turkish UTF-8 exactly:
`banyoya git (abdest için)`, `abdest al`, `odana su getir`, `su iç`, `seccadenin önünde dur`). Component:
`import` React + `TOKENS`; `const [tasks] = React.useState(SEED_TASKS)`; derive `current = tasks[0] ?? null`
and `remainingCount = tasks.length - 1`. Render: outer flex-column page `<div>` (centred, `minHeight:100vh`,
`backgroundColor: TOKENS.colors.bg`, padding) → inner container `<div>` (`maxWidth: containerMaxWidth`,
`width:100%`). When `current` is non-null: card `<div>` (`surfaceRaised` bg, `radii.card`, padding,
`minHeight:'180px'`, flex-centred, the spec's `boxShadow`, emerald top-border accent) containing a `<p>`
with the task text styled per spec step 2.6; then the count `<p>` (`remainingCount > 0 ? \`+${remainingCount} adım sırada\` : ''`,
muted, centred). When `tasks.length === 0`: render the empty-state `<p>` only — copy
`Sırada bir şey yok — bir adım ekle ya da bir zincir yükle.` — no card, no count.
**Patterns to follow:** spec steps 2.4–2.8 (inline-style shapes); TOKENS-direct styling decision.
**Test scenarios:** This block ships no automated test infra (spec step 2.10) — verification is the
manual smoke test in U5. Behaviours to confirm there: (happy) 5-item seed → one card with first task
text + `+4 adım sırada`; (boundary) 1-item seed → card + blank count area (no `+0`); (edge) empty seed
→ empty-state copy, no card, no count; (negative) no checkbox/button/toggle and no remaining-task list
rendered in any case.
**Verification:** Component renders the three states correctly per the scenarios above.

### U4. Wire Queue into App.jsx
**Goal:** App renders `<Queue />` instead of the Block-1 wordmark placeholder.
**Requirements:** spec step 2.9; deliverable.
**Dependencies:** U3.
**Files:** `src/App.jsx` (modify).
**Approach:** Import `Queue` from `./components/Queue` and return `<Queue />` as App's body. Remove the
Block-1 wordmark/tagline markup. Keep App a thin shell — no routing, no state. Leave the `index.css`
import in `main.jsx` untouched.
**Patterns to follow:** spec step 2.9.
**Test scenarios:** Test expectation: none — thin wiring; covered by U5.
**Verification:** Page shows the Queue view, not the wordmark; no console errors.

### U5. Smoke-test render and build
**Goal:** Confirm the deliverable and all acceptance criteria hold.
**Requirements:** all spec `acceptance_criteria` and `verification` items.
**Dependencies:** U2, U4.
**Files:** none (verification only; temporary `SEED_TASKS` edits are reverted).
**Approach:** Per spec step 2.10. `npm run dev`: confirm emerald background, one large centred card with
the first task text, `+4 adım sırada` muted beneath, no interactive elements, no task list. Temporarily
set `SEED_TASKS` to 3 items → expect `+2 adım sırada`; to 1 item → expect blank count (no `+0`); to `[]`
→ expect the empty-state copy with no card/count. **Restore `SEED_TASKS` to the 5-item default.** Then
`npm run build` → expect exit 0, no lint/build errors. Confirm `package.json` is unchanged vs Block 1.
**Execution note:** UI verification needs a browser — if the agent cannot drive one, it must say so and
fall back to `npm run build` + reading the component source to confirm the count/empty-state branches,
rather than claiming visual success.
**Verification:** All spec acceptance criteria and verification steps pass; no dependency changes.

---

## Dependencies & Sequencing

```
U1 (tokens.js) ──> U3 (Queue) ──> U4 (App wiring) ──┐
U2 (index.css) ─────────────────────────────────────┴──> U5 (smoke-test + build)
```

U1 (tokens) gates U3 (Queue consumes TOKENS). U2 (CSS) is independent and only needs to land before
the U5 visual check. U4 needs U3. U5 is the final gate.

---

## Risks & Notes

- **Turkish UTF-8** in `SEED_TASKS`, the count label, and the empty-state copy (`ş ğ ı ü ö ç`, em-dash)
  must be preserved exactly.
- **Don't revert-forget** — U5 mutates `SEED_TASKS` to test count/empty branches; it must be restored to
  the 5-item default before the block is considered done (it's an acceptance criterion).
- **Two token sources** (TOKENS constants + CSS `:root` vars) intentionally duplicate values; keep them
  consistent but expect components to read TOKENS, not CSS vars.
- **Nested app path** `niyet/niyet/` — operate inside the scaffolded app dir.
- **Headless verification** — without a browser, U5 degrades to build + source inspection; report visual
  criteria as unverified rather than assumed-passing.

---

## Open Questions (deferred, from spec)

Non-blocking for Block 2; recorded so they aren't lost:
- Card `minHeight` for very short tasks (spec suggests ~160–180px; needs device review).
- Final font choice for task text (system-ui placeholder vs a calligraphic display font).
- Whether the `+N adım sırada` count becomes tappable in Block 3 (affects spacing reserved now).
- Optional faint `نية` Arabic-calligraphy watermark — deferred to a design-polish pass.
- Confirm the system font stack renders Turkish glyphs correctly on iOS Safari / Android Chrome.

---
status: active
type: feat
slug: visible-count-toggle
created: 2026-05-29
origin: specs/03-visible-count-toggle/spec.json
depends_on: [2026-05-29-002-feat-static-queue-render-plan.md]
depth: lightweight
---

# Block 3 — Visible-Count Toggle

## Problem Frame

Block 2 renders exactly one task card from a hardcoded array plus a `+N adım sırada`
count. Block 3 lets the user choose how many cards are visible at once (1 / 2 / 3 / 5,
default 1). Secondary cards shrink and dim progressively so the primary action stays
dominant ("never competing", PRD §3.1). The `+N adım sırada` label now reflects only the
tasks beyond the visible window.

Still no real data, no completion logic, no persistence — those are later blocks.

## Scope

**In** (from origin spec 03):
- `CountSelector` controlled pill-row component: options 1/2/3/5, gold active state.
- `showCount` state (default 1) held locally in `Queue` (Q2 resolution C7 — keep local now, Block 14 lifts to App + persists).
- Render exactly `showCount` cards sliced from the hardcoded array.
- Per-index scale/opacity ramp via a single-source `CARD_RAMP` constant.
- `+N adım sırada` label = `tasks.length - showCount` when > 0; hidden otherwise.

**Out** (deferred): localStorage/Supabase persistence (Block 14/18), completion/checkbox
(Block 4), audio (Block 5), animations (Block 6/7), fire/streak (Block 8), real data,
dedicated empty-state (Block 11).

## Key Decisions

1. **Styling source: TOKENS-direct, not CSS vars.** The origin spec writes inline styles
   as `var(--color-card-bg)`, `var(--color-gold)`, `var(--color-text-muted)`. Block 2
   established the convention of reading `src/tokens.js` (`TOKENS.*`) directly in inline
   styles. To stay consistent, this block uses TOKENS references:
   - `var(--color-card-bg)` → `TOKENS.colors.surfaceRaised`
   - `var(--color-gold)` → `TOKENS.colors.gold`
   - `var(--color-text-muted)` → `TOKENS.colors.textMuted`
   - inactive pill `rgba(255,255,255,0.08)` and active pill text `#000` are kept as
     literals (no matching token).
   The CSS-var form in the spec is treated as directional, not literal.

2. **`CARD_RAMP` is a hardcoded constant** (Q1) in its own module so any future component
   can reuse the same depth hierarchy. Index clamped at 3 — the 5th card (index 4) reuses
   index-3 values (Q3, intentional "barely there" ghost).

3. **`CountSelector` is fully controlled** (Q4) — parent owns `showCount`, no internal
   state. Correct for later sync/persistence overrides.

4. **`TaskCard` owns its ramp lookup** from `index` so future blocks add `onClick`/`isDone`
   props without touching ramp logic. The Block 2 single-card styling (rounded surface,
   emerald top border, shadow) migrates into `TaskCard`'s index-0 treatment.

5. **Open questions** from the spec are answered per spec defaults for v1: cards keep the
   `-8px` overlap (deck feel); no max-count enforcement (silently render what's available);
   no skeletons for empty slots; default stays `1`; `+N` label is informational (no tap
   action). None block this block.

## Implementation Units

### U1 — `CARD_RAMP` constant
- **Files:** create `src/constants/cardRamp.js`
- **Goal:** Export `CARD_RAMP = [{scale:1.0,opacity:1.0},{scale:0.88,opacity:0.65},{scale:0.76,opacity:0.42},{scale:0.64,opacity:0.26}]`. Document the clamp rule `CARD_RAMP[Math.min(index, CARD_RAMP.length - 1)]`.
- **Verification:** values match spec 3.1 exactly; default export or named export consistent with project (Block 2 used named `TOKENS` export → use named `CARD_RAMP`).

### U2 — `TaskCard` component
- **Files:** create `src/components/TaskCard.jsx`
- **Goal:** Props `{ text, index }`. Derive `{scale, opacity}` from clamped `CARD_RAMP`.
  Inline style per spec 3.2: `transform: scale(...)`, `opacity`, `transformOrigin: 'top center'`,
  `transition: 'transform 0.2s ease, opacity 0.2s ease'`, `width:'100%'`,
  `background: TOKENS.colors.surfaceRaised`, `borderRadius:'16px'`, `padding:'24px 20px'`,
  `marginBottom: index===0 ? '0' : '-8px'`, `boxShadow: index===0 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none'`,
  `position:'relative'`, `zIndex: 10 - index`. Index-0 keeps the emerald top border +
  primary task typography from Block 2. Text in a `<p>` with `clamp(1rem,4vw,1.4rem)` on
  index 0; secondary cards inherit transform scaling. Include the 28px / 2px-emerald-border
  placeholder circle div for future Block 4 (no interaction yet).
- **Patterns to follow:** `src/components/Queue.jsx` (Block 2) for TOKENS usage and the
  existing card visual treatment.
- **Verification:** index 0 → scale 1.0/opacity 1.0; index 1 → 0.88/0.65; index 2 →
  0.76/0.42; index ≥3 → 0.64/0.26.

### U3 — `CountSelector` component
- **Files:** create `src/components/CountSelector.jsx`
- **Goal:** Props `{ value, onChange }`. Flex row of four pill `<button>`s labelled
  '1','2','3','5'. Active pill: `background: TOKENS.colors.gold`, `color:'#000'`,
  `fontWeight:700`. Inactive: `background:'rgba(255,255,255,0.08)'`,
  `color: TOKENS.colors.textMuted`. Pill: `borderRadius:'999px'`, `padding:'6px 16px'`,
  `border:'none'`, `cursor:'pointer'`, `fontSize:'0.9rem'`, `minWidth:'40px'`,
  `transition:'background 0.15s, color 0.15s'`. Container: `display:'flex'`, `gap:'8px'`,
  `justifyContent:'center'`, `marginBottom:'16px'`. Each pill calls `onChange(n)`;
  `aria-pressed={value === n}`. Fully controlled, no internal state.
- **Verification:** renders 4 pills; active = gold; clicking calls `onChange` with 1/2/3/5.

### U4 — Wire into `Queue`
- **Files:** modify `src/components/Queue.jsx`
- **Goal:** (a) `const [showCount, setShowCount] = React.useState(1)`. (b) Render
  `<CountSelector value={showCount} onChange={setShowCount} />` above the card list.
  (c) `const visibleTasks = tasks.slice(0, showCount)`; map to
  `<TaskCard key={task.id ?? index} text={task.text} index={index} />`. (d)
  `const queued = tasks.length - showCount`; render `{queued > 0 && <p ...>+{queued} adım sırada</p>}`
  using `TOKENS.colors.textMuted`. (e) Wrap card list in a `position:'relative'`,
  `display:'flex'`, `flexDirection:'column'`, `alignItems:'center'` container so scale
  collapses correctly. Remove the now-superseded inline single-card block (its visuals
  live in `TaskCard`). Keep the empty-state branch (`current === null`) — though with the
  hardcoded 5-task array it never triggers; Block 11 owns the real empty state.
- **Patterns to follow:** existing `Queue.jsx` outer layout (TOKENS bg, container max-width).
- **Verification:** count=1 → 1 card + '+4 adım sırada'; count=5 → 5 cards, no label.

### U5 — Smoke-test + build
- **Files:** none (verification only)
- **Goal:** `npm run build` exits 0; no new deps in package.json/lockfile. Confirm
  count/label branches via render check (browser if available, else SSR render of the
  compiled component as in Block 2). Report pure-visual criteria (scale/opacity pixel
  values, mobile wrap) as needing browser confirmation if no browser is available.
- **Verification:** build green; `git diff` on package.json/lockfile empty.

## Test Scenarios

No automated test framework is configured in this project (Blocks 1–2 verified via build +
SSR render). Verification is therefore build + render-branch checks, matching prior blocks:

- **Happy path:** default render shows exactly 1 full-size card and '+4 adım sırada'.
- **Toggle:** switching to 2/3/5 renders that many cards; label updates to '+3'/'+2'/(none at 5).
- **Ramp:** index 1 card computes scale 0.88 / opacity 0.65; index 2 → 0.76/0.42; index ≥3 → 0.64/0.26 (±0.01).
- **Edge — count=5 with 5 tasks:** all 5 render, no '+N' label, cards 4 & 5 share the ghost ramp.
- **Edge — rapid switching:** no crash, no React key warnings.
- **Active state:** selected pill is gold; others muted; `aria-pressed` reflects selection.
- **Mobile (375px):** pill row wraps or scrolls without breaking layout (browser-only check).

## Dependencies & Sequencing

U1 → U2 (TaskCard imports CARD_RAMP). U3 independent. U4 depends on U2 + U3. U5 last.
All paths are relative to the nested app root `niyet/niyet/`.

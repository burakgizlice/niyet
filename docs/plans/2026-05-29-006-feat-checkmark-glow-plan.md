---
status: active
type: feat
slug: checkmark-glow
created: 2026-05-29
origin: specs/06-checkmark-glow/spec.json
depends_on: [2026-05-29-004-feat-completion-flow-plan.md, 2026-05-29-005-feat-tick-sound-plan.md]
depth: standard
---

# Block 6 — Checkmark Draw + Glow Animation Polish

> **App root:** all `src/...` paths below are relative to the `niyet/` app directory (e.g. `src/components/CheckboxButton.jsx` lives at `niyet/src/components/CheckboxButton.jsx`). This matches the convention of the prior block plans in `docs/plans/`.

---

## Problem Frame

When a task is completed, the circular checkbox should deliver a tactile, perceptible reward: an SVG checkmark that *draws itself* (~300ms ease-out) and a gold glow ring that pulses (~500ms ease-out). This is the visual half of the dopamine reward loop — the user should *feel* the reward as a distinct moment **before** the card slides away. The tick sound (Block 5) and the card slide/fade exit (Block 4) already exist; this block adds the checkmark + glow and the small timing change needed for the reward to register before exit.

---

## Two facts that override the spec

The spec (`specs/06-checkmark-glow/spec.json`) was written against assumptions that do not match the shipped Block 4 code. Both are corrected here:

1. **Integration target is `src/components/TaskCard.jsx`, not `src/components/Queue.jsx`.** The completable checkbox lives in `TaskCard` (the `<button role="checkbox">` with the 28px circle `<span>`). `Queue.jsx` only maps tasks to `TaskCard`s and never renders a checkbox. The spec's "modify Queue.jsx" instruction is wrong; we modify `TaskCard.jsx`.

2. **Block 4 has no pre-exit delay window — we are adding one (user-confirmed scope expansion).** The spec assumed Block 4 does `tap → wait ~500ms → then card exits`. In reality, `useQueue.completeTask(id)` adds the id to `completingIds` **synchronously on tap**, and `TaskCard` begins its slide+fade exit transition at t=0 over `COMPLETION_ANIMATION_MS` (500ms), committing state on `transitionend`. There is no window in which the reward plays on a stationary card. Per the user's decision, we **add a reward-hold window**: on tap the checkmark + glow play on a held (stationary) card for `REWARD_WINDOW_MS` (~350ms), and only then does the existing exit fire. This honors the spec's acceptance criteria ("checkmark fully drawn before the card begins its exit") at the cost of a small, contained change to Block 4's `useQueue` timing.

---

## Scope

**In:**
- New `src/components/CheckboxButton.jsx`: self-contained `role="checkbox"` button owning the 28px circle, the SVG checkmark, and the `animating` state.
- New `src/styles/checkmark.css`: `@keyframes checkmark-draw`, `@keyframes glow-pulse`, the `.checkbox--animating` driver classes, and `prefers-reduced-motion` overrides.
- `src/constants/animation.js`: add `REWARD_WINDOW_MS` constant.
- `src/hooks/useQueue.js`: insert the reward-hold delay into `completeTask` (the Block 4 timing change) with a re-entry guard covering the hold window.
- `src/components/TaskCard.jsx`: replace the inline checkbox button with `<CheckboxButton>`, wire `onComplete`/`disabled`, remove the now-duplicated keydown/circle markup.

**Out (unchanged from spec):**
- Tick sound synthesis (Block 5 — already wired in `completeTask`; CheckboxButton must NOT fire it again).
- Celebration particle burst (Block 7), fire/streak counter (Block 8).
- The card slide/fade exit *animation visuals* (Block 4) — we change *when* it starts, not how it looks.
- Anything touching the done store / queue mutation logic in `finalizeComplete`.

---

## Resolved Decisions

1. **Reward-hold window in Block 4 (user-confirmed).** `completeTask` plays the tick immediately (unchanged), then defers adding the id to `completingIds` by `REWARD_WINDOW_MS`. The CheckboxButton's own `animating` state drives the visual on tap, independent of queue state, so the card sits still while the checkmark draws and the glow peaks; the exit fires after the window. Timeline: tap → checkmark draw 0–300ms, glow peak ~150ms → hold ends ~350ms → card exit 350–850ms → `finalizeComplete` on `transitionend`.

2. **`REWARD_WINDOW_MS = 350`.** Checkmark completes at 300ms; +50ms buffer lets the fully-drawn tick register before motion starts. Named constant in `animation.js` so it is ear/eye-tunable without touching logic, mirroring the Block 5 convention.

3. **Checkmark stroke = white `#FFFFFF` (user-confirmed).** Maximum contrast against the gold-filled circle.

4. **Glow is `box-shadow` on the circle div (spec Q2).** Layered two-value box-shadow (spread ring + blur halo), `rgba(212,175,55,…)` matching `--color-gold` (`#d4af37`, confirmed present in `src/index.css`). No SVG filter.

5. **Checkmark path length hardcoded to `19` (spec Q1).** Path `M 4 10 L 8.5 15 L 16 6`, true length ≈18.45, rounded up; 0.55px overdraw is imperceptible. Comment records the calculation.

6. **Unchecked circle keeps the current emerald border; fills gold while animating.** The shipped `TaskCard` circle uses a `2px solid emerald` border. We preserve that resting look (resolving the spec's open border-colour question toward the existing app) and animate `background`/`border-color` to gold via the `.checkbox--animating` class as the checkmark draws.

7. **Defensive `animating` reset is set *beyond* the full reward+exit window (~1000ms), not 600ms (refines spec Q3).** A naive 600ms reset would revert the path's resting `stroke-dashoffset` to 19 and the glow to none while the card is still visibly exiting (exit ends ~850ms) — making the checkmark *vanish mid-exit*. Normally the card unmounts (~850ms) before the timer fires, so this is purely a safety net for the "Block 4 never unmounts" failure case; it must outlast the visible animation. Timer is cleared on unmount.

8. **No automated tests.** The project has no test runner (no vitest/jest, no test files). Verification is manual/visual via DevTools, exactly as the spec's `verification` list prescribes. Units below carry explicit manual verification steps instead of unit-test scenarios.

---

## High-Level Technical Design

*This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
TAP on CheckboxButton
  │
  ├─(CheckboxButton, local)── setAnimating(true)
  │       └─ adds .checkbox--animating → CSS fires:
  │            • checkmark-draw  0–300ms  (stroke-dashoffset 19→0, white)
  │            • glow-pulse      0–500ms  (box-shadow peak ~150ms → dim ring)
  │            • circle bg/border emerald→gold (150ms transition)
  │
  └─(onComplete → useQueue.completeTask)
          ├─ re-entry guard (rewardingRef) — ignore double-tap
          ├─ playTickSound()                      [Block 5, unchanged]
          └─ setTimeout(REWARD_WINDOW_MS = 350ms):
                   setCompletingIds(add id)
                        └─ TaskCard isCompleting=true → exit transition (500ms)
                               └─ transitionend → finalizeComplete  [Block 4, unchanged]
```

Reduced motion: `checkmark-draw` and `glow-pulse` run at `0.01ms` (instant check, instant glow); the `REWARD_WINDOW_MS` setTimeout still applies (it is a timer, not an animation), so the card still holds briefly then exits — acceptable per spec 6.8.

---

## Implementation Units

### U1. Add `REWARD_WINDOW_MS` to the animation timing constants
- **Goal:** Single source of truth for the reward-hold duration, consumed by `useQueue`.
- **Requirements:** Sequencing acceptance criterion (reward completes before exit).
- **Dependencies:** none.
- **Files:** modify `src/constants/animation.js`.
- **Approach:** Add `export const REWARD_WINDOW_MS = 350` with a one-line comment explaining it is the hold between tap and card-exit start, sized so the 300ms checkmark draw completes first. Mirror the existing named-export style in that file.
- **Patterns to follow:** existing `COMPLETION_ANIMATION_MS` / `CARD_ENTER_ANIMATION_MS` exports in the same file.
- **Test expectation:** none — pure constant; covered by manual verification in U4/U5.

---

### U2. Create `checkmark.css` (keyframes + driver classes + reduced-motion)
- **Goal:** All CSS for the draw and glow animations in one stylesheet, imported by `CheckboxButton`.
- **Requirements:** checkmark draw ~300ms ease-out; glow pulse ~500ms ease-out peaking ~30%; reduced-motion instant fallback; no layout shift.
- **Dependencies:** none (consumes `--color-gold` already defined in `src/index.css`).
- **Files:** create `src/styles/checkmark.css`.
- **Approach:**
  - `@keyframes checkmark-draw { from { stroke-dashoffset: 19; } to { stroke-dashoffset: 0; } }`.
  - `@keyframes glow-pulse` with stops at `0%` (`box-shadow: 0 0 0 0 rgba(212,175,55,0)`), `30%` (`0 0 0 6px rgba(212,175,55,0.55), 0 0 12px 4px rgba(212,175,55,0.30)`), `100%` (`0 0 0 3px rgba(212,175,55,0.15), 0 0 6px 2px rgba(212,175,55,0.10)`) — settles to a dim ring rather than cutting to nothing.
  - `.checkbox--animating .checkbox-circle { animation: glow-pulse 500ms ease-out forwards; background: var(--color-gold); border-color: var(--color-gold); }` and a `transition: background 150ms ease, border-color 150ms ease;` on the base `.checkbox-circle` so the fill eases in.
  - `.checkbox--animating .checkbox-check { animation: checkmark-draw 300ms ease-out forwards; }`.
  - `@media (prefers-reduced-motion: reduce)`: set `animation-duration: 0.01ms !important` for both `.checkbox--animating .checkbox-check` and `.checkbox--animating .checkbox-circle`.
  - Class names (`.checkbox-circle`, `.checkbox-check`, `.checkbox--animating`) must match what `CheckboxButton` renders in U3.
- **Patterns to follow:** keyframe/rgba values from spec steps 6.3 and `GlowKeyframe` data structure; `--color-gold` from `src/index.css`.
- **Test expectation:** none — verified visually through U3/U5.

---

### U3. Build `CheckboxButton.jsx`
- **Goal:** Self-contained accessible checkbox that owns the circle, the SVG checkmark, and the `animating` state.
- **Requirements:** `role="checkbox"`, `aria-checked`, `aria-label="Görevi tamamla"`; ≥44px tap target, 28px visible circle; white checkmark on gold fill; checkmark hidden until animating; double-tap ignored; no layout shift.
- **Dependencies:** U2 (CSS classes).
- **Files:** create `src/components/CheckboxButton.jsx`; it `import`s `'../styles/checkmark.css'`.
- **Approach:**
  - Props `{ checked = false, onComplete, disabled = false }`. JSDoc the contract: *`onComplete` is called immediately on tap; the caller (Block 4 / `useQueue`) owns the delay before state mutation.* Note `checked` stays `false` while the card is mounted (card unmounts on exit); `animating` carries the visual.
  - Local state `const [animating, setAnimating] = useState(false)`.
  - `handleActivate`: if `disabled || checked || animating` → return; `setAnimating(true)`; `onComplete?.()`.
  - Render a `<button type="button" role="checkbox" aria-checked={checked} aria-label="Görevi tamamla" disabled={disabled} onClick={handleActivate}>`. A native `<button>` already activates on Enter/Space, so no custom keydown is needed (this removes the bespoke keydown logic the inline version carried).
  - Outer button style: 44px×44px, `padding: 8px`, flex-centered, transparent background, no border, `cursor` pointer when enabled. Inner `<span className={"checkbox-circle" + (animating ? " checkbox--animating" : "")}>` — wait: apply `checkbox--animating` on a wrapper that contains both circle and check so the CSS descendant selectors resolve. Simplest: put `checkbox--animating` on the circle element itself and target `.checkbox-circle.checkbox--animating` and the child `.checkbox-check`. Implementer picks the selector shape but it MUST match U2.
  - Circle: 28px, `border-radius: 999px`, `position: relative`, base `2px solid` emerald border (read from `TOKENS.colors.emerald`), `className="checkbox-circle"`.
  - SVG inside the circle, absolutely centered: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">` containing `<path className="checkbox-check" d="M 4 10 L 8.5 15 L 16 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 19, strokeDashoffset: checked ? 0 : 19 }} />`. Comment the `19` ≈ path-length calculation. When not animating and not checked, dashoffset 19 keeps the tick invisible; the `.checkbox--animating` class drives the draw.
  - Defensive reset (Decision 7): on `animating` becoming true, set a `setTimeout(() => setAnimating(false), REWARD_WINDOW_MS + COMPLETION_ANIMATION_MS + buffer)` (~1000ms) and clear it on cleanup/unmount. Keep the timer strictly longer than the visible reward+exit so it never hides the tick mid-exit.
- **Patterns to follow:** the existing inline checkbox markup in `src/components/TaskCard.jsx` (sizes, aria attrs, `TOKENS` usage); CSS-import-in-component is supported by Vite (`src/main.jsx` imports `index.css`).
- **Test expectation:** none — manual: tap shows checkmark drawing + gold glow; checkmark hidden before tap; second tap while animating is ignored; accessibility inspector shows `role=checkbox`, `aria-checked=false`, label `Görevi tamamla`.

---

### U4. Add the reward-hold window to `useQueue.completeTask` (Block 4 timing change)
- **Goal:** Hold the card stationary for `REWARD_WINDOW_MS` after tap so the reward plays, then start the existing exit.
- **Requirements:** card exit must not begin until the checkmark is drawn; double-tap during the hold is ignored; tick still fires once at tap; StrictMode-safe (no double side effects).
- **Dependencies:** U1.
- **Files:** modify `src/hooks/useQueue.js`.
- **Approach:**
  - Import `REWARD_WINDOW_MS` from `../constants/animation`.
  - Add a `rewardingIdsRef = useRef(new Set())` as the re-entry guard for the hold phase (because `completingIds` is still empty during the hold, the existing `completingIdsRef` guard does not cover it).
  - In `completeTask(id)`: at the top, if `rewardingIdsRef.current.has(id) || completingIdsRef.current.has(id)` → return (mutex). Else add `id` to `rewardingIdsRef.current`. Then `playTickSound()` (unchanged — fires once at real start). Then `setTimeout(() => { rewardingIdsRef.current.delete(id); setCompletingIds(prev => new Set(prev).add(id)); }, REWARD_WINDOW_MS)`.
  - `playTickSound()` stays a direct call in the handler body (not in an updater), preserving the StrictMode discipline already documented in the file. The `setCompletingIds` updater stays pure.
  - Track outstanding timers (e.g. a `useRef(new Map())` of id→timeoutId) and clear them in a cleanup effect on unmount to avoid setting state after unmount. Keep it minimal.
  - `finalizeComplete` is unchanged.
- **Patterns to follow:** the existing ref-mirror + pure-updater pattern in `useQueue.js`; the `completingIdsRef` mutex it already uses.
- **Test expectation:** none — manual: tapping a card holds it ~350ms with the reward visible, then it slides out; the task lands in the done log exactly once (no double `addDone`); rapid double-tap completes the task once.

---

### U5. Integrate `CheckboxButton` into `TaskCard.jsx`
- **Goal:** Replace the inline checkbox with `<CheckboxButton>` and wire it to the completion flow.
- **Requirements:** all spec acceptance criteria as observed in the running app; no layout shift; disabled during exit to block double-tap.
- **Dependencies:** U3, U4.
- **Files:** modify `src/components/TaskCard.jsx`.
- **Approach:**
  - Import `CheckboxButton`.
  - Remove the inline `<button role="checkbox">…<span circle/></button>` block and the now-redundant `handleKeyDown` + `triggerComplete` keyboard plumbing (the native `<button>` inside `CheckboxButton` handles Enter/Space).
  - Render `<CheckboxButton checked={false} onComplete={() => isInteractive && onComplete?.(id)} disabled={!isInteractive || isCompleting} />` in the same flex slot (preserve `flexShrink: 0` / `gap` layout).
  - `disabled` combines `!isInteractive` (non-primary cards) and `isCompleting` (already exiting). During the reward-hold (`isCompleting` still false) the CheckboxButton's own `animating` guard blocks re-tap, so taps are covered across the whole sequence.
  - Leave the exit-transition logic, `handleTransitionEnd`, entrance animation, and `CARD_RAMP` untouched.
- **Patterns to follow:** current prop flow (`onComplete`, `onCompleteEnd`, `isInteractive`, `isCompleting`) in `TaskCard.jsx` and `Queue.jsx`.
- **Test expectation:** none — manual verification list below.

---

## System-Wide Impact

- **`useQueue` timing:** the completion sequence gains ~350ms total latency before the card moves. Verify the done log, empty-state drain, and `+N adım sırada` counter still behave (they key off `queue`, which only changes at `finalizeComplete`, so no logic change — just later).
- **Reduced motion:** the hold still applies (timer, not animation), so reduced-motion users get an instant check then a ~350ms pause before exit. Acceptable per spec 6.8.
- **Blocks 7/8 (future):** the celebration burst and streak counter will likely hook the same `completeTask` start; `REWARD_WINDOW_MS` becomes a shared reward-window knob they can build against.

---

## Manual Verification (no test runner in project)

Run `npm run dev` in `niyet/` and exercise the top card:
1. Tap the checkbox — the white checkmark **draws itself** over ~300ms (not a flash), with a gold glow ring pulsing simultaneously, peaking early then settling.
2. The card stays put while the checkmark draws, **then** slides/fades out — exit does not visibly overlap the draw.
3. The circle fills gold as the tick draws; the tick is white and high-contrast; no layout shift in any state.
4. DevTools → Elements: confirm `stroke-dashoffset` goes 19→0 on the path and `box-shadow` animates on the circle.
5. DevTools accessibility inspector: `role=checkbox`, `aria-checked=false`, `aria-label="Görevi tamamla"`; tap target ≥44px.
6. Rapid double-tap: task completes once, lands in done log once, no double animation.
7. DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: check appears instantly, glow instant, card still exits after the brief hold.
8. Mobile viewport (375px): tap target ≥44px, circle centered in card, no overflow.
9. `npm run lint` passes.

---

## Deferred to Follow-Up Work

- Tuning `REWARD_WINDOW_MS` if 350ms feels too slow/fast for the ADHD "snappy" target — left as a single constant for easy adjustment.
- Border-colour treatment of the unchecked circle (kept emerald to match the shipped app) can be revisited if the design later specifies a gold resting border.

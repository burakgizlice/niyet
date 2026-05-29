---
status: active
type: feat
slug: completion-flow
created: 2026-05-29
origin: specs/04-completion-flow/spec.json
depends_on: [2026-05-29-003-feat-visible-count-toggle-plan.md]
depth: standard
---

# Block 4 — Completion Flow (animation + queue drain, no reward effects)

## Summary

Tapping the circular checkbox on the top task marks it complete: the card animates out
(translateX + opacity + scale, ~500ms), the next task slides in from below (~350ms), and
the completed task is appended to an in-memory `done` array. **Queue state is never mutated
until the exit animation finishes** — that delay is the "reward window." The queue drains to
empty. No sound, no particles, no SVG checkmark, no glow ring (later blocks).

This block also performs the **state lift** the earlier blocks deferred: queue state (and
`showCount`) moves out of `Queue.jsx` into a real `useQueue` hook, and a new `useDone` hook
owns the `done` array. Both are hosted in `App.jsx` so Blocks 8 (fire streak) and 10 (done
log) can share them later.

---

## Resolved Decisions (from user, this session)

1. **Timing mechanism: `transitionend` event, not `setTimeout`** (spec Q1 recommendation).
   The state commit fires when the card's exit transition actually ends — resilient to
   frame drops, backgrounded tabs, and reduced-motion. `setTimeout(500)` is rejected as the
   primary driver.
2. **State location: full lift to `App.jsx` now.** Create real `useQueue` + `useDone`
   hooks, host both in `App.jsx`, prop-drill into `Queue` → `TaskCard`. Matches the spec's
   file list and Q5; sets up Blocks 8/10/14.
3. **`prefers-reduced-motion`: respect it now.** When reduced-motion is set, collapse the
   exit/entrance animation to ~instant **but still defer the state commit by one tick**
   (preserve "the reward is felt"). See U4 for the reduced-motion edge of the transitionend
   path (0-duration transitions don't reliably emit `transitionend`).

---

## Key Technical Decisions

- **`completeTask` is split into start + commit.** `completeTask(id)` only *starts* the
  sequence (adds `id` to `completingIds` → re-render → `TaskCard` gets `isCompleting=true`
  → exit transition plays). A second function — `finalizeComplete(id)` — performs the actual
  state mutation (push to `done`, remove from queue, clear the completing flag) and is
  invoked by `TaskCard`'s `transitionend` handler, not by a timer. This keeps the
  animation→state-commit ordering correct under the transitionend model.
- **`completingIds` is a `Set<string>` in `useState`** (spec Q2), not a ref — adding an id
  must trigger a re-render so `TaskCard` receives `isCompleting`. Updates spread into a new
  Set: `setCompletingIds(prev => new Set(prev).add(id))`. `completeTask(id)` is a no-op when
  `completingIds.has(id)` — this is the double-tap mutex.
- **`isCompleting` is derived at render time** from `completingIds.has(task.id)` — never
  stored on the task object. Task shape stays `{ id, text }` (unchanged from Block 2).
- **`done` lives in `useDone`, not `useQueue`** (spec Q5). `App.jsx` wires `useDone`'s
  `addDone` into `useQueue` (passed as a parameter / callback) so `useQueue` stays focused
  and Block 14 can add localStorage to `useDone` without touching `useQueue`.
- **Top-card-only completion** (spec Q4). Only `queue[0]` is interactive; secondary cards
  (index > 0, shown when `showCount > 1`) render the checkbox visually but with
  `pointer-events: none` / `disabled` so a non-top task cannot be completed out of order.
- **Entrance animation via rAF-flip inside `TaskCard`** (spec Q3): mount the freshly-promoted
  card with `translateY(40px)/opacity:0`, then **double**-`requestAnimationFrame` to clear to
  `translateY(0)/opacity:1` so the browser commits the initial paint before the transition
  fires. `key={task.id}` guarantees a fresh mount when a new task reaches position 0.
- **Inline styles only** (stack constraint, consistent with Blocks 2–3 and TOKENS-direct
  styling). No CSS classes / keyframes for these animations.

---

## High-Level Technical Design

Completion timing sequence (directional — illustrates the intended ordering, not code to
reproduce):

```
tap checkbox (queue[0])
  → completeTask(id)
      guard: completingIds.has(id)? → ignore (double-tap)
      else: setCompletingIds(add id)        [t=0]
  → re-render: TaskCard isCompleting=true
      exit transition starts (translateX 80px + scale .95 + opacity 0, ~500ms)
  → transitionend on card root            [t≈500ms]
      → finalizeComplete(id):
          addDone({id, text, completedAt: Date.now()})
          setQueue(filter out id)
          setCompletingIds(remove id)
  → new queue[0] mounts with key=id
      rAF×2 → entrance transition (translateY 40px→0, opacity 0→1, ~350ms)

reduced-motion: exit/entrance transforms collapse to ~instant; finalizeComplete is
triggered via a single rAF tick instead of transitionend (0ms transitions don't reliably
emit transitionend) — state commit is still deferred one tick.
```

---

## Implementation Units

### U1. Animation timing constants
- **Goal:** Single source of truth for animation timing, imported by hook + components and reused by Blocks 5–7.
- **Files:** create `src/constants/animation.js`
- **Approach:** Named exports `COMPLETION_ANIMATION_MS = 500`, `CARD_ENTER_ANIMATION_MS = 350`, `EXIT_EASING = 'cubic-bezier(.4,0,.2,1)'`, `ENTER_EASING = 'cubic-bezier(.4,0,.2,1)'`. Mirror the named-export convention of `src/constants/cardRamp.js`.
- **Dependencies:** none
- **Test expectation:** none — pure constants. Verified by import + build.
- **Verification:** values match spec 4.1; build resolves the import.

### U2. `useDone` hook
- **Goal:** Own the in-memory `done` array, decoupled from the queue.
- **Files:** create `src/hooks/useDone.js`
- **Approach:** `useState([])`. `addDone({ id, text, completedAt })` appends. `clearDone()` resets to `[]`. Return `{ done, addDone, clearDone }`. No localStorage, no side effects. `completedAt` is supplied by the caller (or default `Date.now()` inside `addDone` if omitted) — keep it simple; `useQueue` passes the full `DoneItem`.
- **Dependencies:** none
- **Patterns to follow:** existing hook file style in `src/hooks/` (e.g., `useQueue.js` stub export shape).
- **Test scenarios:**
  - Happy path: `addDone({id:'1',text:'x',completedAt:123})` → `done` has that one entry.
  - Edge: two `addDone` calls → `done.length === 2`, order preserved (append).
  - `clearDone()` → `done === []`.
- **Verification:** hook returns the three members; appends and clears behave as above (verifiable headlessly via a small React test render or SSR harness).

### U3. `useQueue` hook (state lift + completion logic)
- **Goal:** Replace the `{}` stub with real queue state and the start/commit completion actions.
- **Files:** modify `src/hooks/useQueue.js`
- **Approach:** Accept `addDone` as a parameter (`useQueue({ addDone })`) so the hook stays decoupled from `useDone`. Internal state: `queue` (`useState(SEED_TASKS)` — move `SEED_TASKS` here from `Queue.jsx`), `showCount` (`useState(1)` — moved from Queue, Block 3), `completingIds` (`useState(new Set())`).
  - `completeTask(id)`: if `completingIds.has(id)` return (mutex); else `setCompletingIds(prev => new Set(prev).add(id))`. Does **not** mutate queue.
  - `finalizeComplete(id)`: look up the task text from current queue; `addDone({ id, text, completedAt: Date.now() })`; `setQueue(q => q.filter(t => t.id !== id))`; `setCompletingIds(prev => { const n = new Set(prev); n.delete(id); return n })`. Idempotent if called twice for the same id (filter/delete are no-ops the second time).
  - Return `{ queue, showCount, setShowCount, completingIds, completeTask, finalizeComplete }`.
  - Update the stub's TODO comment to reference Block 14 (localStorage) rather than implying the hook is empty.
- **Dependencies:** U1 (none directly, but logically part of the same feature), U2 (shape of `addDone`)
- **Patterns to follow:** `SEED_TASKS` literal currently in `src/components/Queue.jsx` (Block 2) — move verbatim.
- **Test scenarios:**
  - Happy path: `completeTask('1')` sets `completingIds` to contain `'1'`; `queue` unchanged.
  - Mutex: calling `completeTask('1')` twice leaves `completingIds` with a single `'1'` and never double-commits.
  - Commit: after `completeTask('1')` then `finalizeComplete('1')`, `queue` no longer contains `'1'`, `addDone` was called once with `{id:'1', text:<seed text>, completedAt:<number>}`, and `completingIds` no longer has `'1'`.
  - Edge: `finalizeComplete('1')` called twice → queue/`completingIds` unchanged on the second call (idempotent); `addDone` should not double-append (guard: only finalize if the task is still present OR still in `completingIds`).
  - Drain: completing every id in sequence empties `queue` and grows `done` by the original length.
- **Verification:** state transitions above hold under a headless React test render; queue length only decreases on `finalizeComplete`, never on `completeTask`.

### U4. `TaskCard` — checkbox, exit/entrance animation, a11y, reduced-motion
- **Goal:** Make the card completable and animated, top-card-only, accessible, motion-aware.
- **Files:** modify `src/components/TaskCard.jsx`
- **Approach:** New props (additive to Block 3's `{ text, index }`): `{ id, isCompleting, onComplete, onCompleteEnd, isInteractive }`. (Spec lists a `task` object; keep the existing `text`/`index` props and add `id` rather than reshaping, to minimize churn — note this deviation from the spec's `TaskCard props` signature, which is directional.)
  - **Checkbox:** a `<button>` with inline `width:44px; height:44px; padding:8px; display:flex; align/justify center; background:transparent; border:none; cursor:pointer`. Inside, the existing 28px circle div (Block 3 placeholder) becomes the visual checkbox (`borderRadius:50%`, `2px solid` gold/emerald). `onClick` → `onComplete(id)`. `role="checkbox"`, `aria-checked={isCompleting}` (transitional true during the animation window), `aria-label="Görevi tamamla"`, focusable (no negative tabIndex). `onKeyDown`: Space/Enter → `onComplete(id)` (and `preventDefault` on Space to avoid scroll).
  - **Interactivity gating:** when `isInteractive === false` (secondary cards), the checkbox gets `pointerEvents:'none'`, `disabled`, and is removed from the tab order (`tabIndex={-1}`), and is visually subdued. Only `index === 0` is interactive.
  - **Exit animation:** when `isCompleting`, apply inline `transform:'translateX(80px) scale(0.95)'`, `opacity:0`, `transition: transform ${COMPLETION_ANIMATION_MS}ms ${EXIT_EASING}, opacity ${COMPLETION_ANIMATION_MS}ms ${EXIT_EASING}`. Otherwise the Block 3 ramp transform applies. **Attach a `transitionend` listener** (via `ref` + `useEffect`, cleaned up on unmount) that, when the exit `transform`/`opacity` transition ends and `isCompleting` is true, calls `onCompleteEnd(id)` exactly once (guard against the listener firing for both `transform` and `opacity` — key off `e.propertyName === 'transform'`).
  - **Entrance animation:** rAF-flip. `useState(entering=true)` initialized on mount; initial style `translateY(40px)/opacity:0`; `useEffect` runs `requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)))`; final style `translateY(0)/opacity:1` with `transition: ... ${CARD_ENTER_ANIMATION_MS}ms ${ENTER_EASING}`. The Block 3 scale ramp must compose with the entrance translate — combine transforms in one string. `key={task.id}` in the parent ensures a fresh mount.
  - **Reduced-motion:** read `window.matchMedia('(prefers-reduced-motion: reduce)').matches` (guard for SSR — default false when `window`/`matchMedia` is undefined). When reduced: set transition durations to `0ms` (or omit transitions). Because a 0-duration transition does not reliably emit `transitionend`, drive `onCompleteEnd(id)` from a single `requestAnimationFrame` tick when `isCompleting` becomes true under reduced-motion, instead of the `transitionend` listener. Entrance under reduced-motion simply mounts at the final state. State commit is still deferred one tick (never synchronous with the tap).
- **Dependencies:** U1
- **Patterns to follow:** Block 3 `TaskCard.jsx` (CARD_RAMP lookup, TOKENS-direct styling, the 28px circle).
- **Test scenarios:**
  - Happy path: clicking the checkbox calls `onComplete(id)` once.
  - Keyboard: Space and Enter each call `onComplete(id)`; Space does not scroll.
  - Mutex surface: rapid double-click still results in a single `onComplete` per the parent mutex (the card itself doesn't block, the hook does — assert click handler simply forwards).
  - Interactivity: with `isInteractive=false`, the checkbox is `disabled` / `pointer-events:none` and not tab-focusable; clicking does nothing.
  - a11y attributes: `role="checkbox"`, `aria-label="Görevi tamamla"` present; `aria-checked` reflects `isCompleting`.
  - transitionend: when `isCompleting` and a `transform` transition ends, `onCompleteEnd(id)` fires exactly once (not twice for transform+opacity).
  - Reduced-motion (browser-only for the visual collapse): logic path drives `onCompleteEnd` via rAF; assert the handler still fires once.
- **Verification:** structural/handler behavior verifiable via headless React test render (clicks, keyboard, aria, disabled gating, single-fire of onCompleteEnd). **Browser-only:** actual 500ms/350ms motion, ≥44px computed tap target, deck recomposition, reduced-motion visual collapse.

### U5. Wire hooks in `App.jsx` and consume in `Queue.jsx`
- **Goal:** Host `useDone` + `useQueue` at the top, prop-drill the completion API down, drain to empty.
- **Files:** modify `src/App.jsx`, modify `src/components/Queue.jsx`
- **Approach:**
  - `App.jsx`: `const { done, addDone, clearDone } = useDone();` then `const queueApi = useQueue({ addDone });` Render `<Queue {...queueApi} />` (or pass explicit props: `queue, showCount, setShowCount, completingIds, completeTask, finalizeComplete`). `done`/`clearDone` are held here for Blocks 8/10 (not yet consumed — do not render them; avoid unused-var lint by destructuring only what's used, or leave a short comment that Blocks 8/10 consume `done`/`clearDone`).
  - `Queue.jsx`: remove the local `SEED_TASKS`, `useState(tasks)`, and `useState(showCount)` (now sourced from props). Accept the queue API as props. `current = queue[0] ?? null`; `visibleTasks = queue.slice(0, showCount)`; `queued = queue.length - showCount`. Pass to each `TaskCard`: `id`, `text`, `index`, `isCompleting={completingIds.has(task.id)}`, `onComplete={completeTask}`, `onCompleteEnd={finalizeComplete}`, `isInteractive={index === 0}`, `key={task.id}`. Keep `CountSelector value={showCount} onChange={setShowCount}`. The `+N adım sırada` label and the empty-state branch (queue drained to zero) remain — empty state copy stays as Block 2's (Block 11 owns the real empty state).
- **Dependencies:** U2, U3, U4
- **Patterns to follow:** current `Queue.jsx` (Block 3) layout and `App.jsx`.
- **Test scenarios:**
  - Integration (headless render): mount `App`; assert one interactive top card; simulate completeTask→finalizeComplete and assert the next task is promoted to top and `done` grew by one.
  - Drain: completing all tasks leaves `queue` empty and renders the empty-state branch; `done.length === ` original length.
  - `showCount > 1`: with `showCount=3`, secondary cards render with `isInteractive=false`; completing the top promotes index 1 → 0.
  - No regression: `CountSelector` still toggles `showCount`; `+N adım sırada` reflects `queue.length - showCount` and hides at ≤ 0.
- **Verification:** App renders, queue drains correctly, count/label behavior preserved; queue length decreases only after `finalizeComplete`.

### U6. Verify build + headless logic checks
- **Goal:** Confirm the feature builds and the state machine behaves, with browser-only criteria explicitly flagged.
- **Files:** none (verification only)
- **Approach:** `npm run build` exits 0; `git diff --stat package.json package-lock.json` empty (no new deps). Drive the logic via a headless React render (or SSR + simulated calls into the hooks): assert mutex (double `completeTask` → one commit), deferred commit (queue length unchanged after `completeTask`, decremented after `finalizeComplete`), drain to empty, and `done` growth. Report timing/animation/tap-target/reduced-motion-visual criteria as **needs browser confirmation**.
- **Dependencies:** U1–U5
- **Test expectation:** none new — this unit runs the checks above.
- **Verification:** build green; logic assertions pass; browser-only list reported.

---

## Scope Boundaries

**In:** checkbox completion, exit/entrance animation, deferred state commit via transitionend,
in-memory `done`, queue drain, double-tap mutex, top-card-only interactivity, state lift to
`App.jsx`, reduced-motion handling, keyboard + ARIA baseline, shared animation constants.

### Deferred for later (other blocks, per origin spec)
- SVG checkmark draw + glow ring (Block 6); tick sound / Web Audio (Block 5); celebration
  particle burst (Block 7); fire/streak counter (Block 8); done-log rendering (Block 10);
  localStorage persistence of `done`/`showCount` (Block 14); Supabase sync (Block 18);
  real empty-state UI (Block 11); swipe-to-complete (Phase 2).

### Resolved open questions (from spec `open_questions`)
- **Reduced-motion:** respected now (see U4).
- **Add-task during in-flight animation (Block 9):** out of scope; mutation only happens at
  `finalizeComplete`, and `setQueue`/`setCompletingIds` are functional updates, so a
  concurrent append composes safely. No special handling added now.
- **Entrance vs exit sequencing:** entrance is a natural consequence of the new top card
  mounting after `finalizeComplete` (which runs on `transitionend`) — no manual gap timing.
- **Empty-state animation:** out of scope (Block 11 coordinates).
- **`DoneItem.id`:** mirrors `QueueItem.id` (accepted; Block 14/18 dedup can revisit).

---

## Verification Strategy

No automated test framework is configured (Blocks 1–3 verified via build + headless render).
Same approach here: `npm run build` + headless React render of the hooks/components to assert
the **state-machine** behavior (mutex, deferred commit, drain, done growth, promotion). All
**timing, motion, computed tap-target, and reduced-motion visual** criteria require a manual
browser pass (`npm run dev`) and are reported as unverified by the headless agent.

---

## Dependencies & Sequencing

U1 (constants) and U2 (useDone) are independent and first. U3 (useQueue) needs U2's `addDone`
shape. U4 (TaskCard) needs U1. U5 (App + Queue wiring) needs U2 + U3 + U4. U6 (verify) last.
All paths are relative to the nested app root `niyet/niyet/`.

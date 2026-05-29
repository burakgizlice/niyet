---
title: "feat: Celebration particle burst on milestone completions"
type: feat
status: completed
created: 2026-05-29
origin: specs/07-celebration-burst/spec.json
depth: standard
---

# feat: Celebration Particle Burst

## Summary

Fire a burst of 18 randomised emoji particles from screen centre as a dopamine
reward: on every 3rd task completion (`done.length % 3 === 0`) and whenever a
completion empties the queue. Particles animate outward via per-particle CSS
custom properties, self-clean from the DOM after their animation ends, and leave
no ghost nodes across repeated triggers. The burst is ephemeral UI only — no
persistence, no sound, no streak counter (those are other blocks).

The component fills the existing `src/components/CelebrationBurst.jsx` stub
(currently `return null`). The trigger is wired in `src/App.jsx`, which already
owns both the `done` store (`useDone`) and the queue (`useQueue`).

---

## Problem Frame & Context

This is Block 7 of the Niyet build. The reward loop (tick sound → checkmark draw
→ glow → **particle burst**) is the product's core dopamine mechanic for an
ADHD/executive-dysfunction audience. Blocks 4–6 are already implemented.

**Key deviation from the spec:** `specs/07-celebration-burst/spec.json` step 7.7
assumes the completion handler lives in `Queue.jsx`. It does not. Since the spec
was written, completion was split into two phases inside `src/hooks/useQueue.js`:

- `completeTask(id)` — starts the reward hold + exit animation (no mutation).
- `finalizeComplete(id)` — fired from `TaskCard`'s `transitionend`; this is where
  `addDone(...)` runs and the task is filtered out of the queue.

`Queue.jsx` is a pure presentational component and **does not receive `done`**.
Therefore the trigger cannot be evaluated where the spec literally says. The
`done` store and the queue both live in `App.jsx`, which is the correct place to
observe a completion and decide whether to fire a burst.

---

## Key Technical Decisions

1. **Trigger lives in a `useEffect` in `App.jsx` watching `done.length`**
   *(overrides spec step 7.7's "wire in Queue.jsx").* `done.length` increases only
   on a committed completion. A `prevDoneLength` ref guards against firing on mount
   and against false positives. When `done.length` increases, evaluate
   `(done.length % 3 === 0) || (queue.length === 0)` and set `burstActive` true.
   Because `addDone` and the `setQueue` filter both run inside `finalizeComplete`,
   React batches them; by the time the effect runs, `queue.length` already reflects
   the post-removal count. This avoids the off-by-one of computing
   `newDoneLength = done.length + 1` by hand (spec Q3) — the effect reads committed
   state directly.

2. **Declarative rendering: `useState` array + `.map()`** *(spec Q1 recommendation,
   overrides the imperative DOM body of the spec).* When `active` flips false→true,
   `generateParticles()` populates state; particles render as `<span>`s; each
   `onAnimationEnd` filters itself out of state. A hard `setTimeout` fallback clears
   all remaining particles as insurance against dropped `animationend` events
   (e.g. backgrounded tab). No imperative `appendChild`/`innerHTML` — stays inside
   React's reconciler, which also guarantees no DOM accumulation.

3. **Single boolean `burstActive` → built-in de-duplication** *(spec step 7.8).*
   The trigger is one boolean OR, so simultaneous conditions (3rd completion that
   also empties the queue) collapse to exactly one burst. `burstActive` resets only
   via `onDone`; a trigger arriving while a burst is mid-flight is a no-op
   `setBurstActive(true)` (suppress-until-done UX, per spec open question).

4. **Keyframes injected once via `useInsertionEffect`** *(spec Q2 recommendation,
   overrides module-level side effect).* Inject the `@keyframes niyetBurst` block
   into `document.head` guarded by `document.getElementById('niyet-burst-keyframes')`.
   `useInsertionEffect` is the React 18/19-correct hook for stylesheet injection and
   avoids module-load side effects that break test/SSR contexts. Vite has no SSR
   here, but this is the cleaner idiom and the project uses Vite + React 19.

5. **Honor `prefers-reduced-motion: reduce`** *(resolves spec open question).* When
   the media query matches, skip particle generation entirely and call `onDone()`
   on the next tick so the parent still resets `burstActive` cleanly. The reward is
   core to the product, but suppressing motion for users who request it is a
   one-line check and WCAG-aligned.

6. **No automated test runner exists** (package.json has eslint only — no
   vitest/jest/testing-library). Verification is **manual browser-based**, matching
   the spec's own `verification` array and the convention of prior blocks. Adding a
   test harness is out of scope. Test scenarios below are written as manual
   DevTools/browser checks.

---

## High-Level Technical Design

*This illustrates the intended approach and is directional guidance for review,
not implementation specification. The implementing agent should treat it as
context, not code to reproduce.*

```
TaskCard transitionend
  └─> useQueue.finalizeComplete(id)
        ├─ addDone(...)            → done.length grows   (App: useDone)
        └─ setQueue(filter)        → queue shrinks        (App: useQueue)

App useEffect [done.length]
  if (done.length > prevDoneLength) {           // a completion just committed
     prevDoneLength = done.length
     if (done.length % 3 === 0 || queue.length === 0)
        setBurstActive(true)                     // idempotent if already true
  }

<CelebrationBurst active={burstActive} onDone={() => setBurstActive(false)} />
  useEffect [active]: false→true
     if (prefersReducedMotion) { schedule onDone(); return }
     setParticles(generateParticles())          // 18 descriptors
     setTimeout(clear-all + onDone, 1750)        // hard fallback
  render: particles.map(p => <span onAnimationEnd={remove p} ... />)
```

Particle direction: `--dx = distancePx * cos(angle)`, `--dy = distancePx * sin(angle)`,
stored as raw numbers and multiplied by `1px` inside the keyframe `calc()`.

---

## Implementation Units

### U1. Implement the CelebrationBurst component

**Goal:** Turn the `return null` stub into a working declarative particle-burst
overlay that fires on `active` true, self-cleans, honors reduced motion, and
calls `onDone` after cleanup.

**Requirements:** Spec scope `in` items 1–9; acceptance criteria 1, 6, 7, 8, 9,
10, 11, 12, 13; spec steps 7.1–7.6, 7.9.

**Dependencies:** none.

**Files:**
- `src/components/CelebrationBurst.jsx` — replace stub with full implementation.

**Approach:**
- Module top-level constants: `EMOJIS = ['⭐','✨','🌟','💫','🎉','🚀','💎','🔥','🌙','⚡']`
  and `PARTICLE_COUNT = 18`.
- `generateParticles()` — pure, returns 18 `ParticleDescriptor` objects:
  `{ id: crypto.randomUUID(), emoji, angleDeg: random*360, distancePx: 120+random*140,
  spinDeg: (random-0.5)*1080, sizePx: 1.4+random*1.2, delayMs: random*280 }`.
- `useInsertionEffect` (empty deps) injects `<style id="niyet-burst-keyframes">`
  with `@keyframes niyetBurst` (0% scale .3 opacity 0 → 15% scale 1.1 opacity 1 →
  100% scale .5 opacity 0; translate driven by `calc(var(--dx)*1px)` /
  `calc(var(--dy)*1px)`, rotate by `calc(var(--spin)*1deg)`), guarded by an
  `getElementById` existence check so it injects exactly once per page load.
- Component signature: `export default function CelebrationBurst({ active, onDone })`.
- `const [particles, setParticles] = useState([])`.
- `useEffect` on `[active]`: when `active` is true, check
  `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. If reduced,
  `setParticles([])` and schedule `onDone()` (e.g. `setTimeout(onDone, 0)`), return.
  Otherwise `setParticles(generateParticles())` and set a `setTimeout` at 1750 ms
  that clears particles and calls `onDone()`. Clear the timeout in the effect
  cleanup. When `active` is false, ensure particles are empty.
- Overlay container: a `position: fixed; inset: 0; pointer-events: none;
  z-index: 9999` div. Render nothing (or empty container) when `particles` is empty.
- Each particle `<span>`: `position:absolute; left:50%; top:50%; lineHeight:1;
  userSelect:none; pointerEvents:none; fontSize:`${p.sizePx}rem`;
  '--dx': cos value, '--dy': sin value, '--spin': p.spinDeg;
  animation:`niyetBurst 1.4s cubic-bezier(.2,.8,.4,1) ${p.delayMs}ms forwards``.
  Text content is `p.emoji`. `onAnimationEnd` removes that particle from state
  (filter by `p.id`).

**Patterns to follow:**
- Reward-effect timing constants live in `src/constants/animation.js`
  (`REWARD_WINDOW_MS`, etc.) and CSS for an existing reward effect lives in
  `src/styles/checkmark.css` — mirror those conventions if extracting a constant or
  stylesheet feels cleaner than inline. Inline custom-property styling is acceptable
  here since the keyframe is dynamic per particle.
- React 19 functional-component + hooks style used throughout `src/components/`.

**Test scenarios** (manual — no runner):
- Covers AE1. Trigger a burst; in DevTools Elements confirm exactly 18 `<span>`
  particle nodes injected — no more, no fewer.
- Covers AE6. Each particle's text is one of the 10 spec emoji.
- Covers AE7. Particles radiate in distinct directions (varied `--dx`/`--dy`),
  not all toward one corner.
- Covers AE8. Animations are staggered (varied `delayMs`) — particles do not all
  appear on the same frame.
- Covers AE9. 2 s after a burst starts, 0 particle spans remain in the DOM.
- Covers AE12. The `niyet-burst-keyframes` `<style>` tag appears in `document.head`
  exactly once after 5 burst cycles.
- Covers AE13. `onDone` is invoked after cleanup (verify parent flag resets).
- Edge — backgrounded tab: throttle CPU 4×, trigger burst, switch tabs; after 3 s
  no zombie spans remain (hard-timeout fallback fires).
- Edge — `prefers-reduced-motion: reduce` (emulate in DevTools Rendering): trigger;
  no particles render, and `onDone` still fires so the parent resets.
- Edge — 375×667 viewport: particles originate from centre and travel outward with
  no layout reflow / scrollbar.

**Verification:** Component renders the overlay only while a burst is active; spans
inject and clear cleanly; keyframes injected once; reduced-motion path no-ops
gracefully and still calls `onDone`.

---

### U2. Wire the burst trigger in App.jsx

**Goal:** Observe committed completions and fire exactly one burst when the 3rd
(6th, 9th…) task completes or when a completion empties the queue.

**Requirements:** Spec scope `in` items 6–8; acceptance criteria 2, 3, 4, 5;
spec steps 7.7, 7.8.

**Dependencies:** U1 (the component must exist and accept `active`/`onDone`).

**Files:**
- `src/App.jsx` — destructure `done` from `useDone`, add `burstActive` state, add
  the trigger `useEffect`, render `<CelebrationBurst>`.

**Approach:**
- Change `const { addDone } = useDone()` to also pull `done`.
- `const [burstActive, setBurstActive] = useState(false)`.
- `const prevDoneLength = useRef(done.length)`.
- `useEffect` on `[done.length, queueApi.queue.length]`: if
  `done.length > prevDoneLength.current`, set `prevDoneLength.current = done.length`,
  then if `(done.length % 3 === 0) || (queueApi.queue.length === 0)` call
  `setBurstActive(true)`. (The `> prev` guard ensures we only fire on an actual
  completion, never on mount or on unrelated re-renders. `done.length % 3 === 0`
  is only truthy when `done.length > 0`, so completions 1 and 2 never fire unless
  the queue is empty.)
- Render `<CelebrationBurst active={burstActive} onDone={() => setBurstActive(false)} />`
  alongside `<Queue {...queueApi} />`.

**Patterns to follow:**
- App already lifts `done`/`addDone` for downstream blocks (see existing comment in
  `src/App.jsx`); this is the first consumer of `done`.
- Hook/ref-mirror conventions in `src/hooks/useQueue.js`.

**Test scenarios** (manual — no runner):
- Covers AE2. Add 3 tasks, complete one by one: burst fires on the 3rd completion;
  add more and confirm 6th, 9th also fire.
- Covers AE3. Add 4 tasks, complete 3 (burst on 3rd), complete 4th: burst fires
  again because the queue is now empty (even though 4 % 3 ≠ 0).
- Covers AE4. Add 6 tasks, complete all 6: burst on completion 3 and completion 6;
  on 6 the queue also empties — confirm a single burst, not two.
- Covers AE5. Add 2 tasks, complete both: burst fires only on the 2nd (queue empty),
  not on the 1st.
- Edge — no false fire on mount: load the app (seed queue, `done` empty); no burst.
- Edge — rapid completion (empty a 6-item queue fast, CPU throttled): no orphaned
  spans; suppress-until-`onDone` behavior holds (a trigger during an active burst
  is a no-op).

**Verification:** Bursts fire on exactly the milestone/empty conditions above and
nowhere else; simultaneous conditions fire once; the app never bursts at startup.

---

## Scope Boundaries

**In scope:** Full `CelebrationBurst.jsx` implementation; trigger wiring in
`App.jsx`; `prefers-reduced-motion` handling; de-duplication of simultaneous
triggers.

**Out of scope (other blocks / spec `out`):** tick/completion sound (Block 5),
fire/streak counter and milestone labels (Block 8), checkmark SVG draw + glow ring
(Block 6), card slide-out exit (Block 4), any confetti library or canvas renderer,
Supabase/localStorage persistence.

### Deferred to Follow-Up Work
- Optional `font-family` emoji fallback stack (`'Segoe UI Emoji'`, `'Apple Color
  Emoji'`, `'Noto Color Emoji'`) if QA on a specific Android skin shows tofu boxes
  (spec Q5) — add only if a real device shows the problem.
- "Onboarding delight" burst on the very first ever completion (spec open question)
  — product decision, not part of the every-3rd / empty-queue rule.
- `visibilitychange` listener as an additional cleanup path (spec Q4) — the
  1750 ms hard fallback already covers the backgrounded-tab case; add only if zombie
  spans are observed in practice.

---

## Risks & Edge Cases

- **Re-fire while active:** A burst cannot replay while `burstActive` is already
  true (the `setBurstActive(true)` is a no-op until `onDone`). This is the intended
  suppress-until-done UX. If product later wants stacking bursts, the component
  would need a queue or a key-remount per trigger — explicitly deferred.
- **Effect dependency on `queue.length`:** Including `queueApi.queue.length` in the
  deps is harmless because the `done.length > prev` guard gates the actual fire;
  queue-only changes won't trigger a burst.
- **`crypto.randomUUID` availability:** Available in all modern browsers over
  HTTPS/localhost (the deploy target is `niyet.burakgizlice.com` via Cloudflare).
  No polyfill needed.

---

## Requirements Traceability

| Spec acceptance criterion | Covered by |
|---|---|
| AE1 exactly 18 spans | U1 |
| AE2 every-3rd trigger | U2 |
| AE3 empty-queue trigger | U2 |
| AE4 simultaneous → single burst | U2 |
| AE5 no fire on completions 1,2 | U2 |
| AE6 emoji set | U1 |
| AE7 radial directions | U1 |
| AE8 staggered animation | U1 |
| AE9 no spans after 2 s | U1 |
| AE10 no orphans on rapid completion | U1 + U2 |
| AE11 375 px viewport | U1 |
| AE12 keyframes injected once | U1 |
| AE13 onDone after cleanup | U1 |

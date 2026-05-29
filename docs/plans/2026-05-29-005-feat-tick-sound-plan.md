---
status: active
type: feat
slug: tick-sound
created: 2026-05-29
origin: specs/05-tick-sound/spec.json
depends_on: [2026-05-29-004-feat-completion-flow-plan.md]
depth: lightweight
---

# Block 5 — Tick Sound (Web Audio, three layered oscillators)

## Problem Frame

Every task completion should fire an instant, synthesised three-layer "tick" — a sharp
click, a warm rising tone, and a high sparkle — with zero perceptible latency, fully offline,
no audio asset files. This is the auditory half of the dopamine reward loop (the visual half
shipped in Block 4). Must survive mobile Safari's autoplay policy.

## Scope

**In:** `src/lib/audio.js` exporting `playTickSound()` + `unlockAudio()`; one lazily-created
shared `AudioContext`; iOS unlock on first user gesture; three oscillator layers with gain
envelopes; wiring the tick into Block 4's completion start; graceful no-op when Web Audio is
unavailable (SSR / very old browsers).

**Out:** audio asset files; volume UI / audio controls; particle burst (Block 7); fire/streak
(Block 8); haptics (Phase 2); ambient/background audio; any oscillator beyond the three.

## Resolved Decisions

1. **Unlock listener lives in `App.jsx`, not `Queue.jsx`** (spec Q4 recommendation). App is
   always mounted first and gestures can happen anywhere; a one-time `window` `touchstart` +
   `mousedown` listener (`{ once: true }`) calls `unlockAudio()`.
2. **`playTickSound()` is called inside `useQueue`'s `completeTask(id)`** — that is Block 4's
   completion handler. Fire it **only when a completion actually starts** (i.e. not on the
   double-tap mutex no-op), at the very top of the handler, before the animation. This gives
   zero-latency audio synchronous with the tap (spec Q2, high impact) and avoids ticking on
   ignored re-taps.
3. **Gain peaks + frequency sweep endpoints are named constants** at the top of `audio.js`
   (spec Q5) so the sound can be ear-tuned without touching logic.
4. **Oscillator types:** sawtooth (L1 click), sine (L2 warm), triangle (L3 sparkle) — spec Q3.
5. **Fresh oscillator nodes per call** (spec Q1) — stopped oscillators can't restart; staggered
   `stop()` times let GC reclaim them, no manual disconnect.

## Implementation Units

### U1. `audio.js` — context singleton + unlock + three-layer synthesis
- **Goal:** Replace the stub with the real Web Audio tick engine.
- **Files:** modify `src/lib/audio.js`
- **Approach:**
  - Module-level `let _ctx = null`. Private `getAudioContext()`: if no `AudioContext`/`webkitAudioContext` on `window` (or `window` undefined → SSR), return `null`; lazily create the singleton via `window.AudioContext || window.webkitAudioContext`; if `_ctx.state === 'suspended'` call `_ctx.resume()` (fire-and-forget, no await); return `_ctx`. Never re-create.
  - `export function unlockAudio()`: get ctx; if non-null and suspended, `resume()`; then the iOS trick — create a zero-length buffer source, connect to destination, `start()` then `stop()` immediately. Must be invoked from a real gesture handler.
  - Named constants block at top: `L1/L2/L3_GAIN_PEAK`, `L1/L2/L3_FREQ_START`, `L1/L2/L3_FREQ_END`, durations. Values from spec 5.3–5.5 (e.g. L1 gain 0.35, sweep 1800→2400 over 80ms; L2 sine 0.22 sweep 880→1320 over 300ms; L3 triangle 0.12 sweep 3200→4200 over 350ms).
  - `export function playTickSound()`: get ctx; if null return. Capture `const now = ctx.currentTime` once. Build three osc→gain→destination chains with the spec'd waveform, frequency `setValueAtTime` + `linearRampToValueAtTime`, and gain envelopes (small attack ramp to avoid DC click, decay to 0). Staggered `start(now)` / `stop(now + ~0.085 / 0.310 / 0.360)`. Wrap the whole body in `try/catch` that silently swallows — audio must never crash the app. Synchronous, returns void.
- **Dependencies:** none
- **Patterns to follow:** existing stub `src/lib/audio.js`; module-style of `src/lib/storage.js` / `src/lib/sync.js` stubs.
- **Test scenarios:**
  - No-op safety: with `window.AudioContext`/`webkitAudioContext` absent, `getAudioContext()` returns null and `playTickSound()` returns without throwing.
  - SSR safety: calling `playTickSound()` when `window` is undefined does not throw.
  - Singleton: two `getAudioContext()` calls return the same instance; context is not created at import time (only on first call).
  - Error containment: an internal failure (e.g. mocked `createOscillator` throw) is swallowed — `playTickSound()` still returns void, no throw.
  - **Browser-only (report unverified headlessly):** three audible layers, no pops/clicks, <5ms exec, rapid re-fire without errors.
- **Verification:** headless — no-op/SSR/singleton/error-containment assertions pass; module has zero audio-asset imports. Browser — audible three-layer tick, no artifacts.

### U2. Wire unlock (App.jsx) + tick (useQueue.js)
- **Goal:** Unlock the context on first gesture and fire the tick at completion start.
- **Files:** modify `src/App.jsx`, modify `src/hooks/useQueue.js`
- **Approach:**
  - `App.jsx`: `useEffect(() => {...}, [])` adding a one-time `window` listener for `touchstart` and `mousedown` that calls `unlockAudio()` and removes itself (`{ once: true }` per event, or manual cleanup). Import `unlockAudio` from `src/lib/audio`.
  - `useQueue.js`: import `playTickSound`. In `completeTask(id)`, fire `playTickSound()` only on a real start. Current `completeTask` uses a functional `setCompletingIds` updater with the mutex guard inside — **do not** call `playTickSound()` inside that updater (StrictMode double-invokes updaters; same class of bug fixed in Block 4). Instead read the current `completingIds` (via the existing state value or a ref) at the top of `completeTask`: if already completing, return early without ticking; otherwise call `playTickSound()` then `setCompletingIds(prev => new Set(prev).add(id))`. Keep the updater pure.
- **Dependencies:** U1
- **Patterns to follow:** Block 4 `useQueue.js` (the mutex + the queueRef pattern already there for keeping side effects out of updaters), `App.jsx` hook hosting.
- **Test scenarios:**
  - Tick on real completion: first `completeTask(id)` invokes `playTickSound` exactly once.
  - Mutex no tick: a second `completeTask(id)` for an id already in `completingIds` does **not** call `playTickSound` again.
  - Unlock once: the window listener calls `unlockAudio` on the first gesture and is removed (does not fire on subsequent gestures).
  - No regression: completion still adds to `completingIds` / drains as in Block 4.
  - **Browser-only:** actual audio on tap; iOS first-gesture unlock.
- **Verification:** headless — `playTickSound` call count matches real-start semantics (verify via a stub/spy in a headless render); unlock listener wired with cleanup. Browser — tap produces sound, iOS unlock works.

### U3. Verify build + no audio assets + offline
- **Goal:** Confirm the build is clean and asset-free.
- **Files:** none (verification only)
- **Approach:** `npm run build` exits 0; `git diff --stat package.json package-lock.json` empty (no deps). `find dist -name '*.mp3' -o -name '*.ogg' -o -name '*.wav'` returns nothing. `audio.js` has no audio-asset imports. Run the U1/U2 headless assertions.
- **Dependencies:** U1, U2
- **Test expectation:** none new — runs the checks above.
- **Verification:** build green; zero audio assets in `dist/`; headless logic assertions pass; report offline + audible criteria as needing a browser/device pass.

## Resolved open questions (from spec)
- **System volume governs** — no app-level volume control (out of scope).
- **Headphone safety / gain comfort** — initial constants per spec; flagged for ear-tuning on real devices, not a code blocker.
- **Completion-handler location** — confirmed: Block 4 placed it in `useQueue.js` (`completeTask`). Tick wires there (see U2).
- **Unlock location** — `App.jsx` (resolved, see U2).
- **PWA/offline** — synthesis is 100% runtime; the JS chunk carrying `audio.js` is cached by the Block 15 service worker like any other chunk. No audio resource to cache. No action here.

## Verification Strategy

No automated test framework is configured (prior blocks verified via build + headless render).
Audio is browser-runtime, so the headless agent can only assert: builds, no audio assets in
`dist/`, no-op/SSR/singleton/error-containment of `audio.js`, and `playTickSound` call-count
semantics (via a spy). **All audible criteria** — three distinct layers, no pops, <5ms exec,
iOS first-gesture unlock, offline playback, rapid-fire — require a manual browser/device pass
(`npm run dev`) and are reported unverified by the agent.

## Dependencies & Sequencing

U1 (audio engine) → U2 (wiring) → U3 (verify). All paths relative to the nested app root
`niyet/niyet/`.

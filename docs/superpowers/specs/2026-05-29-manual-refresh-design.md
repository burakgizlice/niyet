# Manual refresh (desktop button + mobile pull-to-refresh) — Design

**Date:** 2026-05-29
**Status:** Approved, ready for planning

## Problem

A signed-in user editing niyet on one device has no way to pull in changes made
on another device without a full page reload. Sync currently runs only once, on
login (`mergeOnLogin`). We want an explicit "get the latest" gesture:

- **Desktop:** a refresh button.
- **Mobile PWA:** swipe-down pull-to-refresh (the OS/browser native gesture is
  unavailable in `display-mode: standalone`, so it must be hand-built).

## Key insight

`sync.js` already contains the exact operation a refresh needs:
`mergeOnLogin(user)` pulls remote, three-way-merges with local state, writes the
result back to localStorage, and returns the merged state for React hydration.
A manual refresh is "run that merge on demand" — preceded by a pending-ops flush
so this device's queued edits (deletes, reorders) land remotely before the pull.

## Decisions (from brainstorming)

1. **Semantics: flush + merge.** Order is `flushPending(userId)` → then
   `mergeOnLogin(user)`. Flushing first ensures deletes/reorders are applied
   remotely before the pull, so the merge won't re-introduce locally-deleted
   items.
2. **Signed-out: hide entirely.** Anonymous users are localStorage-only with
   nothing to sync. The desktop button does not render and pull-to-refresh is
   disabled when there is no signed-in user. (Sign-in is already discoverable
   via the existing "Eşitle" pill.)
3. **Indicator: themed mark.** Reuse the breathing نية wordmark with the
   radial-glow treatment from `App.jsx`'s `LoadingScreen` (the `niyetBreath`
   animation) rather than a generic spinner.
4. **Gate desktop vs. mobile by pointer type** (`(pointer: fine)` vs.
   `(pointer: coarse)`), not by `isStandalone()`.

## Architecture

### 1. Sync layer — `src/lib/sync.js`

Add a thin orchestration wrapper that composes the two existing operations:

```js
/**
 * Manual refresh: push this device's queued ops up, then pull + three-way-merge
 * remote into local and return the merged state. Anonymous users get local
 * state untouched. Never throws — mergeOnLogin degrades to local state on a
 * failed remote round-trip, so an offline refresh is a safe no-op.
 * @param {{ id: string }} user
 * @returns {Promise<{ queue, done, chains, show_count }>}
 */
export async function refresh(user) {
  const userId = user?.id
  if (!userId) return getAll()
  await flushPending(userId)
  return mergeOnLogin(user)
}
```

`mergeOnLogin` already calls `flushPending` at its tail and is idempotent
(upserts, per-UUID seed checks), so calling `flushPending` again up front is
safe. `getAll` is already imported in `sync.js`.

### 2. App orchestration — `src/App.jsx`

- **Extract `hydrateMerged(merged)`** from the existing inline
  `mergeOnLogin(user).then(...)` callback. It performs the five existing steps:
  `queueApi.hydrate`, `hydrateDone`, `hydrateChains`, `setShowCount`, and
  advancing `prevDoneLength.current` to the merged done length (suppresses a
  spurious streak increment / celebration burst). Both the login effect and
  `onRefresh` call it.
- **Add refresh state + handler:**

```js
const [refreshing, setRefreshing] = useState(false)

async function onRefresh() {
  if (refreshing || !userIdRef.current) return
  setRefreshing(true)
  const startedAt = performance.now()
  try {
    hydrateMerged(await refresh(user))
  } finally {
    // Minimum visible duration so the themed mark reads as intentional, not a flash.
    const elapsed = performance.now() - startedAt
    const wait = Math.max(0, 500 - elapsed)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    setRefreshing(false)
  }
}
```

- **Pass down to `Queue`:** `onRefresh`, `refreshing`, and `isSignedIn`
  (`Boolean(user)`).

### 3. Desktop button — `src/components/Queue.jsx`

- The header row currently holds only `AuthHeader`, left-aligned. Change it to
  `justifyContent: 'space-between'` and add a circular icon button on the right.
- **Resting state:** a gold circular-arrow (↻) glyph, styled like the existing
  pill affordances (surface bg, emerald hairline border, ~36px).
- **Refreshing state:** swap the glyph for the breathing نية mark
  (`niyetBreath` animation), button disabled.
- **Visibility:** render only when `isSignedIn && window.matchMedia('(pointer:
  fine)').matches`. Evaluate the media query once (component mount) — pointer
  type does not change within a session for practical purposes.

### 4. Pull-to-refresh — new `src/hooks/usePullToRefresh.js` + indicator

**Hook** `usePullToRefresh({ onRefresh, enabled })`:
- Attaches passive `touchstart` / `touchmove` / `touchend` listeners on
  `window` (added/removed based on `enabled`).
- On `touchstart`, records `startY` only when `window.scrollY <= 0`.
- On `touchmove` while at the top, computes `pullDistance = clamp(currentY -
  startY, 0, MAX)` with a resistance factor so the pull feels rubber-banded.
  Arms when `pullDistance >= THRESHOLD` (~70px).
- On `touchend`: if armed, calls `onRefresh()`; resets `pullDistance` to 0.
- Returns `{ pullDistance, armed }`.
- **Pure threshold/arming logic is extracted** into a small testable function
  (e.g. `computePull(startY, currentY, max)` and an `isArmed(distance,
  threshold)`), so it can be unit-tested without simulating touch events.

**Indicator:** a `position: fixed`, top-center element rendered by `Queue` when
pull-to-refresh is enabled. It translates/scales/fades the نية glyph with
`pullDistance` (revealing as you pull); while `refreshing` is true, it shows the
breathing mark with the radial-glow treatment from `LoadingScreen`. Hidden at
`pullDistance === 0 && !refreshing`.

**Visibility / enablement:** enabled only when `isSignedIn && window.matchMedia(
'(pointer: coarse)').matches`.

## Edge cases & error handling

- **Concurrent triggers:** the `refreshing` flag blocks re-entry from both the
  button and pull-to-refresh; `flushPending` has its own module-level mutex.
- **Offline / unreachable:** `flushPending` swallows errors (re-queues), and
  `mergeOnLogin` returns local state untouched — `onRefresh` simply ends the
  indicator. No error dialog, consistent with the app's silent-degrade pattern.
- **Flash prevention:** minimum ~500ms indicator duration.
- **No spurious streak burst:** `hydrateMerged` advances `prevDoneLength`, same
  as the login path.

## Testing

- `src/lib/sync.test.js`: add a case asserting `refresh(user)` invokes
  `flushPending` **before** the merge's remote pull (mock supabase; assert call
  order). Add a case asserting `refresh()` with no user returns local state and
  makes no network calls.
- `usePullToRefresh`: unit-test the extracted `computePull` /`isArmed` logic
  (resistance clamp, threshold arming) — no touch simulation needed.

## Out of scope (YAGNI)

- Realtime / live subscriptions (the user explicitly asked for manual refresh).
- Success/error toasts beyond the indicator.
- Pull-to-refresh on non-touch (desktop uses the button) and a desktop button on
  touch devices (touch uses the gesture).

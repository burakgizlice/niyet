---
title: "fix: Stop refresh resurrecting completed tasks (done-log tombstone)"
type: fix
status: active
created: 2026-05-30
depth: standard
---

# fix: Stop refresh resurrecting completed tasks

> Note: paths below use the post-flatten layout (`src/...`, was `niyet/src/...`).

## Problem Frame

A signed-in user completes a task on one device, then on refresh (or on the
other device's next sync) the completed task **reappears in the active queue** —
now present in *both* the queue and the done log, effectively un-completing the
work.

The user reported it as "I complete tasks on mobile, then when I refresh I
receive the tasks I've just completed from desktop." The flush-then-pull order in
`refresh()` is **not** the defect — it correctly lands this device's own deletes
before pulling. The defect is in the merge.

## Root Cause

The three merge helpers in `src/lib/sync.js` — `mergeQueue`, `mergeItems`,
`mergeChains` — are **grow-only union merges with no deletion semantics**. A
deletion propagates to the backend as an *absence*, never as a *tombstone*.
Combined with the **orphan-push** step in `performMerge`, this resurrects
completed items across devices:

1. Mobile completes task **X** → local queue drops X, local done gains X (the
   done item reuses the queue id — `src/hooks/useQueue.js:98`). Mirrors fire:
   `DELETE queue_items X`, `upsert done_items X`. Remote queue no longer has X.
2. Desktop is stale — still holds X in its local queue, not in its local done.
   Its next `mergeOnLogin`/`refresh` sees X missing from the remote queue and
   classifies it as a *"local orphan remote never saw"* → **re-uploads X to the
   remote queue.** It also keeps X in its own merged queue.
3. Mobile refreshes → pulls the resurrected X back into the queue. X is now in
   both queue and done.

### The fix-lever

A completed task's done item **reuses the queue item's `id`**
(`src/hooks/useQueue.js:98`), and every newly-queued item gets a fresh
`crypto.randomUUID()` (`appendSteps`, `src/hooks/useQueue.js:122`). Ids are
therefore **never reused** for new queue items, so a queue id present in the done
log *provably* identifies a completed item. The done log is a reliable **natural
tombstone** for the queue: any queue id in the done set must not survive in the
merged queue, and must not be pushed back up as an orphan.

---

## Scope

**In scope:** Completion-resurrection only — the reported symptom — fixed
cross-device with no backend schema change, by treating the done log as a
tombstone for the queue merge and the queue orphan-push.

**Out of scope (this fix):** Resurrection of tasks that are *deleted without
being completed* (`removeTask` swipe-remove, `clearQueue` / "Sıfırla") and chain
deletes. These leave no done record, so they are a different mechanism that
requires real tombstones — see Deferred Follow-Up Work.

---

## Key Technical Decisions

1. **Done-log as the tombstone source, not a new table.** Leverages the existing
   id-reuse invariant. Zero migration, RLS, or GC. Directly and fully kills the
   reported completion-resurrection.

2. **Exclude tombstoned ids inside `mergeQueue`, via an optional `excludeIds`
   param** — rather than filtering after the call. Keeps the queue-merge logic
   cohesive and lets the exclusion be covered by a pure unit test. The default
   empty set preserves every existing call site and test unchanged.

3. **Also filter the queue orphan-push by the done set** in `performMerge`. This
   is what stops the *stale device* (step 2 above) from re-uploading a completed
   item.

4. **Keep flush-before-pull in `refresh()` unchanged.** It is correct.

5. **Tombstone set = union of local done ids ∪ remote done ids**, built once in
   `performMerge` after the remote pull.

---

## Implementation Units

### U1. Teach `mergeQueue` to drop tombstoned ids

**Goal:** Make `mergeQueue` exclude any item whose id is in a supplied tombstone
set, as a pure, unit-tested transformation.

**Dependencies:** none.

**Files:**
- `src/lib/sync.js` (modify `mergeQueue`)
- `src/lib/sync.test.js` (extend `describe('mergeQueue')`)

**Approach:** Add optional third param `excludeIds = new Set()`. Drop any unioned
entry whose id is in `excludeIds` before sort/`reindexPositions`. Surviving items
reindex to `0..n-1`. Update JSDoc.

**Test scenarios:**
- Default call (no `excludeIds`) behaves exactly as today (backward-compat).
- Id in `excludeIds` removed when in local only / remote only / both.
- After exclusion, survivors reindex to contiguous `0..n-1`.
- Empty `excludeIds` is a no-op; an id matching nothing drops nothing.

**Verification:** `npm test` — extended `mergeQueue` suite green.

---

### U2. Apply the done-log tombstone in `performMerge`

**Goal:** Build the done-id tombstone set and use it to exclude completed items
from the merged queue and from the queue orphan-push.

**Dependencies:** U1.

**Files:**
- `src/lib/sync.js` (modify `performMerge`)
- `src/lib/sync.refresh.test.js` (resurrection guard via the Supabase mock)

**Approach:**
- After the remote pull, build
  `doneIds = new Set([...local.done.map(i=>i.id), ...remoteDone.map(i=>i.id)])`.
- `queueOrphans = local.queue.filter(i => !remoteQueueIds.has(i.id) && !doneIds.has(i.id))`.
- `mergeQueue(local.queue, remoteQueue, doneIds)`.
- Leave done/chain merges, orphan-pushes, show_count, setAll, flushPending, and
  `refresh()` ordering untouched.

**Test scenarios:**
- **Resurrection guard (core):** local queue has X, remote queue empty, remote
  done has X → result queue lacks X AND no `queue_items.upsert` carrying X.
  (Requires extending the mock to return a queue row + matching done row.)
- **Active item preserved:** local queue has Y (not in done), remote empty →
  Y survives (guards against over-exclusion).
- Existing flush-before-merge ordering test still passes.
- Anonymous / no-id paths still make no network calls.

**Verification:** `npm test` — new guard passes; existing suites green. Manual
cross-device: complete on phone, refresh phone + reload desktop → task stays only
in done on both.

---

## Deferred to Follow-Up Work

**Full tombstone table for non-completion deletes.** Tasks removed without
completing (`removeTask`, `clearQueue`) and deleted chains leave no done record,
so the done-log tombstone cannot cover them. A complete fix is a backend
`deletions` table (`id`, `type`, `deleted_at`) + RLS, every delete writing a
tombstone, merges excluding any id whose tombstone is newer than its
create/update, plus light GC. Tracked, not built in this plan.

---

## System-Wide Impact

- **Surface touched:** `src/lib/sync.js` only (one helper + one internal
  function). No component, hook, storage, or schema change.
- **Behavioral change:** the merged queue can be *smaller* than the naive union
  when completed ids are present — the intended correction. No effect on
  anonymous users or when the done set is empty (default `excludeIds` no-op).
- **Risk:** low. Exclusion is gated on the never-reused-id invariant; backward
  compatibility for `mergeQueue` is locked by an explicit test.

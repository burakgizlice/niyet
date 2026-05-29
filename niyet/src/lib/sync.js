// Block 18: local-first sync overlay (Approach A — merge-on-login).
//
// localStorage stays the source of truth (Block 14). When a user is signed in,
// every mutation writes localStorage first, then mirrors to Supabase (or queues
// the op when offline). On login, mergeOnLogin() three-way-merges local +
// remote and writes the result back. Anonymous users (userId === null) never
// touch the network — only localStorage is written.
//
// Shape impedance handled here, not in storage.js:
//   - done items are { id, text, completedAt(epoch ms) } locally but
//     done_items.completed_at is timestamptz — convert on push/pull.
//   - local queue items carry no created_at; queue_items.created_at defaults to
//     now() server-side, so pushes omit it.

import { supabase } from './supabase'
import { DEFAULT_CHAINS } from '../data/defaultChains'
import { KEYS, getAll, setAll } from './storage'

// --------------------------------------------------------------------------
// Pure merge helpers (no Supabase dependency — unit-tested in sync.test.js)
// --------------------------------------------------------------------------

/**
 * Normalise any timestamp shape to a comparable number (epoch ms). Accepts ISO
 * strings (Supabase timestamptz), epoch-ms numbers (local completedAt), or
 * absent (local queue items) → 0 so undated items sort first/stable.
 * @param {string | number | undefined | null} value
 * @returns {number}
 */
function toMillis(value) {
  if (value == null) return 0
  if (typeof value === 'number') return value
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

/**
 * Reassign `position` from array order (0..n-1), leaving every other field
 * untouched. The canonical ordering step after any queue/chain merge.
 * @template {{ position?: number }} T
 * @param {T[]} items
 * @returns {T[]}
 */
export function reindexPositions(items) {
  return items.map((item, i) => ({ ...item, position: i }))
}

/**
 * Dedupe two item lists by identity (C2: keyFn returns item.id), remote winning
 * on collision, sorted ascending by completion/creation time. Used for the done
 * log — a chronological list keyed by stable UUID. Items whose key is falsy fall
 * back to a synthesized text+time key (legacy pre-UUID rows, Q1 fallback).
 * @template {object} T
 * @param {T[]} local
 * @param {T[]} remote
 * @param {(item: T) => string} keyFn
 * @returns {T[]}
 */
export function mergeItems(local, remote, keyFn) {
  const byKey = new Map()
  const identity = (item) =>
    keyFn(item) ||
    `${item.text ?? ''}|${item.completedAt ?? item.completed_at ?? item.created_at ?? ''}`
  // Insert local first, then let remote overwrite on collision (remote wins).
  for (const item of local) byKey.set(identity(item), item)
  for (const item of remote) byKey.set(identity(item), item)
  return [...byKey.values()].sort((a, b) => {
    const ta = toMillis(a.completedAt ?? a.completed_at ?? a.created_at)
    const tb = toMillis(b.completedAt ?? b.completed_at ?? b.created_at)
    return ta - tb
  })
}

/**
 * Merge chains by id (C2). On collision the higher updated_at wins (C6) — a
 * chain edited on another device beats a stale local copy. Result is ordered by
 * each surviving chain's original position (name as a stable tiebreak) and then
 * position-reindexed 0..n-1. Chains without updated_at are treated as oldest.
 * @param {import('../data/defaultChains').Chain[]} local
 * @param {import('../data/defaultChains').Chain[]} remote
 * @returns {import('../data/defaultChains').Chain[]}
 */
export function mergeChains(local, remote) {
  const byId = new Map()
  for (const chain of [...local, ...remote]) {
    const existing = byId.get(chain.id)
    if (!existing) {
      byId.set(chain.id, chain)
      continue
    }
    const winner = toMillis(chain.updated_at) >= toMillis(existing.updated_at) ? chain : existing
    byId.set(chain.id, winner)
  }
  const ordered = [...byId.values()].sort((a, b) => {
    const pa = a.position ?? 0
    const pb = b.position ?? 0
    if (pa !== pb) return pa - pb
    return (a.name ?? '').localeCompare(b.name ?? '')
  })
  return reindexPositions(ordered)
}

/**
 * Merge queue items by id (C2). Unlike the done log, the queue is a positional
 * list: on a duplicate id the lower position is kept (18.5), then the union is
 * ordered by position and reindexed 0..n-1. Kept separate from mergeItems
 * because the queue's identity is order, not completion time.
 * @param {{ id: string, text: string, position?: number }[]} local
 * @param {{ id: string, text: string, position?: number }[]} remote
 * @returns {{ id: string, text: string, position: number }[]}
 */
export function mergeQueue(local, remote) {
  const byId = new Map()
  for (const item of [...local, ...remote]) {
    const existing = byId.get(item.id)
    if (!existing) {
      byId.set(item.id, item)
      continue
    }
    const winner = (item.position ?? 0) <= (existing.position ?? 0) ? item : existing
    byId.set(item.id, winner)
  }
  const ordered = [...byId.values()].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return reindexPositions(ordered).map(({ id, text, position }) => ({ id, text, position }))
}

// --------------------------------------------------------------------------
// Pending queue — offline-authed ops, flushed FIFO on reconnect
// --------------------------------------------------------------------------

/** @returns {import('./storage').PendingOp[]} */
function readPending() {
  try {
    const raw = localStorage.getItem(KEYS.PENDING)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePending(ops) {
  try {
    localStorage.setItem(KEYS.PENDING, JSON.stringify(ops))
  } catch (e) {
    console.warn('[niyet/sync] pending write failed:', e)
  }
}

/**
 * Append an op to the pending queue. Payload is stored already in its Supabase
 * row shape (the wrappers convert before enqueueing), so flush just sends it.
 * @param {{ type: import('./storage').PendingOp['type'], payload: object }} op
 */
export function enqueuePending(op) {
  const ops = readPending()
  ops.push({ id: crypto.randomUUID(), type: op.type, payload: op.payload, createdAt: new Date().toISOString() })
  writePending(ops)
}

// Run one pending op against Supabase. Throws on Supabase error so flushPending
// can stop and preserve the remaining (order-dependent) ops. done_clear runs a
// full DELETE first; any done_upsert enqueued after it in the same FIFO run then
// re-inserts only the post-clear completions (18.14).
async function executePendingOp(op) {
  const { type, payload } = op
  let result
  switch (type) {
    case 'queue_upsert':
      result = await supabase.from('queue_items').upsert(payload, { onConflict: 'id' })
      break
    case 'queue_delete':
      result = await supabase
        .from('queue_items')
        .delete()
        .eq('id', payload.id)
        .eq('user_id', payload.user_id)
      break
    case 'chain_upsert':
      result = await supabase.from('chains').upsert(payload, { onConflict: 'id' })
      break
    case 'chain_delete':
      result = await supabase
        .from('chains')
        .delete()
        .eq('id', payload.id)
        .eq('user_id', payload.user_id)
      break
    case 'done_upsert':
      result = await supabase.from('done_items').upsert(payload, { onConflict: 'id' })
      break
    case 'done_clear':
      result = await supabase.from('done_items').delete().eq('user_id', payload.user_id)
      break
    case 'show_count_upsert':
      result = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
      break
    default:
      console.warn('[niyet/sync] unknown pending op type, dropping:', type)
      return
  }
  if (result?.error) throw result.error
}

// Module-level mutex: the 'online' listener and mergeOnLogin can both trigger a
// flush; running two concurrently would double-send and corrupt FIFO ordering.
let flushing = false

/**
 * Drain the pending queue in FIFO order against Supabase. Removes each op only
 * after it succeeds; stops at the first error, leaving the rest queued for the
 * next reconnect (preserving order). Safe to call repeatedly — upserts are
 * idempotent and the mutex prevents overlap.
 * @param {string} userId
 */
export async function flushPending(userId) {
  if (!userId || flushing) return
  flushing = true
  try {
    let ops = readPending()
    while (ops.length > 0) {
      try {
        await executePendingOp(ops[0])
      } catch (e) {
        console.warn('[niyet/sync] flush stopped on error, will retry on reconnect:', e)
        break
      }
      ops = ops.slice(1)
      writePending(ops)
    }
  } finally {
    flushing = false
  }
}

// Guard so the 'online' listener is registered exactly once across re-renders.
let offlineListenerBound = false

/**
 * Register a one-time window 'online' handler that flushes the pending queue on
 * reconnect. getUserId is read at fire time (not bind time) so it always sees
 * the current user — pass a closure over the latest auth state.
 * @param {() => string | null} getUserId
 */
export function bootstrapOfflineListener(getUserId) {
  if (offlineListenerBound) return
  offlineListenerBound = true
  window.addEventListener('online', () => {
    const userId = getUserId()
    if (userId) flushPending(userId)
  })
}

// --------------------------------------------------------------------------
// Shape mappers — Supabase row <-> localStorage shape
// --------------------------------------------------------------------------

// queue_items row -> local queue shape (drop user_id/created_at; mergeQueue
// reindexes position anyway).
const remoteQueueToLocal = (row) => ({ id: row.id, text: row.text, position: row.position })

// done_items row (completed_at ISO) -> local done shape (completedAt epoch ms).
const remoteDoneToLocal = (row) => ({
  id: row.id,
  text: row.text,
  completedAt: toMillis(row.completed_at),
  ...(row.chain_id ? { chain_id: row.chain_id } : {}),
})

// chains row -> local chain shape (drop user_id; keep updated_at as merge
// tiebreaker for the next login).
const remoteChainToLocal = (row) => ({
  id: row.id,
  name: row.name,
  emoji: row.emoji,
  steps: row.steps ?? [],
  position: row.position,
  is_default: row.is_default,
  ...(row.created_at ? { created_at: row.created_at } : {}),
  ...(row.updated_at ? { updated_at: row.updated_at } : {}),
})

// local done shape -> done_items row (completedAt ms -> completed_at ISO).
const localDoneToRemote = (userId, item) => ({
  id: item.id,
  user_id: userId,
  text: item.text,
  completed_at: new Date(item.completedAt ?? Date.now()).toISOString(),
  chain_id: item.chain_id ?? null,
})

// --------------------------------------------------------------------------
// Seeding + merge-on-login
// --------------------------------------------------------------------------

/**
 * Insert the 7 default chains for a user when their fixed UUIDs (C1) are absent
 * remotely. Idempotent two ways: a localStorage fast-path skip once seeded for
 * this user, and a per-UUID remote check so a partial seed only inserts the
 * missing ones. Never throws — a seeding failure must not abort mergeOnLogin.
 * @param {string} userId
 */
export async function seedDefaultChains(userId) {
  if (!userId) return
  if (safeReadSeeded() === userId) return
  try {
    const { data: remote, error } = await supabase.from('chains').select('id')
    if (error) throw error
    const remoteIds = new Set((remote ?? []).map((r) => r.id))
    const missing = DEFAULT_CHAINS.filter((c) => !remoteIds.has(c.id))
    if (missing.length > 0) {
      const rows = missing.map((c) => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        emoji: c.emoji,
        steps: c.steps,
        position: c.position,
        is_default: true,
      }))
      const { error: insertError } = await supabase.from('chains').insert(rows)
      if (insertError) throw insertError
    }
    safeWriteSeeded(userId)
  } catch (e) {
    console.warn('[niyet/sync] seedDefaultChains failed (will retry next login):', e)
  }
}

function safeReadSeeded() {
  try {
    return localStorage.getItem(KEYS.SEEDED)
  } catch {
    return null
  }
}

function safeWriteSeeded(userId) {
  try {
    localStorage.setItem(KEYS.SEEDED, userId)
  } catch {
    /* non-fatal: seeding re-checks remote next login */
  }
}

/**
 * The core merge-on-login sequence. Reads local state, seeds defaults on first
 * login, pulls remote, pushes local orphans up, three-way-merges, writes the
 * result back to localStorage, and flushes any pending ops. Returns the merged
 * state (in localStorage shapes) so App.jsx can hydrate React state.
 *
 * Degrades safely: if the remote round-trip fails (offline / unreachable), the
 * local state is returned untouched so no data is lost and the next reconnect
 * retries via the pending queue.
 * @param {{ id: string }} user
 * @returns {Promise<{ queue: object[], done: object[], chains: object[], show_count: number }>}
 */
export async function mergeOnLogin(user) {
  const userId = user?.id
  const local = getAll()
  if (!userId) return local

  await seedDefaultChains(userId)

  let remoteQueue
  let remoteDone
  let remoteChains
  let remoteProfile
  try {
    const [q, d, c, p] = await Promise.all([
      supabase.from('queue_items').select('*'),
      supabase.from('done_items').select('*'),
      supabase.from('chains').select('*'),
      supabase.from('profiles').select('show_count').eq('id', userId).maybeSingle(),
    ])
    if (q.error) throw q.error
    if (d.error) throw d.error
    if (c.error) throw c.error
    if (p.error) throw p.error
    remoteQueue = (q.data ?? []).map(remoteQueueToLocal)
    remoteDone = (d.data ?? []).map(remoteDoneToLocal)
    remoteChains = (c.data ?? []).map(remoteChainToLocal)
    remoteProfile = p.data
  } catch (e) {
    console.warn('[niyet/sync] mergeOnLogin remote fetch failed, keeping local state:', e)
    return local
  }

  // Push local orphans (items remote has never seen) so the other device pulls
  // them. Upsert keeps it idempotent if a retry double-fires.
  const remoteQueueIds = new Set(remoteQueue.map((i) => i.id))
  const remoteDoneIds = new Set(remoteDone.map((i) => i.id))
  const remoteChainIds = new Set(remoteChains.map((c) => c.id))
  const queueOrphans = local.queue.filter((i) => !remoteQueueIds.has(i.id))
  const doneOrphans = local.done.filter((i) => !remoteDoneIds.has(i.id))
  const chainOrphans = local.chains.filter((c) => !remoteChainIds.has(c.id))
  try {
    if (queueOrphans.length > 0) {
      await supabase
        .from('queue_items')
        .upsert(
          queueOrphans.map((i) => ({ id: i.id, user_id: userId, text: i.text, position: i.position })),
          { onConflict: 'id' },
        )
    }
    if (doneOrphans.length > 0) {
      await supabase
        .from('done_items')
        .upsert(doneOrphans.map((i) => localDoneToRemote(userId, i)), { onConflict: 'id' })
    }
    if (chainOrphans.length > 0) {
      await supabase
        .from('chains')
        .upsert(
          chainOrphans.map((c) => ({
            id: c.id,
            user_id: userId,
            name: c.name,
            emoji: c.emoji,
            steps: c.steps,
            position: c.position,
            is_default: c.is_default ?? false,
          })),
          { onConflict: 'id' },
        )
    }
  } catch (e) {
    console.warn('[niyet/sync] pushing local orphans failed (merge still proceeds):', e)
  }

  const mergedQueue = mergeQueue(local.queue, remoteQueue)
  const mergedDone = mergeItems(local.done, remoteDone, (i) => i.id)
  const mergedChains = mergeChains(local.chains, remoteChains)

  // show_count: remote profile wins when present (last-write-wins, C-decision);
  // otherwise seed the profile from the local value.
  let showCount = local.show_count
  if (remoteProfile && typeof remoteProfile.show_count === 'number') {
    showCount = remoteProfile.show_count
  } else {
    await supabase.from('profiles').upsert({ id: userId, show_count: local.show_count }, { onConflict: 'id' })
  }

  const merged = { queue: mergedQueue, done: mergedDone, chains: mergedChains, show_count: showCount }
  setAll(merged)
  await flushPending(userId)
  return merged
}

// --------------------------------------------------------------------------
// Optimistic write wrappers (remote-mirror half)
// --------------------------------------------------------------------------
//
// Block 14 keeps localStorage as the single source of truth — only storage.js
// writes it. So these wrappers do NOT write localStorage; the calling hook has
// already persisted locally and updated React state synchronously. The wrapper
// mirrors that change to Supabase, or enqueues it when offline / on error. The
// local-first guarantee holds: the local write happens before this runs.

// Mirror one change: enqueue when offline, otherwise run the Supabase call and
// fall back to the pending queue on error (optimistic — never reverts local).
async function mirror(op, call) {
  if (!navigator.onLine) {
    enqueuePending(op)
    return
  }
  try {
    const { error } = await call()
    if (error) enqueuePending(op)
  } catch {
    enqueuePending(op)
  }
}

/**
 * @param {string | null} userId
 * @param {{ id: string, text: string, position: number }} item
 */
export async function syncQueueAdd(userId, item) {
  if (!userId) return
  const payload = { id: item.id, user_id: userId, text: item.text, position: item.position }
  await mirror({ type: 'queue_upsert', payload }, () =>
    supabase.from('queue_items').upsert(payload, { onConflict: 'id' }),
  )
}

/**
 * @param {string | null} userId
 * @param {string} itemId
 */
export async function syncQueueRemove(userId, itemId) {
  if (!userId) return
  const payload = { id: itemId, user_id: userId }
  await mirror({ type: 'queue_delete', payload }, () =>
    supabase.from('queue_items').delete().eq('id', itemId).eq('user_id', userId),
  )
}

/**
 * @param {string | null} userId
 * @param {{ id: string, position: number }[]} orderedItems
 */
export async function syncQueueReorder(userId, orderedItems) {
  if (!userId) return
  const rows = orderedItems.map((i) => ({ id: i.id, user_id: userId, position: i.position }))
  if (!navigator.onLine) {
    // Enqueue one upsert per item so FIFO order is preserved on flush.
    for (const row of rows) enqueuePending({ type: 'queue_upsert', payload: row })
    return
  }
  try {
    const { error } = await supabase.from('queue_items').upsert(rows, { onConflict: 'id' })
    if (error) for (const row of rows) enqueuePending({ type: 'queue_upsert', payload: row })
  } catch {
    for (const row of rows) enqueuePending({ type: 'queue_upsert', payload: row })
  }
}

/**
 * @param {string | null} userId
 * @param {{ id: string, text: string, completedAt: number, chain_id?: string }} doneItem
 */
export async function syncDoneAdd(userId, doneItem) {
  if (!userId) return
  const payload = localDoneToRemote(userId, doneItem)
  await mirror({ type: 'done_upsert', payload }, () =>
    supabase.from('done_items').upsert(payload, { onConflict: 'id' }),
  )
}

/** @param {string | null} userId */
export async function syncDoneClear(userId) {
  if (!userId) return
  const payload = { user_id: userId }
  await mirror({ type: 'done_clear', payload }, () =>
    supabase.from('done_items').delete().eq('user_id', userId),
  )
}

/**
 * @param {string | null} userId
 * @param {import('../data/defaultChains').Chain} chain
 */
export async function syncChainUpsert(userId, chain) {
  if (!userId) return
  const payload = {
    id: chain.id,
    user_id: userId,
    name: chain.name,
    emoji: chain.emoji,
    steps: chain.steps,
    position: chain.position,
    is_default: chain.is_default ?? false,
  }
  await mirror({ type: 'chain_upsert', payload }, () =>
    supabase.from('chains').upsert(payload, { onConflict: 'id' }),
  )
}

/**
 * @param {string | null} userId
 * @param {string} chainId
 */
export async function syncChainDelete(userId, chainId) {
  if (!userId) return
  const payload = { id: chainId, user_id: userId }
  await mirror({ type: 'chain_delete', payload }, () =>
    supabase.from('chains').delete().eq('id', chainId).eq('user_id', userId),
  )
}

/**
 * @param {string | null} userId
 * @param {number} count
 */
export async function syncShowCount(userId, count) {
  if (!userId) return
  const payload = { id: userId, show_count: count }
  await mirror({ type: 'show_count_upsert', payload }, () =>
    supabase.from('profiles').upsert(payload, { onConflict: 'id' }),
  )
}

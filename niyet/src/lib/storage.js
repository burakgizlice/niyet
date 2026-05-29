// Block 14: localStorage source-of-truth layer.
//
// Every localStorage read/write in the app routes through this module — no
// component or hook touches localStorage directly. Keys are centralised in the
// (unexported) KEYS map so a rename stays in one place, and all access goes
// through safeGet/safeSet so corrupt JSON or a full quota can never crash the
// UI. Persistence is anonymous and offline-first; Supabase sync (Blocks 16-18)
// layers on top of this, it does not replace it.

import { DEFAULT_CHAINS } from '../data/defaultChains'

/** Bumped when the on-disk shape changes; drives runMigrations(). */
export const STORAGE_VERSION = 1

// Exported (Block 18) so lib/sync.js shares the exact key strings — the pending
// queue and seed guard are sync-only keys, the rest are the Block 14 data store.
export const KEYS = {
  VERSION: 'niyet_storage_version',
  QUEUE: 'niyet_queue',
  DONE: 'niyet_done',
  CHAINS: 'niyet_chains',
  SHOW_COUNT: 'niyet_show_count',
  PENDING: 'niyet_pending',
  SEEDED: 'niyet_seeded_uid',
}

const VALID_SHOW_COUNTS = [1, 2, 3, 5]

/**
 * Read and JSON-parse a key, returning `fallback` when the key is absent or the
 * stored value is unparseable (e.g. a browser extension stomped it). Never throws.
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

/**
 * JSON-serialise and write a value. Swallows quota-exceeded and other write
 * errors with a warning so the UI stays functional instead of crashing.
 * @param {string} key
 * @param {unknown} value
 */
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('[niyet/storage] write failed:', key, e)
  }
}

/** @returns {number} stored schema version, or 0 on a fresh store. */
export function readStorageVersion() {
  return safeGet(KEYS.VERSION, 0)
}

/** @param {number} v */
export function writeStorageVersion(v) {
  safeSet(KEYS.VERSION, v)
}

/**
 * Bring the store up to STORAGE_VERSION. A no-op at v1 beyond stamping the
 * version on first run; future versions branch on the stored value before
 * writing the new one. Call once at app boot, before any hook initialises.
 */
export function runMigrations() {
  const current = readStorageVersion()
  if (current === STORAGE_VERSION) return
  // future: if (current < 2) migrateV1toV2()
  writeStorageVersion(STORAGE_VERSION)
}

/**
 * @typedef {{ id: string, text: string, position: number }} StoredQueueItem
 * @returns {StoredQueueItem[]} the queue, or [] when absent/corrupt.
 */
export function readQueue() {
  return safeGet(KEYS.QUEUE, [])
}

/**
 * Persist the queue, re-deriving `position` from array order so it always
 * matches the rendered sequence — callers never manage position by hand.
 * @param {{ id: string, text: string }[]} items
 */
export function writeQueue(items) {
  safeSet(
    KEYS.QUEUE,
    items.map((item, i) => ({ id: item.id, text: item.text, position: i })),
  )
}

/**
 * @typedef {{ id: string, text: string, completedAt: number }} StoredDoneItem
 * @returns {StoredDoneItem[]} the done log, or [] when absent/corrupt.
 */
export function readDone() {
  return safeGet(KEYS.DONE, [])
}

/** @param {StoredDoneItem[]} items */
export function writeDone(items) {
  safeSet(KEYS.DONE, items)
}

/** Empty the done log. Backs the 'Temizle' button (which clears log + streak). */
export function clearDone() {
  safeSet(KEYS.DONE, [])
}

/**
 * Read chains. Returns `null` (not []) when the key is absent so callers can
 * tell "never seeded" from "user deleted every chain" — only seedDefaultChains-
 * IfAbsent and useChains init care about that distinction.
 * @returns {import('../data/defaultChains').Chain[] | null}
 */
export function readChains() {
  return safeGet(KEYS.CHAINS, null)
}

/**
 * Persist chains, re-deriving `position` from array order (same contract as
 * writeQueue).
 * @param {import('../data/defaultChains').Chain[]} chains
 */
export function writeChains(chains) {
  safeSet(
    KEYS.CHAINS,
    chains.map((c, i) => ({ ...c, position: i })),
  )
}

/**
 * Read show_count, guarding against corrupt/unexpected values (only 1/2/3/5 are
 * valid) by falling back to 1.
 * @returns {1 | 2 | 3 | 5}
 */
export function readShowCount() {
  const v = safeGet(KEYS.SHOW_COUNT, 1)
  return VALID_SHOW_COUNTS.includes(v) ? v : 1
}

/** @param {1 | 2 | 3 | 5} n */
export function writeShowCount(n) {
  safeSet(KEYS.SHOW_COUNT, n)
}

/**
 * Session reset for 'Temizle': clears queue, done log, and show_count, but
 * deliberately PRESERVES chains — chains are saved rituals, not session data
 * (PRD §3.5). A true factory reset (incl. chains) belongs to the sign-out flow
 * in a later block, not here.
 */
export function clearAll() {
  safeSet(KEYS.QUEUE, [])
  safeSet(KEYS.DONE, [])
  safeSet(KEYS.SHOW_COUNT, 1)
}

/**
 * First-run seed: write the 7 default chains when none have ever been stored.
 * Idempotent — bails out when chains already exist (including an empty array,
 * which means the user deliberately deleted them all). The spread copies the
 * frozen DEFAULT_CHAINS so the constant is never mutated.
 */
export function seedDefaultChainsIfAbsent() {
  const existing = readChains()
  if (existing !== null && existing.length > 0) return
  writeChains([...DEFAULT_CHAINS])
}

/**
 * Block 18: snapshot the whole data store for sync.mergeOnLogin. Returns the
 * four data slices in their localStorage shapes (done uses epoch-ms completedAt;
 * queue items carry no created_at) — sync.js does the Supabase shape conversion.
 * chains falls back to [] (not null) since by merge time defaults are seeded.
 * @returns {{ queue: StoredQueueItem[], done: StoredDoneItem[], chains: import('../data/defaultChains').Chain[], show_count: number }}
 */
export function getAll() {
  return {
    queue: readQueue(),
    done: readDone(),
    chains: readChains() ?? [],
    show_count: readShowCount(),
  }
}

/**
 * Block 18: atomically replace all four data slices with the merged result of a
 * login. Reuses the per-slice writers so the position-from-array-order contract
 * (writeQueue/writeChains) and show_count validation stay enforced. Each field
 * is written only when provided, so a partial merged object never blanks a slice.
 * @param {{ queue?: StoredQueueItem[], done?: StoredDoneItem[], chains?: import('../data/defaultChains').Chain[], show_count?: number }} state
 */
export function setAll({ queue, done, chains, show_count } = {}) {
  if (queue !== undefined) writeQueue(queue)
  if (done !== undefined) writeDone(done)
  if (chains !== undefined) writeChains(chains)
  if (show_count !== undefined) writeShowCount(show_count)
}

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Record every Supabase operation in call order so we can assert the
// flush-before-merge sequencing without a live backend. `state` lets a test seed
// per-table select results and inspect captured upsert payloads (Block 19 fix).
// Shared via vi.hoisted because the vi.mock factory is hoisted above the imports.
const { calls, state } = vi.hoisted(() => ({
  calls: [],
  state: { selectData: {}, profile: null, upserts: [] },
}))

vi.mock('./supabase', () => {
  const makeBuilder = (table) => {
    const builder = {
      select: () => {
        calls.push(`${table}.select`)
        return builder
      },
      insert: () => {
        calls.push(`${table}.insert`)
        return Promise.resolve({ data: null, error: null })
      },
      upsert: (payload) => {
        calls.push(`${table}.upsert`)
        state.upserts.push({ table, payload })
        return Promise.resolve({ data: null, error: null })
      },
      delete: () => {
        calls.push(`${table}.delete`)
        return builder
      },
      eq: () => builder,
      maybeSingle: () => Promise.resolve({ data: state.profile, error: null }),
      // Thenable so `await builder` (selects / chained deletes) resolves to this
      // table's seeded rows (default empty).
      then: (resolve) => resolve({ data: state.selectData[table] ?? [], error: null }),
    }
    return builder
  }
  return { supabase: { from: (table) => makeBuilder(table) } }
})

import { refresh } from './sync'
import { KEYS } from './storage'

beforeEach(() => {
  calls.length = 0
  state.selectData = {}
  state.profile = null
  state.upserts.length = 0
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
})

describe('refresh', () => {
  it('returns local state and makes no network calls for an anonymous user', async () => {
    const result = await refresh(null)
    expect(calls).toEqual([])
    expect(result).toEqual({ queue: [], done: [], chains: [], show_count: 1 })
  })

  it('makes no network calls when the user has no id', async () => {
    await refresh({})
    expect(calls).toEqual([])
  })

  it('flushes pending ops before pulling remote state', async () => {
    localStorage.setItem(
      KEYS.PENDING,
      JSON.stringify([
        {
          id: 'op1',
          type: 'queue_delete',
          payload: { id: 'q1', user_id: 'u1' },
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]),
    )

    await refresh({ id: 'u1' })

    // The flush's DELETE must precede the merge's first remote read (the chains
    // lookup in seedDefaultChains, which opens mergeOnLogin).
    const flushIdx = calls.indexOf('queue_items.delete')
    const firstMergeRead = calls.indexOf('chains.select')
    expect(flushIdx).toBeGreaterThanOrEqual(0)
    expect(firstMergeRead).toBeGreaterThanOrEqual(0)
    expect(flushIdx).toBeLessThan(firstMergeRead)
  })

  // Block 19 fix: the reported bug. A task completed on one device must not be
  // resurrected into the queue when a stale device (still holding it locally)
  // merges — neither re-pushed as an orphan nor kept in the merged queue.
  it('does not resurrect a completed task into the queue', async () => {
    // Stale device: local queue still holds qx1, which is already completed
    // remotely (present in done_items, absent from the remote queue).
    localStorage.setItem(
      KEYS.QUEUE,
      JSON.stringify([{ id: 'qx1', text: 'task x', position: 0 }]),
    )
    state.selectData.queue_items = []
    state.selectData.done_items = [
      { id: 'qx1', text: 'task x', completed_at: '2026-01-02T00:00:00Z' },
    ]

    const result = await refresh({ id: 'u1' })

    // Dropped from the merged queue...
    expect(result.queue).toEqual([])
    // ...and never re-pushed to the remote queue as an orphan.
    const pushedBack = state.upserts.some(
      (u) => u.table === 'queue_items' && JSON.stringify(u.payload).includes('"qx1"'),
    )
    expect(pushedBack).toBe(false)
  })

  // Guard against over-exclusion: a genuinely active local task (not completed)
  // must still survive the merge and be pushed up as a legitimate orphan.
  it('keeps an active (uncompleted) local task through refresh', async () => {
    localStorage.setItem(
      KEYS.QUEUE,
      JSON.stringify([{ id: 'qy1', text: 'task y', position: 0 }]),
    )
    state.selectData.queue_items = []
    state.selectData.done_items = []

    const result = await refresh({ id: 'u1' })

    expect(result.queue).toEqual([{ id: 'qy1', text: 'task y', position: 0 }])
    const pushedUp = state.upserts.some(
      (u) => u.table === 'queue_items' && JSON.stringify(u.payload).includes('"qy1"'),
    )
    expect(pushedUp).toBe(true)
  })
})

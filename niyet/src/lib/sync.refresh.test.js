import { describe, it, expect, beforeEach, vi } from 'vitest'

// Record every Supabase operation in call order so we can assert the
// flush-before-merge sequencing without a live backend. Shared via vi.hoisted
// because the vi.mock factory is hoisted above the imports.
const { calls } = vi.hoisted(() => ({ calls: [] }))

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
      upsert: () => {
        calls.push(`${table}.upsert`)
        return Promise.resolve({ data: null, error: null })
      },
      delete: () => {
        calls.push(`${table}.delete`)
        return builder
      },
      eq: () => builder,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      // Thenable so `await builder` (selects / chained deletes) resolves to an
      // empty success result.
      then: (resolve) => resolve({ data: [], error: null }),
    }
    return builder
  }
  return { supabase: { from: (table) => makeBuilder(table) } }
})

import { refresh } from './sync'
import { KEYS } from './storage'

beforeEach(() => {
  calls.length = 0
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
})

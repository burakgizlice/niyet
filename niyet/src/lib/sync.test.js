import { describe, it, expect } from 'vitest'
import { mergeItems, mergeChains, mergeQueue, reindexPositions } from './sync'

const byId = (item) => item.id

describe('reindexPositions', () => {
  it('assigns positions 0..n-1 in array order', () => {
    const out = reindexPositions([{ position: 9 }, { position: 4 }, { position: 7 }])
    expect(out.map((i) => i.position)).toEqual([0, 1, 2])
  })

  it('preserves all other fields', () => {
    const out = reindexPositions([{ id: 'a', text: 'x', position: 5 }])
    expect(out[0]).toEqual({ id: 'a', text: 'x', position: 0 })
  })

  it('returns [] for empty input', () => {
    expect(reindexPositions([])).toEqual([])
  })
})

describe('mergeItems (done log)', () => {
  it('returns [] when both empty', () => {
    expect(mergeItems([], [], byId)).toEqual([])
  })

  it('returns local when remote empty', () => {
    const local = [{ id: 'a', text: 'a', completedAt: 100 }]
    expect(mergeItems(local, [], byId)).toEqual(local)
  })

  it('returns remote when local empty', () => {
    const remote = [{ id: 'a', text: 'a', completed_at: '2026-01-01T00:00:00Z' }]
    expect(mergeItems([], remote, byId)).toEqual(remote)
  })

  it('remote wins on id collision', () => {
    const local = [{ id: 'a', text: 'local', completedAt: 100 }]
    const remote = [{ id: 'a', text: 'remote', completed_at: '2026-01-01T00:00:00Z' }]
    const out = mergeItems(local, remote, byId)
    expect(out).toHaveLength(1)
    expect(out[0].text).toBe('remote')
  })

  it('unions disjoint sets sorted ascending by time (ms + ISO normalised)', () => {
    const local = [{ id: 'b', text: 'b', completedAt: 3000 }]
    const remote = [{ id: 'a', text: 'a', completed_at: '1970-01-01T00:00:01Z' }] // 1000ms
    const out = mergeItems(local, remote, byId)
    expect(out.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('falls back to text+time identity for items lacking an id', () => {
    const local = [{ text: 'su iç', completedAt: 100 }]
    const remote = [{ text: 'su iç', completed_at: 100 }]
    expect(mergeItems(local, remote, byId)).toHaveLength(1)
  })
})

describe('mergeQueue', () => {
  it('returns [] when both empty', () => {
    expect(mergeQueue([], [])).toEqual([])
  })

  it('reindexes a remote-only queue', () => {
    const remote = [
      { id: 'a', text: 'a', position: 5 },
      { id: 'b', text: 'b', position: 9 },
    ]
    expect(mergeQueue([], remote)).toEqual([
      { id: 'a', text: 'a', position: 0 },
      { id: 'b', text: 'b', position: 1 },
    ])
  })

  it('keeps lower position on id collision', () => {
    const local = [{ id: 'a', text: 'a', position: 3 }]
    const remote = [{ id: 'a', text: 'a-remote', position: 0 }]
    const out = mergeQueue(local, remote)
    expect(out).toHaveLength(1)
    expect(out[0].text).toBe('a-remote')
  })

  it('unions disjoint items ordered by position then reindexes', () => {
    const local = [{ id: 'b', text: 'b', position: 1 }]
    const remote = [{ id: 'a', text: 'a', position: 0 }]
    expect(mergeQueue(local, remote).map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('strips extra fields to the queue shape', () => {
    const local = [{ id: 'a', text: 'a', position: 0, created_at: 'x', user_id: 'u' }]
    expect(mergeQueue(local, [])).toEqual([{ id: 'a', text: 'a', position: 0 }])
  })
})

describe('mergeChains', () => {
  it('returns [] when both empty', () => {
    expect(mergeChains([], [])).toEqual([])
  })

  it('reindexes a local-only set by original position', () => {
    const local = [
      { id: 'b', name: 'B', position: 1 },
      { id: 'a', name: 'A', position: 0 },
    ]
    expect(mergeChains(local, []).map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('higher updated_at wins on id collision (C6)', () => {
    const local = [{ id: 'x', name: 'old', position: 0, updated_at: '2026-01-01T00:00:00Z' }]
    const remote = [{ id: 'x', name: 'new', position: 0, updated_at: '2026-05-01T00:00:00Z' }]
    const out = mergeChains(local, remote)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('new')
  })

  it('local wins when its updated_at is newer than remote', () => {
    const local = [{ id: 'x', name: 'local-new', position: 0, updated_at: '2026-05-02T00:00:00Z' }]
    const remote = [{ id: 'x', name: 'remote-old', position: 0, updated_at: '2026-05-01T00:00:00Z' }]
    expect(mergeChains(local, remote)[0].name).toBe('local-new')
  })

  it('unions disjoint chains and reindexes positions', () => {
    const local = [{ id: 'a', name: 'A', position: 0 }]
    const remote = [{ id: 'b', name: 'B', position: 1 }]
    const out = mergeChains(local, remote)
    expect(out.map((c) => c.id)).toEqual(['a', 'b'])
    expect(out.map((c) => c.position)).toEqual([0, 1])
  })
})

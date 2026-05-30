import { describe, it, expect } from 'vitest'
import { computePull, isArmed, PULL_MAX, PULL_THRESHOLD } from './usePullToRefresh'

describe('computePull', () => {
  it('returns 0 for a neutral drag (no movement)', () => {
    expect(computePull(100, 100)).toBe(0)
  })

  it('returns 0 for an upward drag', () => {
    expect(computePull(100, 40)).toBe(0)
  })

  it('applies the resistance factor to a downward drag', () => {
    // default resistance 0.5: a 100px finger move yields a 50px pull
    expect(computePull(0, 100)).toBe(50)
  })

  it('clamps to the rubber-band ceiling (PULL_MAX)', () => {
    expect(computePull(0, 1000)).toBe(PULL_MAX)
  })

  it('honours custom max and resistance', () => {
    expect(computePull(0, 100, 200, 1)).toBe(100)
    expect(computePull(0, 100, 30, 1)).toBe(30)
  })
})

describe('isArmed', () => {
  it('is false below the threshold', () => {
    expect(isArmed(PULL_THRESHOLD - 1)).toBe(false)
  })

  it('arms exactly at the threshold', () => {
    expect(isArmed(PULL_THRESHOLD)).toBe(true)
  })

  it('is armed above the threshold', () => {
    expect(isArmed(PULL_THRESHOLD + 50)).toBe(true)
  })

  it('honours a custom threshold', () => {
    expect(isArmed(40, 30)).toBe(true)
    expect(isArmed(20, 30)).toBe(false)
  })
})

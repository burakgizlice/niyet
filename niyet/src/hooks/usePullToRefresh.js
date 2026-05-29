// Block 19: pull-to-refresh for the installed PWA. The native overscroll
// gesture is unavailable in display-mode: standalone, so the swipe-down is
// hand-built here: track a downward drag that *starts* at the very top of the
// page, rubber-band it past a threshold, and fire onRefresh on release.
//
// The arming maths is split into pure helpers (computePull / isArmed) so the
// resistance clamp and threshold are unit-tested without simulating touches.

import { useEffect, useRef, useState } from 'react'

/** Max rendered pull distance in px (the rubber-band ceiling). */
export const PULL_MAX = 120
/** Release past this many px to trigger a refresh. */
export const PULL_THRESHOLD = 70
/** Drag-to-pull ratio (<1): the bed lags the finger so the pull feels elastic. */
const RESISTANCE = 0.5

/**
 * Rubber-banded pull distance from the gesture's start to the current touch Y.
 * Upward / neutral drags return 0; downward drags are scaled by `resistance`
 * and clamped to `max`.
 * @param {number} startY clientY where the gesture began (at scroll top)
 * @param {number} currentY current touch clientY
 * @param {number} [max]
 * @param {number} [resistance]
 * @returns {number} pull distance in px, 0..max
 */
export function computePull(startY, currentY, max = PULL_MAX, resistance = RESISTANCE) {
  const raw = currentY - startY
  if (raw <= 0) return 0
  return Math.min(raw * resistance, max)
}

/**
 * @param {number} distance current pull distance (px)
 * @param {number} [threshold]
 * @returns {boolean} true once the pull is far enough to trigger on release
 */
export function isArmed(distance, threshold = PULL_THRESHOLD) {
  return distance >= threshold
}

/**
 * Wire a top-of-page swipe-down to `onRefresh`. Listeners bind only while
 * `enabled` is true (e.g. signed-in coarse-pointer devices). Returns the live
 * pull distance so the caller can render an indicator.
 * @param {{ onRefresh: () => void, enabled: boolean }} opts
 * @returns {{ pullDistance: number }}
 */
export function usePullToRefresh({ onRefresh, enabled }) {
  const [pullDistance, setPullDistance] = useState(0)

  // Refs mirror values the listeners need at fire time without re-binding:
  // startY (null = not in a gesture), the latest distance, and the latest
  // onRefresh closure.
  const startYRef = useRef(null)
  const distanceRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  const setDistance = (d) => {
    distanceRef.current = d
    setPullDistance(d)
  }

  useEffect(() => {
    if (!enabled) return undefined

    const reset = () => {
      startYRef.current = null
      setDistance(0)
    }

    const onTouchStart = (e) => {
      // Begin a pull only when already at the very top and with one finger —
      // otherwise this is a normal scroll/pinch and we stay out of the way.
      startYRef.current =
        window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null
    }

    const onTouchMove = (e) => {
      if (startYRef.current == null) return
      // A second finger means a pinch, not a pull — bail and stay out of the way.
      if (e.touches.length !== 1) {
        reset()
        return
      }
      // The user scrolled down mid-gesture — abandon so we never hijack scroll.
      if (window.scrollY > 0) {
        reset()
        return
      }
      const distance = computePull(startYRef.current, e.touches[0].clientY)
      // Suppress native overscroll only while actively pulling down...
      if (distance > 0 && e.cancelable) e.preventDefault()
      // ...but always track distance, including back to 0, so dragging back up
      // before release cancels the pull and retracts the indicator.
      setDistance(distance)
    }

    const onTouchEnd = () => {
      if (startYRef.current == null) return
      const armed = isArmed(distanceRef.current)
      reset()
      if (armed) onRefreshRef.current?.()
    }

    // touchmove must be non-passive so preventDefault can stop native overscroll.
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', reset, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', reset)
    }
  }, [enabled])

  return { pullDistance }
}

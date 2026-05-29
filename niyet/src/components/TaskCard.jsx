import React from 'react'
import { TOKENS } from '../tokens'
import CheckboxButton from './CheckboxButton'
import { CARD_RAMP } from '../constants/cardRamp'
import {
  COMPLETION_ANIMATION_MS,
  CARD_ENTER_ANIMATION_MS,
  EXIT_EASING,
  ENTER_EASING,
} from '../constants/animation'

/**
 * True when the user has requested reduced motion. Guarded for SSR (defaults to
 * false when window/matchMedia is unavailable).
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * A single task card. `index` drives the CARD_RAMP scale/opacity ramp so
 * secondary cards shrink and dim. Block 4 adds the completion checkbox, the
 * exit animation (when `isCompleting`), and the entrance animation (rAF-flip on
 * fresh mount).
 *
 * The state commit is NOT driven here — `onCompleteEnd(id)` fires when the exit
 * transition ends (or, under reduced motion, after one rAF tick) and the parent
 * performs the mutation.
 *
 * @param {{
 *   id: string,
 *   text: string,
 *   index: number,
 *   isCompleting: boolean,
 *   onComplete: (id: string) => void,
 *   onCompleteEnd: (id: string) => void,
 *   isInteractive: boolean,
 * }} props
 */
export default function TaskCard({
  id,
  text,
  index,
  isCompleting = false,
  onComplete,
  onCompleteEnd,
  isInteractive = false,
}) {
  const { scale, opacity } = CARD_RAMP[Math.min(index, CARD_RAMP.length - 1)]
  const isPrimary = index === 0
  const reduced = prefersReducedMotion()

  const rootRef = React.useRef(null)

  // --- Entrance animation (rAF flip) -----------------------------------------
  // Mount with translateY(40px)/opacity:0, then double-rAF to clear so the
  // browser commits the initial paint before the transition fires. Under
  // reduced motion we mount at the final state immediately.
  const [entering, setEntering] = React.useState(() => !reduced)

  React.useEffect(() => {
    if (reduced) return undefined
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setEntering(false))
      // store inner id so cleanup can cancel it too
      rootRef.current && (rootRef.current._enterRaf2 = raf2)
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (rootRef.current && rootRef.current._enterRaf2) {
        cancelAnimationFrame(rootRef.current._enterRaf2)
      }
    }
  }, [reduced])

  // --- Exit commit trigger ----------------------------------------------------
  const firedRef = React.useRef(false)

  // Reduced motion: 0-duration transitions don't reliably emit transitionend,
  // so drive the commit via a single rAF tick when isCompleting becomes true.
  React.useEffect(() => {
    if (!isCompleting || !reduced) return undefined
    if (firedRef.current) return undefined
    const raf = requestAnimationFrame(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onCompleteEnd?.(id)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [isCompleting, reduced, id, onCompleteEnd])

  // Normal motion: commit on the transform transition ending. Key off
  // propertyName === 'transform' so we don't fire twice (transform + opacity).
  const handleTransitionEnd = (e) => {
    if (reduced) return
    if (!isCompleting) return
    if (e.propertyName !== 'transform') return
    if (firedRef.current) return
    firedRef.current = true
    onCompleteEnd?.(id)
  }

  // --- Transform composition --------------------------------------------------
  const exitDur = reduced ? 0 : COMPLETION_ANIMATION_MS
  const enterDur = reduced ? 0 : CARD_ENTER_ANIMATION_MS

  let transform
  let cardOpacity
  let transition

  if (isCompleting) {
    transform = `translateX(80px) scale(0.95)`
    cardOpacity = 0
    transition = `transform ${exitDur}ms ${EXIT_EASING}, opacity ${exitDur}ms ${EXIT_EASING}`
  } else if (entering) {
    // Compose the entrance translateY with the ramp scale in one transform.
    transform = `translateY(40px) scale(${scale})`
    cardOpacity = 0
    transition = `transform ${enterDur}ms ${ENTER_EASING}, opacity ${enterDur}ms ${ENTER_EASING}`
  } else {
    transform = `translateY(0) scale(${scale})`
    cardOpacity = opacity
    transition = `transform ${enterDur}ms ${ENTER_EASING}, opacity ${enterDur}ms ${ENTER_EASING}`
  }

  return (
    <div
      ref={rootRef}
      onTransitionEnd={handleTransitionEnd}
      style={{
        transform,
        opacity: cardOpacity,
        transformOrigin: 'top center',
        transition,
        width: '100%',
        background: TOKENS.colors.surfaceRaised,
        borderRadius: '16px',
        borderTop: isPrimary ? `2px solid ${TOKENS.colors.emerald}33` : 'none',
        padding: '24px 20px',
        marginBottom: isPrimary ? '0' : '-8px',
        boxShadow: isPrimary ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
        position: 'relative',
        zIndex: 10 - index,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <CheckboxButton
        checked={false}
        onComplete={() => isInteractive && onComplete?.(id)}
        disabled={!isInteractive || isCompleting}
      />
      <p
        style={{
          margin: 0,
          flex: 1,
          fontSize: 'clamp(1rem, 4vw, 1.4rem)',
          fontWeight: TOKENS.typography.taskFontWeight,
          lineHeight: TOKENS.typography.taskLineHeight,
          letterSpacing: TOKENS.typography.taskLetterSpacing,
          color: TOKENS.colors.textPrimary,
        }}
      >
        {text}
      </p>
    </div>
  )
}

import React from 'react'

/** Hold duration before a touch press reveals the card actions. */
const LONG_PRESS_MS = 450

/**
 * Reveal-on-intent for card actions. Three independent triggers fold into one
 * `revealed` flag so a card can surface its Düzenle/Sil row however the user
 * reaches for it:
 *   - touch: press-and-hold for LONG_PRESS_MS
 *   - mouse: hover (pointerenter → leave)
 *   - keyboard: focus anywhere within the element (a11y — focus-within)
 *
 * Touch has no hover-out to dismiss the row, so while a long-press reveal is
 * active a pointerdown outside the card collapses it. The native long-press
 * callout / context menu is suppressed for the duration of a touch press
 * (`onContextMenu`) so the gesture reveals our actions instead of the OS menu.
 *
 * `disabled` (card entering/exiting) gates `revealed` off and is also honoured
 * by the handlers, so a card mid-animation never reveals.
 *
 * @param {{ disabled?: boolean, ref: React.RefObject<HTMLElement | null> }} opts
 * @returns {{ revealed: boolean, hide: () => void, handlers: object }}
 */
export function useLongPress({ disabled = false, ref } = {}) {
  const [hovering, setHovering] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [pressed, setPressed] = React.useState(false)

  const timerRef = React.useRef(null)
  // True for the whole span of a touch press (down → up/cancel/leave), so the
  // context-menu suppressor covers the OS callout window, not just the moment
  // after our timer fires.
  const touchPressingRef = React.useRef(false)

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Clear any pending hold timer on unmount.
  React.useEffect(() => clearTimer, [clearTimer])

  // Outside-tap dismissal for the touch (long-press) reveal.
  React.useEffect(() => {
    if (!pressed) return undefined
    const onDocPointerDown = (e) => {
      if (ref?.current && !ref.current.contains(e.target)) setPressed(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [pressed, ref])

  const hide = React.useCallback(() => {
    clearTimer()
    touchPressingRef.current = false
    setHovering(false)
    setFocused(false)
    setPressed(false)
  }, [clearTimer])

  const handlers = {
    onPointerEnter: (e) => {
      if (!disabled && e.pointerType === 'mouse') setHovering(true)
    },
    onPointerLeave: (e) => {
      if (e.pointerType === 'mouse') setHovering(false)
      touchPressingRef.current = false
      clearTimer()
    },
    onPointerDown: (e) => {
      if (disabled || e.pointerType === 'mouse') return // hover handles desktop
      touchPressingRef.current = true
      clearTimer()
      timerRef.current = setTimeout(() => setPressed(true), LONG_PRESS_MS)
    },
    onPointerUp: () => {
      touchPressingRef.current = false
      clearTimer()
    },
    onPointerCancel: () => {
      touchPressingRef.current = false
      clearTimer()
    },
    onContextMenu: (e) => {
      if (touchPressingRef.current) e.preventDefault()
    },
    onFocus: () => {
      if (!disabled) setFocused(true)
    },
    onBlur: (e) => {
      // Ignore focus moving between children of the same card.
      if (ref?.current && e.relatedTarget && ref.current.contains(e.relatedTarget)) return
      setFocused(false)
    },
  }

  return {
    revealed: !disabled && (hovering || focused || pressed),
    hide,
    handlers,
  }
}

import React from 'react'
import { TOKENS } from '../tokens'
import CheckboxButton from './CheckboxButton'
import CalligraphicCut from './CalligraphicCut'
import CardActions from './CardActions'
import { useLongPress } from '../hooks/useLongPress'
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
 *   onEdit?: (id: string, text: string) => void,
 *   onDelete?: (id: string) => void,
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
  onEdit,
  onDelete,
  isInteractive = false,
}) {
  const { scale, opacity } = CARD_RAMP[Math.min(index, CARD_RAMP.length - 1)]
  const isPrimary = index === 0
  const reduced = prefersReducedMotion()

  const rootRef = React.useRef(null)

  // The calligraphic cut fires on tap (not on isCompleting) so the ~0.42s draw
  // lands inside the REWARD_WINDOW hold, before the card slides out. Once struck
  // it stays drawn and travels with the card as it exits, then unmounts with it.
  const [struck, setStruck] = React.useState(false)

  // --- Edit / delete affordances ---------------------------------------------
  // Inline editing swaps the task text for a textarea seeded with the current
  // text. `draft` holds the in-progress value; it is seeded fresh each time the
  // user opens the editor (never tracks `text` while closed). committedRef
  // guards against Enter→commit and the subsequent blur firing onEdit twice.
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(text)
  const textareaRef = React.useRef(null)
  const committedRef = React.useRef(false)

  const openEditor = () => {
    setDraft(text)
    committedRef.current = false
    setEditing(true)
    hide()
  }

  const commitEdit = () => {
    if (committedRef.current) return
    committedRef.current = true
    onEdit?.(id, draft) // useQueue.editTask guards empty / unchanged text
    setEditing(false)
  }

  const cancelEdit = () => {
    committedRef.current = true
    setEditing(false)
  }

  // Focus the textarea and drop the caret at the end when the editor opens.
  React.useEffect(() => {
    if (!editing) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const end = el.value.length
    el.setSelectionRange(end, end)
  }, [editing])

  // --- Even-gap compensation --------------------------------------------------
  // Cards shrink via `transform: scale()` (origin top center), but transforms
  // don't affect layout — the flow still reserves each card's full unscaled
  // height, so a scaled card leaves (1 - scale) * height of empty space below
  // it. With a constant marginBottom the visible gaps therefore GROW down the
  // stack as scale falls. Measure the real (unscaled) layout height and pull the
  // next card up by exactly that dead space, leaving one constant visual gap.
  const [layoutHeight, setLayoutHeight] = React.useState(0)

  React.useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const measure = () => setLayoutHeight(el.offsetHeight) // offsetHeight ignores transforms
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Constant visual gap between successive cards' visible edges.
  const VISUAL_GAP = 12
  const marginBottom = layoutHeight
    ? Math.round(VISUAL_GAP - (1 - scale) * layoutHeight)
    : VISUAL_GAP

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

  // Reveal the Düzenle/Sil row on hover, long-press, or focus — but never while
  // the card is animating in/out, editing, or non-interactive. (Declared here,
  // after `entering`, which it depends on.)
  const revealDisabled = !isInteractive || isCompleting || entering || editing
  const { revealed, hide, handlers: pressHandlers } = useLongPress({
    disabled: revealDisabled,
    ref: rootRef,
  })

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
      {...pressHandlers}
      style={{
        transform,
        opacity: cardOpacity,
        transformOrigin: 'top center',
        transition,
        width: '100%',
        // Suppress the long-press text-selection / iOS callout on the card body,
        // but allow normal selection inside the edit textarea.
        userSelect: editing ? 'text' : 'none',
        WebkitUserSelect: editing ? 'text' : 'none',
        WebkitTouchCallout: 'none',
        background: isPrimary ? TOKENS.gradients.cardGlass : TOKENS.colors.surface,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius: TOKENS.radii.card,
        border: `1px solid ${isPrimary ? TOKENS.lines.gold : TOKENS.lines.hair}`,
        borderTop: isPrimary
          ? `1.5px solid ${TOKENS.colors.gold}`
          : `1px solid ${TOKENS.lines.hair}`,
        padding: isPrimary ? '30px 26px' : '26px 24px',
        marginBottom: `${marginBottom}px`,
        boxShadow: isPrimary
          ? `${TOKENS.shadows.card}, 0 0 0 1px rgba(217,180,90,0.08), 0 18px 40px -20px rgba(31,177,121,0.5)`
          : '0 12px 30px -22px rgba(0,0,0,0.6)',
        position: 'relative',
        zIndex: 10 - index,
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
      }}
    >
      <CheckboxButton
        checked={false}
        onComplete={() => {
          if (!isInteractive) return
          setStruck(true)
          onComplete?.(id)
        }}
        disabled={!isInteractive || isCompleting || editing}
      />
      <div style={{ position: 'relative', flex: 1 }}>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commitEdit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelEdit()
              }
            }}
            rows={1}
            aria-label="Görev metnini düzenle"
            style={{
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              margin: 0,
              padding: '4px 8px',
              resize: 'none',
              background: 'rgba(6, 22, 14, 0.45)',
              border: `1px solid ${TOKENS.lines.gold}`,
              borderRadius: TOKENS.radii.sm,
              outline: 'none',
              fontFamily: TOKENS.fonts.display,
              fontSize: isPrimary ? 'clamp(1.35rem, 5.5vw, 1.85rem)' : 'clamp(1.1rem, 4vw, 1.4rem)',
              fontWeight: TOKENS.typography.taskFontWeight,
              lineHeight: TOKENS.typography.taskLineHeight,
              letterSpacing: TOKENS.typography.taskLetterSpacing,
              color: TOKENS.colors.textPrimary,
            }}
          />
        ) : (
          <p
            style={{
              margin: 0,
              fontFamily: TOKENS.fonts.display,
              fontSize: isPrimary ? 'clamp(1.35rem, 5.5vw, 1.85rem)' : 'clamp(1.1rem, 4vw, 1.4rem)',
              fontWeight: TOKENS.typography.taskFontWeight,
              lineHeight: TOKENS.typography.taskLineHeight,
              letterSpacing: TOKENS.typography.taskLetterSpacing,
              color: isPrimary ? TOKENS.colors.textPrimary : TOKENS.colors.textMuted,
            }}
          >
            {text}
          </p>
        )}
        <CalligraphicCut active={struck} reduced={reduced} />
      </div>
      {isInteractive && !editing && (
        <CardActions revealed={revealed} onEdit={openEditor} onDelete={() => onDelete?.(id)} />
      )}
    </div>
  )
}

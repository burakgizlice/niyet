import React from 'react'
import { TOKENS } from '../tokens'
import { REWARD_WINDOW_MS, COMPLETION_ANIMATION_MS } from '../constants/animation'
import '../styles/checkmark.css'

// Defensive reset for the local `animating` flag. The card normally unmounts
// when its exit transition ends (~REWARD_WINDOW_MS + COMPLETION_ANIMATION_MS),
// so this timer rarely fires; it must outlast the full reward + exit window so
// it never reverts the checkmark/glow while the card is still visibly exiting.
const ANIMATING_RESET_MS = REWARD_WINDOW_MS + COMPLETION_ANIMATION_MS + 150

/**
 * Block 6: self-contained, accessible completion checkbox. Owns the 28px gold
 * circle, the white SVG checkmark, and the local `animating` state that drives
 * the draw + glow.
 *
 * Contract: `onComplete` is called IMMEDIATELY on tap. The caller (Block 4 /
 * useQueue) owns the delay (REWARD_WINDOW_MS) before any state mutation — this
 * component only owns the visual. `checked` stays false while the card is
 * mounted (the card unmounts on exit), so `animating` carries the reward visual.
 * This component never plays a sound (the tick is fired by useQueue.completeTask).
 *
 * @param {{
 *   checked?: boolean,
 *   onComplete?: () => void,
 *   disabled?: boolean,
 * }} props
 */
export default function CheckboxButton({ checked = false, onComplete, disabled = false }) {
  const [animating, setAnimating] = React.useState(false)
  const resetTimerRef = React.useRef(null)

  React.useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const handleActivate = () => {
    if (disabled || checked || animating) return // double-tap mutex
    setAnimating(true)
    resetTimerRef.current = setTimeout(() => setAnimating(false), ANIMATING_RESET_MS)
    onComplete?.()
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label="Görevi tamamla"
      disabled={disabled}
      onClick={handleActivate}
      style={{
        flexShrink: 0,
        width: '44px',
        height: '44px',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        aria-hidden="true"
        className={'checkbox-circle' + (animating ? ' checkbox--animating' : '')}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          boxSizing: 'border-box',
          borderRadius: '999px',
          border: `2px solid ${TOKENS.colors.emeraldBright}`,
          boxShadow: '0 0 0 4px rgba(31,177,121,0.08)',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{ position: 'absolute' }}
        >
          {/* Path length ≈ 18.45, rounded up to 19; dashoffset 19 hides the tick
              until .checkbox--animating drives checkmark-draw to offset 0. */}
          <path
            className="checkbox-check"
            d="M 4 10 L 8.5 15 L 16 6"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 19,
              strokeDashoffset: checked ? 0 : 19,
            }}
          />
        </svg>
      </span>
    </button>
  )
}

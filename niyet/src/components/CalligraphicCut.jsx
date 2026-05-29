import { useId } from 'react'
import { TOKENS } from '../tokens'
import '../styles/calligraphic-cut.css'

// Replaces the Block 7 particle burst. A qalam-blade draws straight through the
// completed task and stays — the strike becomes the completion mark itself.
// Rendered inside TaskCard, absolutely positioned across the task text, and
// fired on tap so the 0.42s draw lands inside the REWARD_WINDOW hold before the
// card slides out. The stroke travels with the card as it exits, then unmounts
// with it. Under reduced motion the stroke is shown fully drawn, no animation.
//
// Each instance owns a unique <linearGradient> id: several cards can be cut at
// once (rapid completions), and a shared id would make every stroke resolve to
// the first card's gradient def. useId() gives a stable, collision-free id;
// colons are stripped so it's safe inside a url(#…) reference.

/**
 * @param {{ active: boolean, reduced?: boolean }} props
 */
export default function CalligraphicCut({ active, reduced = false }) {
  const gradId = `niyet-cut-${useId().replace(/:/g, '')}`

  if (!active) return null

  return (
    <svg
      aria-hidden="true"
      className="niyet-cut"
      viewBox="0 0 320 60"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={TOKENS.colors.goldDeep} />
          <stop offset="0.5" stopColor={TOKENS.colors.gold} />
          <stop offset="1" stopColor={TOKENS.colors.goldLight} />
        </linearGradient>
      </defs>
      {/* qalam stroke — a near-horizontal sweep with a slight calligraphic dip */}
      <path
        d="M 6,32 Q 90,22 170,30 Q 250,38 314,26"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="5"
        strokeLinecap="round"
        className={'niyet-cut-line' + (reduced ? ' niyet-cut-line--static' : '')}
      />
      {!reduced && (
        <circle
          className="niyet-cut-spark"
          cx="314"
          cy="26"
          r="3"
          fill={TOKENS.colors.textPrimary}
        />
      )}
    </svg>
  )
}

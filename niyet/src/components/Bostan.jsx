import React from 'react'
import { TOKENS } from '../tokens'
import useStreak from '../hooks/useStreak'
import Tulip from './Tulip'
import { getGardenStyle, getColumns, getMilestoneLabel } from '../lib/garden'
import '../styles/bostan.css'

const PLANT_MS = 720
// Session streaks reset on Temizle, so counts stay modest. Cap the rendered
// bed anyway: beyond this the number carries the rest rather than tiling
// hundreds of nodes / pushing the cards off-screen.
const MAX_TULIPS = 96
// Grid cell footprint as a fraction of the glyph size. < 1 so each tulip spills
// over its cell and overlaps its neighbours — a densely planted bed.
const CELL_W = 0.78
const CELL_H = 0.74

/**
 * The "bostan": a walled garden bed that fills with gold-line tulips — one per
 * completed micro-action. Replaces the old single-flame badge. Zero props;
 * reads everything from StreakContext. Renders nothing until the first
 * completion (count 0 -> null) so the page carries no chrome before the user
 * has done anything.
 */
export default function Bostan() {
  const { streakCount } = useStreak()

  // Plant the newest tulip (grow-in) only when the count actually rises.
  // Seeding the ref with the current count means mount / remount (view nav
  // restoring a non-zero count) and resets never replay the animation, and
  // StrictMode's double effect-fire is a no-op the second time. Mirrors the
  // old FireBadge increment-pulse bookkeeping.
  const prevCount = React.useRef(streakCount)
  const [planting, setPlanting] = React.useState(false)

  React.useEffect(() => {
    const increased = streakCount > prevCount.current
    prevCount.current = streakCount
    if (!increased) return undefined
    // rAF before setState keeps the toggle out of the effect body (lint:
    // no set-state-in-effect) and matches the app's other entrance patterns.
    const raf = requestAnimationFrame(() => setPlanting(true))
    const timer = setTimeout(() => setPlanting(false), PLANT_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [streakCount])

  if (streakCount === 0) return null

  const { size } = getGardenStyle(streakCount)
  const label = getMilestoneLabel(streakCount)
  const shown = Math.min(streakCount, MAX_TULIPS)
  const lastIndex = shown - 1
  const cols = getColumns(shown)
  const colW = Math.round(size * CELL_W)
  const rowH = Math.round(size * CELL_H)

  return (
    <section
      className="niyet-fade-up"
      aria-label={`${streakCount} küçük adım tamamladın`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: TOKENS.colors.surface,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${TOKENS.lines.goldFaint}`,
        borderRadius: TOKENS.radii.sm,
        boxShadow: TOKENS.shadows.soft,
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      {/* the planted bed: a grid of `cols` columns (3 until a 3×3 block, then
          balanced/near-square). Cells are narrower/shorter than the glyph, so
          tulips spill over and overlap into a dense bed that grows in both
          axes. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${colW}px)`,
          gridAutoRows: `${rowH}px`,
          placeItems: 'center',
          flex: '0 0 auto',
        }}
      >
        {Array.from({ length: shown }, (_, i) => (
          <Tulip key={i} size={size} index={i} planting={planting && i === lastIndex} />
        ))}
      </div>

      {/* status post: count + milestone phrase, anchored to the right so the
          bed stays left-planted and the strip uses its full width */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '2px',
          flex: '0 0 auto',
        }}
      >
        <span
          style={{
            fontFamily: TOKENS.fonts.display,
            fontWeight: 600,
            fontSize: '1.4rem',
            lineHeight: 1,
            color: TOKENS.colors.goldLight,
          }}
        >
          {streakCount}
        </span>
        {label && (
          <span
            style={{
              fontFamily: TOKENS.fonts.display,
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '0.9rem',
              letterSpacing: '0.01em',
              color: TOKENS.colors.gold,
              textAlign: 'right',
              maxWidth: '120px',
            }}
          >
            {label}
          </span>
        )}
      </div>
    </section>
  )
}

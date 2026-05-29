import React from 'react'
import { TOKENS } from '../tokens'
import useStreak from '../hooks/useStreak'
import { getFlameStyle, getMilestoneLabel } from '../lib/flame'
import '../styles/fire-streak.css'

const INCREMENT_PULSE_MS = 620

/**
 * Header flame badge. Zero props — reads everything from StreakContext. Renders
 * nothing until the first completion (count 0 -> null), so the header carries no
 * chrome before the user has done anything.
 */
export default function FireBadge() {
  const { streakCount } = useStreak()

  // Pulse only when the count actually rises. Seeding the ref with the current
  // count means mount / remount (e.g. view nav restoring a non-zero count) and
  // resets (count drops) never pulse, and StrictMode's double effect-fire is a
  // no-op the second time (count === prev). Only a genuine increment pulses.
  const prevCount = React.useRef(streakCount)
  const [justIncremented, setJustIncremented] = React.useState(false)

  React.useEffect(() => {
    const increased = streakCount > prevCount.current
    prevCount.current = streakCount
    if (!increased) return undefined
    // rAF before setState mirrors TaskCard's entrance pattern and keeps the
    // toggle out of the effect body (lint: no set-state-in-effect).
    const raf = requestAnimationFrame(() => setJustIncremented(true))
    const timer = setTimeout(() => setJustIncremented(false), INCREMENT_PULSE_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [streakCount])

  if (streakCount === 0) return null

  const { scale, filter } = getFlameStyle(streakCount)
  const milestoneLabel = getMilestoneLabel(streakCount)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '2px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          className={`flame-icon${justIncremented ? ' flame-just-incremented' : ''}`}
          style={{ '--flame-scale': scale, filter, fontSize: '1.6rem', lineHeight: 1 }}
          aria-hidden="true"
        >
          🔥
        </span>
        <span
          style={{
            fontSize: '0.95rem',
            color: TOKENS.colors.textPrimary,
            whiteSpace: 'nowrap',
          }}
        >
          {streakCount} küçük şey yaptın! 🔥
        </span>
      </div>
      {milestoneLabel && (
        <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
          {milestoneLabel}
        </span>
      )}
    </div>
  )
}

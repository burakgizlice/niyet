import NiyetMark from './NiyetMark'
import { PULL_THRESHOLD } from '../hooks/usePullToRefresh'

/**
 * Fixed top-center pull-to-refresh indicator (Block 19). While dragging, the
 * نية mark fades and scales in tracking pullDistance; once refreshing, it
 * settles to a fixed spot and breathes with the radial glow. Renders nothing at
 * rest. Purely decorative — pointer-events off so it never blocks the gesture.
 *
 * @param {{ pullDistance: number, refreshing: boolean }} props
 */
export default function PullToRefreshIndicator({ pullDistance, refreshing }) {
  if (!refreshing && pullDistance <= 0) return null

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const translateY = refreshing ? 44 : 12 + progress * 36
  const opacity = refreshing ? 1 : progress
  const scale = refreshing ? 1 : 0.7 + progress * 0.3

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <div
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          opacity,
          transition: refreshing
            ? 'transform 200ms cubic-bezier(0.16,1,0.3,1), opacity 200ms'
            : 'none',
        }}
      >
        <NiyetMark size={34} glow={refreshing} breathing={refreshing} />
      </div>
    </div>
  )
}

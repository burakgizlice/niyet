import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'

/**
 * Owns the pull-to-refresh gesture + indicator (Block 19). Kept as its own
 * component so the per-frame pullDistance updates re-render only the indicator,
 * not the whole Queue tree (Bostan, the TaskCard list) which would otherwise
 * reconcile on every touchmove. Renders nothing when disabled.
 *
 * @param {{ onRefresh: () => void, refreshing: boolean, enabled: boolean }} props
 */
export default function PullToRefresh({ onRefresh, refreshing, enabled }) {
  const { pullDistance } = usePullToRefresh({ onRefresh, enabled })
  if (!enabled) return null
  return <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
}

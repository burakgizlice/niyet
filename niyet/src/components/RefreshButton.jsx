import { TOKENS } from '../tokens'
import NiyetMark from './NiyetMark'

/**
 * Desktop refresh affordance (Block 19). Resting: a gold circular-arrow glyph.
 * Refreshing: the breathing نية mark, disabled. Queue renders this only when a
 * user is signed in on a fine-pointer (mouse) device — touch devices get the
 * pull-to-refresh gesture instead.
 *
 * @param {{ onRefresh: () => void, refreshing: boolean }} props
 */
export default function RefreshButton({ onRefresh, refreshing }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label="Eşitle"
      title="Eşitle"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        background: TOKENS.colors.surface,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: TOKENS.colors.gold,
        border: `1px solid ${TOKENS.lines.emerald}`,
        borderRadius: TOKENS.radii.pill,
        cursor: refreshing ? 'default' : 'pointer',
        padding: 0,
        transition: `opacity 160ms ${TOKENS.motion.easeOut}`,
      }}
    >
      {refreshing ? <NiyetMark size={16} /> : <RefreshIcon />}
    </button>
  )
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 11a8 8 0 1 0-.5 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M20 5v6h-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

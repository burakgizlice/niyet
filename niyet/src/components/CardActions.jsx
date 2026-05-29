import { TOKENS } from '../tokens'

/**
 * The reveal-on-intent action row for a task card: Düzenle (edit) and Sil
 * (delete). Rendered on every visible card and surfaced by useLongPress —
 * hover, long-press, or keyboard focus (see TaskCard). The buttons stay in the
 * DOM at all times (opacity/visibility toggle, never display:none) so they are
 * reachable by Tab; focusing one bubbles a focus event to the card root, which
 * flips `revealed` on and makes the row interactive. pointer-events is gated on
 * `revealed` so an invisible row can never be tapped by accident.
 *
 * @param {{ revealed: boolean, onEdit: () => void, onDelete: () => void }} props
 */
export default function CardActions({ revealed, onEdit, onDelete }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '10px',
        display: 'flex',
        gap: '4px',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(-4px)',
        pointerEvents: revealed ? 'auto' : 'none',
        transition: `opacity 160ms ${TOKENS.motion.easeOut}, transform 160ms ${TOKENS.motion.easeOut}`,
        zIndex: 2,
      }}
    >
      <IconButton label="Düzenle" onClick={onEdit} tone={TOKENS.colors.textMuted}>
        {/* pencil */}
        <path d="M12 3.5l3 3M4 14.5l8.6-8.6 3 3L7 17H4v-2.5z" />
      </IconButton>
      <IconButton label="Sil" onClick={onDelete} tone={TOKENS.colors.error}>
        {/* trash */}
        <path d="M4 6h13M8 6V4.5h5V6m-7 0l.8 10.5h6.4L15 6M9 9v5M12 9v5" />
      </IconButton>
    </div>
  )
}

function IconButton({ label, onClick, tone, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Don't let a tap on the action bubble to the card (whose long-press /
      // focus handlers live on the root) or trigger any default.
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '34px',
        height: '34px',
        padding: 0,
        background: 'rgba(6, 22, 14, 0.55)',
        border: `1px solid ${TOKENS.lines.goldFaint}`,
        borderRadius: TOKENS.radii.pill,
        color: tone,
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  )
}

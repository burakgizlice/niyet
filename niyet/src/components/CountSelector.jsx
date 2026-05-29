import { TOKENS } from '../tokens'

const OPTIONS = [1, 2, 3, 5]

/**
 * Fully controlled pill-row selector for the visible-card count. The parent
 * owns the value; this component holds no internal state.
 *
 * @param {{ value: 1 | 2 | 3 | 5, onChange: (n: 1 | 2 | 3 | 5) => void }} props
 */
export default function CountSelector({ value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        marginBottom: '16px',
      }}
    >
      {OPTIONS.map((n) => {
        const active = value === n
        return (
          <button
            key={n}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(n)}
            style={{
              background: active ? TOKENS.gradients.goldButton : 'rgba(31,177,121,0.07)',
              color: active ? '#2a1e05' : TOKENS.colors.textMuted,
              fontFamily: TOKENS.fonts.ui,
              fontWeight: active ? 700 : 500,
              borderRadius: TOKENS.radii.pill,
              padding: '7px 17px',
              border: active ? 'none' : `1px solid ${TOKENS.lines.hair}`,
              cursor: 'pointer',
              fontSize: '0.9rem',
              minWidth: '42px',
              boxShadow: active ? TOKENS.shadows.gold : 'none',
              transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
            }}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

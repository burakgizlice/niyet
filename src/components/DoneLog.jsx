import { TOKENS } from '../tokens'

/** @typedef {{ id: string, text: string, completedAt: number }} DoneItem */

const formatTime = (completedAt) =>
  new Date(completedAt).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Block 10: completed-task log. Stateless display component rendered below the
 * queue on the main screen. Intentionally non-prominent — muted, struck-through,
 * subordinate to the active queue. No guilt copy anywhere near 'Temizle' (PRD
 * §3.5). `doneItems` is reversed for display so the most recent completion sits
 * on top; the source array (in useDone) stays in completion order.
 *
 * @param {{ doneItems: DoneItem[], onTemizle: () => void }} props
 */
export default function DoneLog({ doneItems, onTemizle }) {
  const hasItems = doneItems.length > 0

  return (
    <section
      style={{
        marginTop: '2.5rem',
        paddingTop: '1.5rem',
      }}
    >
      <div className="niyet-gold-rule" style={{ opacity: 0.6, marginBottom: '1.25rem' }} />
      <h2
        style={{
          color: TOKENS.colors.gold,
          fontFamily: TOKENS.fonts.ui,
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          margin: '0 0 14px',
        }}
      >
        Tamamlananlar
      </h2>

      {!hasItems ? (
        <p
          style={{
            color: TOKENS.colors.textDim,
            fontSize: '0.85rem',
            margin: 0,
          }}
        >
          Henüz tamamlanan yok.
        </p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {doneItems
              .slice()
              .reverse()
              .map((item) => (
                <li
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '12px',
                    padding: '4px 0',
                  }}
                >
                  <span
                    style={{
                      color: TOKENS.colors.textMuted,
                      fontSize: '0.85rem',
                      textDecoration: 'line-through',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {item.text}
                  </span>
                  <span
                    style={{
                      color: TOKENS.colors.textDim,
                      fontSize: '0.75rem',
                      opacity: 0.7,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {formatTime(item.completedAt)}
                  </span>
                </li>
              ))}
          </ul>

          <button
            type="button"
            onClick={onTemizle}
            style={{
              marginTop: '18px',
              background: 'transparent',
              color: TOKENS.colors.textMuted,
              fontFamily: TOKENS.fonts.ui,
              fontSize: '0.8rem',
              border: `1px solid ${TOKENS.lines.emerald}`,
              borderRadius: TOKENS.radii.pill,
              padding: '0.5rem 1.1rem',
              minHeight: '36px',
              cursor: 'pointer',
            }}
          >
            Temizle
          </button>
        </>
      )}
    </section>
  )
}

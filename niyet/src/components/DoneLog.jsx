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
        paddingTop: '1.25rem',
        borderTop: `1px solid ${TOKENS.colors.emeraldDim}`,
      }}
    >
      <h2
        style={{
          color: TOKENS.colors.textMuted,
          fontSize: '0.8rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          margin: '0 0 12px',
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
              marginTop: '16px',
              background: 'transparent',
              color: TOKENS.colors.textMuted,
              fontSize: '0.8rem',
              border: `1px solid ${TOKENS.colors.emeraldDim}`,
              borderRadius: '6px',
              padding: '0.4rem 0.9rem',
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

import { TOKENS } from '../tokens'
import { useChains } from '../hooks/useChains'

/**
 * Block 12: full-screen chains list (read-only). Reached via the view-router
 * 'chains' state. Tapping a card appends that chain's steps to the queue and
 * returns to main — the load action lives here (not in useChains) because it
 * needs the single queueApi's appendSteps, drilled from App (spec Q1).
 *
 * No create/edit/delete affordances — those are Block 13. The empty-state guard
 * won't fire in practice (DEFAULT_CHAINS always has 7) but stays for when Block
 * 14 makes the list user-mutable.
 *
 * @param {{ setView: (view: string) => void, appendSteps: (steps: string[]) => void }} props
 */
export default function Chains({ setView, appendSteps }) {
  const { chains } = useChains()

  const loadChain = (chain) => {
    appendSteps(chain.steps)
    setView('main')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: TOKENS.colors.bg,
        padding: '1.5rem 1rem',
      }}
    >
      <div
        style={{
          maxWidth: TOKENS.spacing.containerMaxWidth,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <button
          type="button"
          onClick={() => setView('main')}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 'none',
            color: TOKENS.colors.textMuted,
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '8px 4px',
            minHeight: '44px',
          }}
        >
          ← Geri
        </button>

        <h1
          style={{
            color: TOKENS.colors.gold,
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '8px 0 16px',
          }}
        >
          Zincirler
        </h1>

        {chains.length === 0 ? (
          <p
            style={{
              color: TOKENS.colors.textMuted,
              fontSize: '1rem',
              textAlign: 'center',
              paddingTop: '2rem',
            }}
          >
            Henüz zincir yok.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chains.map((chain) => (
              <li key={chain.id}>
                <button
                  type="button"
                  onClick={() => loadChain(chain)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    width: '100%',
                    minHeight: '56px',
                    textAlign: 'left',
                    background: TOKENS.colors.surface,
                    color: TOKENS.colors.textPrimary,
                    border: `1px solid ${TOKENS.colors.emeraldDim}`,
                    borderRadius: TOKENS.radii.card,
                    padding: '0.9rem 1.1rem',
                    cursor: 'pointer',
                    fontFamily: TOKENS.typography.fontFamily,
                  }}
                >
                  <span style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
                    {chain.emoji}
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{chain.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

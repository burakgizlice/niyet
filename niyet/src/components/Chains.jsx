import { TOKENS } from '../tokens'

/**
 * Block 12: read-only chains list (tap to load). Block 13: adds an edit pencil
 * per row and a 'Yeni zincir' entry point. The list stays calm — no delete in
 * the row (delete lives inside ChainEdit, spec Q2/13.5) to avoid accidental
 * destructive taps in a packed mobile list.
 *
 * Receives `chains` + navigation setters as props: App owns the single useChains
 * instance, so this component must not call the hook itself.
 *
 * @param {{
 *   chains: import('../data/defaultChains').Chain[],
 *   setView: (view: string) => void,
 *   setSelectedChain: (chain: import('../data/defaultChains').Chain | null) => void,
 *   appendSteps: (steps: string[]) => void,
 * }} props
 */
export default function Chains({ chains, setView, setSelectedChain, appendSteps }) {
  const loadChain = (chain) => {
    appendSteps(chain.steps)
    setView('main')
  }

  const editChain = (chain) => {
    setSelectedChain(chain)
    setView('chain-edit')
  }

  const createNew = () => {
    setSelectedChain(null)
    setView('chain-edit')
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
              <li
                key={chain.id}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: '8px',
                  background: TOKENS.colors.surface,
                  border: `1px solid ${TOKENS.colors.emeraldDim}`,
                  borderRadius: TOKENS.radii.card,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => loadChain(chain)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flex: 1,
                    minHeight: '56px',
                    textAlign: 'left',
                    background: 'transparent',
                    color: TOKENS.colors.textPrimary,
                    border: 'none',
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
                <button
                  type="button"
                  onClick={() => editChain(chain)}
                  aria-label="Düzenle"
                  style={{
                    flexShrink: 0,
                    width: '52px',
                    background: 'transparent',
                    color: TOKENS.colors.textMuted,
                    border: 'none',
                    borderLeft: `1px solid ${TOKENS.colors.emeraldDim}`,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                  }}
                >
                  ✎
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={createNew}
          style={{
            alignSelf: 'center',
            marginTop: '1.5rem',
            background: TOKENS.colors.surfaceRaised,
            color: TOKENS.colors.gold,
            fontWeight: 600,
            fontSize: '1rem',
            border: `1px solid ${TOKENS.colors.gold}`,
            borderRadius: '999px',
            padding: '10px 24px',
            minHeight: '44px',
            cursor: 'pointer',
          }}
        >
          + Yeni zincir
        </button>
      </div>
    </div>
  )
}

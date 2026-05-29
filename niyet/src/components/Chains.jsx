import { useState } from 'react'
import { TOKENS } from '../tokens'

/**
 * Block 12: read-only chains list (tap to load). Block 13: adds an edit pencil
 * and a delete (🗑) action per row plus a 'Yeni zincir' entry point. Row delete
 * uses an inline two-step confirm (🗑 → ✓/✕) so a packed mobile list can't
 * delete on a single accidental tap. Delete also lives inside ChainEdit.
 *
 * Receives `chains` + navigation setters as props: App owns the single useChains
 * instance, so this component must not call the hook itself.
 *
 * @param {{
 *   chains: import('../data/defaultChains').Chain[],
 *   setView: (view: string) => void,
 *   setSelectedChain: (chain: import('../data/defaultChains').Chain | null) => void,
 *   appendSteps: (steps: string[]) => void,
 *   deleteChain: (id: string) => void,
 * }} props
 */
export default function Chains({ chains, setView, setSelectedChain, appendSteps, deleteChain }) {
  // Which row is showing its inline delete confirm. Null = none. Keeps the
  // destructive tap two-step so a packed mobile list can't delete on one touch.
  const [confirmingId, setConfirmingId] = useState(null)

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
            color: TOKENS.colors.textPrimary,
            fontFamily: TOKENS.fonts.display,
            fontSize: '2rem',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            margin: '8px 0 10px',
          }}
        >
          Zincirler
        </h1>
        <div className="niyet-gold-rule" style={{ maxWidth: '120px', marginBottom: '20px' }} />

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
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${TOKENS.lines.emerald}`,
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
                  <span
                    style={{
                      fontFamily: TOKENS.fonts.display,
                      fontSize: '1.2rem',
                      fontWeight: 500,
                    }}
                  >
                    {chain.name}
                  </span>
                </button>
                {confirmingId === chain.id ? (
                  <div style={{ display: 'flex', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        deleteChain(chain.id)
                        setConfirmingId(null)
                      }}
                      aria-label="Silmeyi onayla"
                      style={{
                        width: '52px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      aria-label="Vazgeç"
                      style={{
                        width: '52px',
                        background: 'transparent',
                        color: TOKENS.colors.textMuted,
                        border: 'none',
                        borderLeft: `1px solid ${TOKENS.colors.emeraldDim}`,
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
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
                    <button
                      type="button"
                      onClick={() => setConfirmingId(chain.id)}
                      aria-label="Sil"
                      style={{
                        flexShrink: 0,
                        width: '52px',
                        background: 'transparent',
                        color: '#ef4444',
                        border: 'none',
                        borderLeft: `1px solid ${TOKENS.colors.emeraldDim}`,
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                      }}
                    >
                      🗑
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={createNew}
          className="niyet-shimmer"
          style={{
            alignSelf: 'center',
            marginTop: '1.75rem',
            background: TOKENS.gradients.goldButton,
            color: '#2a1e05',
            fontFamily: TOKENS.fonts.ui,
            fontWeight: 700,
            fontSize: '1rem',
            border: 'none',
            borderRadius: TOKENS.radii.pill,
            padding: '12px 28px',
            minHeight: '46px',
            cursor: 'pointer',
            boxShadow: TOKENS.shadows.gold,
          }}
        >
          + Yeni zincir
        </button>
      </div>
    </div>
  )
}

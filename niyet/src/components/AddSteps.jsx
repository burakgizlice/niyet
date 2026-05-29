import React from 'react'
import { TOKENS } from '../tokens'

/**
 * Block 9: full-screen add-steps overlay. Fully controlled — it holds only the
 * textarea text locally and delegates navigation + queue mutation to the parent
 * via callbacks (Q1). One step per line; Cmd/Ctrl+Enter or the visible 'Ekle'
 * button submits. Empty input (all lines blank after trim) is a no-op.
 *
 * @param {{ onBack: () => void, onSubmit: (lines: string[]) => void }} props
 */
export default function AddSteps({ onBack, onSubmit }) {
  const [text, setText] = React.useState('')
  const textareaRef = React.useRef(null)

  React.useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const canSubmit = lines.length > 0

  const handleSubmit = () => {
    if (!canSubmit) return // empty submit is a silent no-op (Q5 guard)
    onSubmit(lines)
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
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
          onClick={onBack}
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
          Adım Ekle
        </h1>
        <div className="niyet-gold-rule" style={{ maxWidth: '120px', marginBottom: '20px' }} />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Her satıra bir adım yaz…"
          rows={8}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            background: TOKENS.colors.surface,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: TOKENS.colors.textPrimary,
            border: `1px solid ${TOKENS.lines.emerald}`,
            borderRadius: TOKENS.radii.card,
            padding: '1.1rem',
            fontSize: '1.1rem',
            lineHeight: '1.5',
            fontFamily: TOKENS.fonts.ui,
            outline: 'none',
          }}
        />

        <p
          style={{
            color: TOKENS.colors.textDim,
            fontSize: '0.8rem',
            margin: '8px 2px 0',
          }}
        >
          Cmd/Ctrl + Enter ile ekle
        </p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={canSubmit ? 'niyet-shimmer' : undefined}
          style={{
            marginTop: '18px',
            background: canSubmit ? TOKENS.gradients.goldButton : 'rgba(31,177,121,0.06)',
            color: canSubmit ? '#2a1e05' : TOKENS.colors.textDim,
            fontFamily: TOKENS.fonts.ui,
            fontWeight: 700,
            fontSize: '1rem',
            border: canSubmit ? 'none' : `1px solid ${TOKENS.lines.hair}`,
            borderRadius: TOKENS.radii.pill,
            padding: '13px 24px',
            minHeight: '46px',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? TOKENS.shadows.gold : 'none',
            transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
          }}
        >
          Ekle
        </button>
      </div>
    </div>
  )
}

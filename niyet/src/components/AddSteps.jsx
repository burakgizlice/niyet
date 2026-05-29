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
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '8px 0 16px',
          }}
        >
          Adım Ekle
        </h1>

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
            color: TOKENS.colors.textPrimary,
            border: `1px solid ${TOKENS.colors.emeraldDim}`,
            borderRadius: TOKENS.radii.card,
            padding: '1rem',
            fontSize: '1.1rem',
            lineHeight: '1.5',
            fontFamily: TOKENS.typography.fontFamily,
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
          style={{
            marginTop: '16px',
            background: canSubmit ? TOKENS.colors.emerald : 'rgba(255,255,255,0.06)',
            color: canSubmit ? '#000' : TOKENS.colors.textDim,
            fontWeight: 700,
            fontSize: '1rem',
            border: `1px solid ${canSubmit ? TOKENS.colors.gold : 'transparent'}`,
            borderRadius: '999px',
            padding: '12px 24px',
            minHeight: '44px',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
        >
          Ekle
        </button>
      </div>
    </div>
  )
}

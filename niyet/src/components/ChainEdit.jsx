import React from 'react'
import { TOKENS } from '../tokens'
import { isOneEmoji } from '../lib/utils'

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: TOKENS.colors.surface,
  color: TOKENS.colors.textPrimary,
  border: `1px solid ${TOKENS.colors.emeraldDim}`,
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '1rem',
  fontFamily: TOKENS.typography.fontFamily,
  outline: 'none',
  minHeight: '44px',
}

const labelStyle = {
  display: 'block',
  color: TOKENS.colors.textMuted,
  fontSize: '0.85rem',
  fontWeight: 600,
  margin: '16px 0 6px',
}

const errorStyle = { color: '#ef4444', fontSize: '0.8rem', margin: '4px 2px 0' }

// Curated palette so users tap instead of hunting for an emoji to paste. Leads
// with the 7 default-chain emoji (so edit mode highlights a match) then common
// routine/habit picks. The free-text field below remains for anything else.
const EMOJI_PALETTE = [
  '🕌', '🔬', '☀️', '💧', '🌙', '🧹', '☕',
  '🏃', '🧘', '📚', '📝', '🎯', '💪', '🌱',
  '🧠', '⏰', '🙏', '🥗', '💊', '🚿', '🦷', '🛏️',
]

/**
 * Block 13: create/edit form for a chain. `chain === null` is create mode;
 * a chain object is edit mode. Local-only state (the form never reads the hook
 * directly — App owns the single useChains instance). onSave receives just the
 * mutable fields; App decides create vs update. Delete/reset are surfaced as
 * onDelete/onReset so the destructive logic stays in the hook.
 *
 * Any chain can be deleted via an inline 'Sil' → confirmation strip (no modal).
 * is_default chains additionally get a 'Sıfırla' button that restores seed values.
 *
 * @param {{
 *   chain: import('../data/defaultChains').Chain | null,
 *   onSave: (data: { name: string, emoji: string, steps: string[] }) => void,
 *   onCancel: () => void,
 *   onDelete: (id: string) => void,
 *   onReset: (id: string) => void,
 * }} props
 */
export default function ChainEdit({ chain, onSave, onCancel, onDelete, onReset }) {
  const isDefault = chain?.is_default === true
  const [name, setName] = React.useState(chain?.name ?? '')
  const [emoji, setEmoji] = React.useState(chain?.emoji ?? '')
  const [stepsText, setStepsText] = React.useState(chain ? chain.steps.join('\n') : '')
  const [errors, setErrors] = React.useState({})
  const [deleteConfirming, setDeleteConfirming] = React.useState(false)
  const [resetToastVisible, setResetToastVisible] = React.useState(false)
  const resetTimerRef = React.useRef(null)

  React.useEffect(() => () => clearTimeout(resetTimerRef.current), [])

  const handleSave = () => {
    const trimmedName = name.trim()
    const trimmedEmoji = emoji.trim()
    const stepsLines = stepsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const nextErrors = {}
    if (trimmedName.length === 0) nextErrors.name = 'Zincir adı boş olamaz'
    if (!isOneEmoji(trimmedEmoji)) nextErrors.emoji = 'Tek bir emoji gir'
    if (stepsLines.length === 0) nextErrors.steps = 'En az bir adım ekle'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    onSave({ name: trimmedName, emoji: trimmedEmoji, steps: stepsLines })
  }

  const handleReset = () => {
    onReset(chain.id)
    setName(chain.name)
    setEmoji(chain.emoji)
    setStepsText(chain.steps.join('\n'))
    setResetToastVisible(true)
    clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => setResetToastVisible(false), 1500)
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
          onClick={onCancel}
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
            margin: '8px 0 8px',
          }}
        >
          {chain ? 'Zinciri Düzenle' : 'Yeni Zincir'}
        </h1>

        <label style={labelStyle} htmlFor="chain-name">
          Zincir adı
        </label>
        <input
          id="chain-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sabah ritüeli…"
          style={inputStyle}
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}

        <label style={labelStyle}>Emoji</label>
        <div
          role="radiogroup"
          aria-label="Emoji seç"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        >
          {EMOJI_PALETTE.map((option) => {
            const selected = emoji === option
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setEmoji(option)}
                style={{
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  background: selected ? TOKENS.colors.surfaceRaised : TOKENS.colors.surface,
                  border: `2px solid ${selected ? TOKENS.colors.gold : TOKENS.colors.emeraldDim}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                {option}
              </button>
            )
          })}
        </div>
        <label style={{ ...labelStyle, margin: '10px 0 6px', fontSize: '0.8rem' }} htmlFor="chain-emoji">
          veya kendin yaz
        </label>
        <input
          id="chain-emoji"
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="☀️"
          maxLength={8}
          style={{ ...inputStyle, width: '5rem', textAlign: 'center', fontSize: '1.5rem' }}
        />
        {errors.emoji && <p style={errorStyle}>{errors.emoji}</p>}

        <label style={labelStyle} htmlFor="chain-steps">
          Adımlar (her satıra bir adım)
        </label>
        <textarea
          id="chain-steps"
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          placeholder={'Yüzünü yıka\nSu iç\n…'}
          rows={8}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
        />
        {errors.steps && <p style={errorStyle}>{errors.steps}</p>}

        <button
          type="button"
          onClick={handleSave}
          style={{
            marginTop: '20px',
            background: TOKENS.colors.emerald,
            color: '#000',
            fontWeight: 700,
            fontSize: '1rem',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            minHeight: '44px',
            cursor: 'pointer',
          }}
        >
          Kaydet
        </button>

        {/* Reset + destructive zone. Defaults additionally get Sıfırla to restore
            seed values; any chain (defaults included) can be deleted via the
            inline two-step confirm. */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isDefault && (
            <div>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'transparent',
                  color: TOKENS.colors.gold,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  border: `1px solid ${TOKENS.colors.gold}`,
                  borderRadius: '8px',
                  padding: '10px 18px',
                  minHeight: '44px',
                  cursor: 'pointer',
                }}
              >
                Sıfırla
              </button>
              {resetToastVisible && (
                <p style={{ color: TOKENS.colors.textMuted, fontSize: '0.85rem', marginTop: '8px' }}>
                  Varsayılana döndürüldü
                </p>
              )}
            </div>
          )}

          {chain && !deleteConfirming && (
            <button
              type="button"
              onClick={() => setDeleteConfirming(true)}
              style={{
                alignSelf: 'flex-start',
                background: 'transparent',
                color: '#ef4444',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: '1px solid rgba(239,68,68,0.5)',
                borderRadius: '8px',
                padding: '10px 18px',
                minHeight: '44px',
                cursor: 'pointer',
              }}
            >
              Sil
            </button>
          )}

          {chain && deleteConfirming && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <p style={{ color: TOKENS.colors.textPrimary, fontSize: '0.95rem', margin: '0 0 10px' }}>
                Silmek istediğine emin misin?
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(chain.id)
                    onCancel()
                  }}
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    minHeight: '44px',
                    cursor: 'pointer',
                  }}
                >
                  Evet, sil
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirming(false)}
                  style={{
                    background: 'transparent',
                    color: TOKENS.colors.textMuted,
                    fontSize: '0.9rem',
                    border: `1px solid ${TOKENS.colors.emeraldDim}`,
                    borderRadius: '8px',
                    padding: '10px 18px',
                    minHeight: '44px',
                    cursor: 'pointer',
                  }}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

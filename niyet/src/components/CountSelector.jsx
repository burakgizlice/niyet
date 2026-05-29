import React from 'react'
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
              background: active
                ? TOKENS.colors.gold
                : 'rgba(255,255,255,0.08)',
              color: active ? '#000' : TOKENS.colors.textMuted,
              fontWeight: active ? 700 : 400,
              borderRadius: '999px',
              padding: '6px 16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              minWidth: '40px',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

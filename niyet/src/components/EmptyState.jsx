import { TOKENS } from '../tokens'

/**
 * Block 11: calm empty-state copy for the single-step area. Pure presentational —
 * receives only `hasDone` so it stays decoupled from the queue/done hook shapes
 * (spec Q4). Two messages: nothing-done (Message A) vs. queue-cleared-after-work
 * (Message B). 'zincir' is forward copy for Block 12 chains, kept verbatim per
 * PRD even though chains aren't built yet (spec Q1). No buttons/icons — the
 * action bar below already owns the affordances (spec Q3).
 *
 * @param {{ hasDone: boolean }} props
 */
export default function EmptyState({ hasDone }) {
  return (
    <div
      className="niyet-fade-up"
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem 1.5rem',
        maxWidth: '360px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
      }}
    >
      <span
        lang="ar"
        dir="rtl"
        aria-hidden="true"
        style={{
          fontFamily: TOKENS.fonts.arabic,
          fontSize: '2.6rem',
          lineHeight: 1,
          color: TOKENS.colors.gold,
          opacity: 0.85,
          textShadow: '0 0 24px rgba(217,180,90,0.3)',
        }}
      >
        نية
      </span>
      <div className="niyet-gold-rule" style={{ maxWidth: '90px' }} />
      <p
        style={{
          margin: 0,
          fontFamily: TOKENS.fonts.display,
          fontStyle: 'italic',
          fontWeight: 400,
          color: TOKENS.colors.textPrimary,
          fontSize: '1.25rem',
          lineHeight: 1.5,
        }}
      >
        {hasDone
          ? 'Sıra temiz. Başardın.'
          : 'Sırada bir şey yok.'}
      </p>
      <p
        style={{
          margin: 0,
          color: TOKENS.colors.textMuted,
          fontSize: '0.95rem',
          lineHeight: 1.6,
        }}
      >
        {hasDone
          ? 'Başka bir zincir yükle ya da dinlen — bunu hak ettin.'
          : 'Bir adım ekle ya da bir zincir yükle.'}
      </p>
    </div>
  )
}

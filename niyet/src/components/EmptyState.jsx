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
      style={{
        textAlign: 'center',
        color: TOKENS.colors.textMuted,
        fontSize: '1.1rem',
        lineHeight: 1.6,
        padding: '2rem 1rem',
        maxWidth: '340px',
        margin: '0 auto',
      }}
    >
      {hasDone
        ? 'Sıra temiz. Başardın. Başka bir zincir yükle ya da dinlen — bunu hak ettin.'
        : 'Sırada bir şey yok — bir adım ekle ya da bir zincir yükle.'}
    </div>
  )
}

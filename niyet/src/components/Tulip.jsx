/**
 * A single lale (tulip) — the pink 🌷 emoji, glossy and warm. Sized by prop so
 * the parent (Bostan) can step the whole bed smaller as the count grows.
 *
 * The tulips overlap because Bostan lays them out in grid cells narrower than
 * the glyph, so each spills over its neighbours — a densely planted bed. This
 * component just draws and animates one glyph. Animation lives in
 * styles/bostan.css: every tulip sways on an idle "breeze" (staggered by
 * --breeze-delay); the newest gets `.planting` for one grow-in.
 *
 * @param {{ size?: number, index?: number, planting?: boolean }} props
 */
export default function Tulip({ size = 28, index = 0, planting = false }) {
  return (
    <span
      className={`tulip${planting ? ' planting' : ''}`}
      // Negative, index-spread delays desync the breeze so the bed shimmers
      // like a real field rather than swaying in unison.
      style={{
        '--breeze-delay': `${((index % 6) * -0.73).toFixed(2)}s`,
        fontSize: `${size}px`,
        lineHeight: 1,
        display: 'block',
        textAlign: 'center',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      🌷
    </span>
  )
}

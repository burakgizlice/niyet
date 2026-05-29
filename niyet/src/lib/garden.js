// Block 8 (reskinned): pure helpers for the "bostan" tulip-garden growth curve.
// Replaces the old single-flame curve. Kept out of Bostan.jsx so the component
// file exports only a component (HMR/fast-refresh) and so these stay trivially
// unit-testable.
//
// Concept: every completed micro-action plants one gold-line tulip (lale, the
// Ottoman flower). As the count climbs the per-tulip size steps DOWN so the bed
// packs denser — the garden flourishes inside a fixed footprint instead of one
// glyph just getting bigger. Tiers align with the milestone breakpoints
// (3/5/7/10) so the bed visibly re-tightens on the same completion the label
// changes. Highest threshold first so find() picks the top match.

const GARDEN_TIERS = [
  { min: 20, size: 15 },
  { min: 10, size: 18 },
  { min: 7, size: 21 },
  { min: 5, size: 24 },
  { min: 3, size: 28 },
  { min: 0, size: 32 },
]

/** Pure: streak count -> { size } px for each tulip glyph. */
export function getGardenStyle(n) {
  const tier = GARDEN_TIERS.find((t) => n >= t.min)
  return { size: tier.size }
}

/**
 * Pure: how many columns the bed lays out at a given count.
 *
 * Vertical-first: tulips stack 3 per row and fill DOWN to a 3×3 block (9). Past
 * that the bed grows "balanced" — near-square (columns ≈ rows) via ceil(√n) —
 * so it expands horizontally and vertically in step rather than only sideways.
 *   1–9  -> 3 cols (1, 2, 3 rows)
 *   10   -> 4 cols / 3 rows … 16 -> 4×4 … 25 -> 5×5 …
 */
export function getColumns(n) {
  if (n <= 9) return 3
  return Math.ceil(Math.sqrt(n))
}

/** Pure: Turkish bostan milestone label, or null below 3 (no early chrome). */
export function getMilestoneLabel(n) {
  if (n >= 10) return 'Koca bir bostan!'
  if (n >= 7) return 'Laleler açtı'
  if (n >= 5) return 'Bostan büyüyor'
  if (n >= 3) return 'Filizlendi'
  return null
}

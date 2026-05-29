// Block 8: pure helpers for the fire/streak growth curve. Kept out of
// FireBadge.jsx so the component file exports only a component (HMR/fast-refresh)
// and so these stay trivially unit-testable.

// Discrete 5-tier growth curve. Tiers align with the milestone breakpoints
// (3/5/7/10) so the flame visibly grows on the same completion the label
// changes. Highest threshold first so the find() below picks the top match.
const FLAME_TIERS = [
  { min: 10, scale: 1.6, filter: 'drop-shadow(0 0 28px #fbbf24ff)' },
  { min: 7, scale: 1.42, filter: 'drop-shadow(0 0 20px #f59e0bee)' },
  { min: 5, scale: 1.28, filter: 'drop-shadow(0 0 14px #f59e0bcc)' },
  { min: 3, scale: 1.15, filter: 'drop-shadow(0 0 8px #f59e0baa)' },
  { min: 1, scale: 1.0, filter: 'drop-shadow(0 0 4px #f59e0b66)' },
  { min: 0, scale: 0.85, filter: 'none' },
]

/** Pure: streak count -> { scale, filter } for the flame glyph. */
export function getFlameStyle(n) {
  const tier = FLAME_TIERS.find((t) => n >= t.min)
  return { scale: tier.scale, filter: tier.filter }
}

/** Pure: Turkish milestone label, or null below 3. */
export function getMilestoneLabel(n) {
  if (n >= 10) return 'Durdurulamazsın 🔥'
  if (n >= 7) return 'Alev aldın!'
  if (n >= 5) return 'Devam et!'
  if (n >= 3) return 'Güzel gidiyor'
  return null
}

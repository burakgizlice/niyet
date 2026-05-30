// Block 3: single source of truth for the visible-card depth hierarchy.
// Index 0 is the primary (full-weight) card; each subsequent index shrinks and
// dims so secondary cards never compete with the current action (PRD §3.1).
//
// Lookup with the index clamped at the last entry, so any card at position >= 3
// reuses the index-3 "ghost" values:
//   const ramp = CARD_RAMP[Math.min(index, CARD_RAMP.length - 1)]
export const CARD_RAMP = [
  { scale: 1.0, opacity: 1.0 },
  { scale: 0.88, opacity: 0.65 },
  { scale: 0.76, opacity: 0.42 },
  { scale: 0.64, opacity: 0.26 },
]

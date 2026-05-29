// Block 2: single source of truth for design-token values.
// Components import and read these directly in inline styles (no var() round-trips).
export const TOKENS = {
  colors: {
    bg: '#0a1a12',
    surface: '#0f2318',
    surfaceRaised: '#163320',
    emerald: '#10b981',
    emeraldDim: '#065f46',
    gold: '#d4af37',
    goldLight: '#f0d060',
    textPrimary: '#f0fdf4',
    textMuted: '#6b9e7a',
    textDim: '#3d6b4f',
    error: '#e74c3c',
  },
  typography: {
    taskFontSize: '2rem',
    taskLineHeight: '1.3',
    taskFontWeight: '600',
    taskLetterSpacing: '-0.01em',
    uiFontSize: '0.9rem',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  spacing: {
    containerMaxWidth: '480px',
    cardPaddingV: '2.5rem',
    cardPaddingH: '2rem',
    countMarginTop: '1.25rem',
  },
  radii: {
    card: '1.25rem',
  },
}

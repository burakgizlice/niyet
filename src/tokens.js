// Single source of truth for design-token values. Components import and read
// these directly into inline styles (no var() round-trips).
//
// Brand: "niyet" (نية, intention) — Aref Ruqaa calligraphy, deep emerald
// squircle (#17A86C → #0E7A4D → #085236), warm cream lettering (#F6F4E9), and
// fine gold lines (girih geometry + hairline rules). The reskin keeps every
// legacy key so existing components keep working; values are rebranded and new
// groups (fonts/gradients/shadows/lines/motion) are layered on top.

const FONT_DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const FONT_UI = "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif"
const FONT_ARABIC = "'Aref Ruqaa', Georgia, serif"

export const TOKENS = {
  colors: {
    // Surfaces — deep emerald night so cream + gold carry the eye. `bg` is
    // transparent so every full-screen container reveals the body atmosphere
    // (emerald glow + gold girih) defined in index.css.
    bg: 'transparent',
    bgSolid: '#06160E',
    bgDeep: '#040F09',
    surface: 'rgba(14, 52, 34, 0.55)',
    surfaceRaised: 'rgba(21, 67, 44, 0.74)',
    surfaceSolid: '#0E2A1B',

    // Emerald — sourced from the brand squircle gradient.
    emerald: '#1FB179',
    emeraldBright: '#34D99A',
    emeraldDim: '#1F5C3F',
    emeraldDeep: '#085236',

    // Gold — refined, warmer than the old #d4af37.
    gold: '#D9B45A',
    goldLight: '#F2D98A',
    goldDeep: '#A8842F',

    // Text — brand cream descending into sage.
    textPrimary: '#F6F4E9',
    textMuted: '#9DBFA9',
    textDim: '#5E806B',
    error: '#E2574C',
  },

  // Functional UI fonts: Fraunces (display/serif) + Hanken Grotesk (UI).
  // Aref Ruqaa is reserved for the Arabic نية brand accent only.
  fonts: {
    display: FONT_DISPLAY,
    ui: FONT_UI,
    arabic: FONT_ARABIC,
  },

  typography: {
    taskFontSize: '2rem',
    taskLineHeight: '1.28',
    taskFontWeight: '500',
    taskLetterSpacing: '-0.015em',
    uiFontSize: '0.9rem',
    // Legacy key — now points at the UI stack so any consumer reading it is on-brand.
    fontFamily: FONT_UI,
  },

  spacing: {
    containerMaxWidth: '480px',
    cardPaddingV: '2.5rem',
    cardPaddingH: '2rem',
    countMarginTop: '1.25rem',
  },

  radii: {
    card: '22px',
    sm: '13px',
    pill: '999px',
  },

  // Gold-line gradients + brand surfaces.
  gradients: {
    goldButton: 'linear-gradient(135deg, #F2D98A 0%, #D9B45A 46%, #B5912F 100%)',
    goldSheen: 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%)',
    emeraldButton: 'linear-gradient(135deg, #22B97E 0%, #0E7A4D 100%)',
    brandSquircle: 'linear-gradient(135deg, #17A86C 0%, #0E7A4D 55%, #085236 100%)',
    // Horizontal hairline that fades at both ends — the signature gold rule.
    goldRule: 'linear-gradient(90deg, transparent, rgba(217,180,90,0.55) 18%, rgba(242,217,138,0.9) 50%, rgba(217,180,90,0.55) 82%, transparent)',
    cardGlass: 'linear-gradient(160deg, rgba(34,90,60,0.55) 0%, rgba(12,42,28,0.62) 100%)',
  },

  shadows: {
    card: '0 22px 60px -18px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
    soft: '0 10px 30px -12px rgba(0,0,0,0.55)',
    gold: '0 10px 30px -8px rgba(217,180,90,0.45)',
    emerald: '0 10px 30px -8px rgba(31,177,121,0.4)',
  },

  // Reusable hairline border colors.
  lines: {
    gold: 'rgba(217,180,90,0.45)',
    goldFaint: 'rgba(217,180,90,0.2)',
    emerald: 'rgba(31,177,121,0.22)',
    hair: 'rgba(246,244,233,0.08)',
  },

  motion: {
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
}

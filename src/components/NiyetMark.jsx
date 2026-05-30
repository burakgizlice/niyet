import { TOKENS } from '../tokens'

/**
 * The breathing نية brand mark (Aref Ruqaa) — reused wherever a "working" state
 * wants the calligraphy treatment instead of a generic spinner (the Block 19
 * refresh button + pull-to-refresh indicator, mirroring App's LoadingScreen).
 * Pulses via the shared `niyetBreath` keyframes in index.css.
 *
 * @param {{ size?: number, glow?: boolean, breathing?: boolean }} props
 *   size — glyph font size in px. glow — render the soft radial halo behind it.
 *   breathing — run the opacity/scale pulse (off for a static, pull-driven mark).
 */
export default function NiyetMark({ size = 28, glow = false, breathing = true }) {
  const breath = breathing ? 'niyetBreath 2.4s ease-in-out infinite' : 'none'
  // Halo + glyph-shadow scale with the glyph so the mark reads the same at a
  // 16px button and a 72px loading screen (≈30px shadow at 72, ≈7px at 16).
  const shadowBlur = Math.round(size * 0.42)
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size * 2}px`,
        height: `${size * 2}px`,
      }}
    >
      {glow && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(31,177,121,0.28), transparent 70%)',
            filter: 'blur(4px)',
            animation: breath,
          }}
        />
      )}
      <span
        lang="ar"
        dir="rtl"
        style={{
          position: 'relative',
          fontFamily: TOKENS.fonts.arabic,
          color: TOKENS.colors.goldLight,
          fontSize: `${size}px`,
          lineHeight: 1,
          textShadow: `0 0 ${shadowBlur}px rgba(217,180,90,0.45)`,
          animation: breath,
        }}
      >
        نية
      </span>
    </span>
  )
}

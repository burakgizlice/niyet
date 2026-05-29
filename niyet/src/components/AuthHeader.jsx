import { TOKENS } from '../tokens'
import { useAuth } from '../hooks/useAuth'

/**
 * Block 17 (C4): the header auth affordance. Reads session/user from useAuth
 * internally and calls signOut itself — the parent passes only onOpenAuth.
 *
 * Logged out: a compact 'Eşitle' button (cloud glyph + label).
 * Logged in: a subtle pill with the user's avatar/initials + 'Çıkış Yap'.
 *
 * @param {{ onOpenAuth: () => void }} props
 */
export default function AuthHeader({ onOpenAuth }) {
  const { session, user, signOut } = useAuth()

  if (!session) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: TOKENS.colors.surface,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: TOKENS.colors.textMuted,
          fontFamily: TOKENS.fonts.ui,
          border: `1px solid ${TOKENS.lines.emerald}`,
          borderRadius: TOKENS.radii.pill,
          padding: '6px 14px',
          minHeight: '36px',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        <CloudIcon />
        Eşitle
      </button>
    )
  }

  const avatarUrl = user?.user_metadata?.avatar_url
  const initial = (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          width={24}
          height={24}
          style={{ borderRadius: '50%', display: 'block' }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: TOKENS.gradients.brandSquircle,
            border: `1px solid ${TOKENS.lines.goldFaint}`,
            color: TOKENS.colors.goldLight,
            fontFamily: TOKENS.fonts.display,
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          {initial}
        </span>
      )}
      <button
        type="button"
        onClick={signOut}
        style={{
          background: 'transparent',
          border: 'none',
          color: TOKENS.colors.textMuted,
          fontSize: '0.8rem',
          cursor: 'pointer',
          padding: '4px 2px',
        }}
      >
        Çıkış Yap
      </button>
    </div>
  )
}

function CloudIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 18h10a4 4 0 0 0 .5-7.97 6 6 0 0 0-11.6-1.2A3.5 3.5 0 0 0 7 18z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

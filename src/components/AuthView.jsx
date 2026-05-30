import React from 'react'
import { TOKENS } from '../tokens'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Block 17: the Sync / auth screen. Full-screen overlay mirroring AddSteps.
 * Receives only actions (no session) — it does not need to know when sign-in
 * completes; the AuthProvider listener drives header + view transitions.
 *
 * @param {{
 *   onBack: () => void,
 *   signInWithMagicLink: (email: string) => Promise<{ error: { message?: string } | null }>,
 *   signInWithGoogle: () => void,
 * }} props
 */
export default function AuthView({ onBack, signInWithMagicLink, signInWithGoogle }) {
  const [email, setEmail] = React.useState('')
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [sending, setSending] = React.useState(false)

  const handleSend = async () => {
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setSent(false)
      setError('Geçerli bir e-posta adresi gir.')
      return
    }
    setSending(true)
    setError(null)
    const { error: sendError } = await signInWithMagicLink(trimmed)
    setSending(false)
    if (sendError) {
      setSent(false)
      setError('Bağlantı gönderilemedi. Lütfen tekrar dene.')
      return
    }
    setSent(true)
  }

  // Typing again invalidates the previous send/error feedback.
  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (sent) setSent(false)
    if (error) setError(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: TOKENS.colors.bg,
        padding: '1.5rem 1rem',
      }}
    >
      <div
        style={{
          maxWidth: TOKENS.spacing.containerMaxWidth,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 'none',
            color: TOKENS.colors.textMuted,
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '8px 4px',
            minHeight: '44px',
          }}
        >
          ← Geri
        </button>

        <h1
          style={{
            color: TOKENS.colors.textPrimary,
            fontFamily: TOKENS.fonts.display,
            fontSize: '2rem',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            margin: '8px 0 10px',
          }}
        >
          Cihazlar arası eşitle
        </h1>
        <div className="niyet-gold-rule" style={{ maxWidth: '120px', marginBottom: '16px' }} />
        <p
          style={{
            color: TOKENS.colors.textMuted,
            fontSize: '0.95rem',
            lineHeight: 1.55,
            margin: '0 0 24px',
          }}
        >
          Telefonunda başladığın adımları bilgisayarında devam ettir.
        </p>

        <input
          type="email"
          value={email}
          onChange={handleEmailChange}
          onKeyDown={handleKeyDown}
          placeholder="e-posta adresin"
          autoComplete="email"
          inputMode="email"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: TOKENS.colors.surface,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: TOKENS.colors.textPrimary,
            border: `1px solid ${TOKENS.lines.emerald}`,
            borderRadius: TOKENS.radii.card,
            padding: '0.95rem 1.1rem',
            fontSize: '1.1rem',
            fontFamily: TOKENS.fonts.ui,
            outline: 'none',
          }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className={sending ? undefined : 'niyet-shimmer'}
          style={{
            marginTop: '14px',
            background: sending ? 'rgba(31,177,121,0.06)' : TOKENS.gradients.goldButton,
            color: sending ? TOKENS.colors.textDim : '#2a1e05',
            fontFamily: TOKENS.fonts.ui,
            fontWeight: 700,
            fontSize: '1rem',
            border: 'none',
            borderRadius: TOKENS.radii.pill,
            padding: '13px 24px',
            minHeight: '46px',
            cursor: sending ? 'not-allowed' : 'pointer',
            boxShadow: sending ? 'none' : TOKENS.shadows.gold,
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {sending ? 'Gönderiliyor…' : 'Sihirli bağlantı gönder'}
        </button>

        {sent && (
          <p
            style={{
              color: TOKENS.colors.emerald,
              fontSize: '0.9rem',
              lineHeight: 1.5,
              margin: '12px 2px 0',
            }}
          >
            Bağlantı gönderildi — e-postanı kontrol et. Bu sekmeyi açık tut.
          </p>
        )}
        {error && (
          <p
            style={{
              color: TOKENS.colors.error,
              fontSize: '0.9rem',
              lineHeight: 1.5,
              margin: '12px 2px 0',
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0',
          }}
        >
          <span
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(217,180,90,0.45))',
            }}
          />
          <span style={{ color: TOKENS.colors.textDim, fontSize: '0.8rem' }}>veya</span>
          <span
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, rgba(217,180,90,0.45), transparent)',
            }}
          />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            background: '#fff',
            color: '#1f1f1f',
            fontWeight: 600,
            fontSize: '1rem',
            border: 'none',
            borderRadius: '999px',
            padding: '12px 24px',
            minHeight: '44px',
            cursor: 'pointer',
          }}
        >
          <GoogleIcon />
          Google ile devam et
        </button>

        <p
          style={{
            color: TOKENS.colors.textDim,
            fontSize: '0.8rem',
            textAlign: 'center',
            margin: '24px 0 0',
          }}
        >
          Şifre yok. Hesap oluşturmak gerekmez.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

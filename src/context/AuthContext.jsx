import React from 'react'
import { supabase } from '../lib/supabase'
import { REDIRECT_URL } from '../lib/authConfig'

/**
 * Block 17 (decision C4): the single owner of auth state. Holds { session, user,
 * loading } plus the onAuthStateChange subscription and every auth action.
 * Components — including Block 18 sync logic — reach user/session through
 * useAuth() rather than prop drilling. Only the App view state stays prop-based.
 *
 * Default value is null so useAuth() throws when used outside the provider,
 * matching the StreakContext convention.
 */
// eslint-disable-next-line react-refresh/only-export-components -- context + provider + hook co-located by design
export const AuthContext = React.createContext(null)

// Strip the OAuth/magic-link token fragment (#access_token=…) or PKCE ?code= from
// the address bar once Supabase has exchanged it for a session, so tokens don't
// linger in browser history. Pathname-only replace keeps the SPA on its route.
function clearAuthParamsFromUrl() {
  if (window.location.hash || window.location.search) {
    window.history.replaceState(null, '', window.location.pathname)
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = React.useState(null)
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true

    // Restore any persisted session on mount. Supabase v2 also auto-detects the
    // #access_token / ?code= on the URL and exchanges it before this resolves,
    // so getSession() already reflects a fresh deep-link login.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (event === 'SIGNED_IN') {
        clearAuthParamsFromUrl()
        // Block 18: the merge-on-login itself runs in App.jsx, keyed off the
        // user.id rising edge — App owns the queue/done/chains hooks whose state
        // mergeOnLogin hydrates, so it lives there rather than in this provider
        // (C4). The profiles row is created by the handle_new_user DB trigger
        // (C3); neither block upserts it manually.
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Magic link: self-confirming OTP. Returns { error } for inline UI feedback.
  const signInWithMagicLink = React.useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT_URL },
    })
    return { error }
  }, [])

  // Fire-and-forget: redirects the whole page to Google, returns via REDIRECT_URL.
  const signInWithGoogle = React.useCallback(() => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL },
    })
  }, [])

  // SIGNED_OUT fires from the listener and nulls session/user. localStorage
  // queue/chains/done data is intentionally left untouched (it is the working
  // state for the now-anonymous session).
  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = React.useMemo(
    () => ({ session, user, loading, signInWithMagicLink, signInWithGoogle, signOut }),
    [session, user, loading, signInWithMagicLink, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Read auth state + actions. Throws outside <AuthProvider> so a missing provider
 * fails loudly at mount. Re-exported from src/hooks/useAuth.js for convenience.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with provider (C4)
export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

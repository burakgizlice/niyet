import React from 'react'

/**
 * Block 8: ephemeral fire/streak state. Lives only in memory for the session —
 * no localStorage, no Supabase, no date logic (persistence is Block 14, by
 * design per PRD §3.5: the streak is session-only and never shames).
 *
 * Default value is null so useStreak() can throw when used outside the provider.
 */
// eslint-disable-next-line react-refresh/only-export-components -- context + provider co-located by design
export const StreakContext = React.createContext(null)

export function StreakProvider({ children }) {
  const [streakCount, setStreakCount] = React.useState(0)

  const incrementStreak = React.useCallback(() => setStreakCount((n) => n + 1), [])

  // Called by Block 10 (DoneLog/Temizle) on session clear.
  const resetStreak = React.useCallback(() => setStreakCount(0), [])

  // Dev-only console handle for manual reset testing (Block 8 verification).
  React.useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__debug_resetStreak = resetStreak
    return () => {
      delete window.__debug_resetStreak
    }
  }, [resetStreak])

  const value = React.useMemo(
    () => ({ streakCount, incrementStreak, resetStreak }),
    [streakCount, incrementStreak, resetStreak],
  )

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>
}

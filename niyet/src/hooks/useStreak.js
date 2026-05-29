import { useContext } from 'react'
import { StreakContext } from '../context/StreakContext'

/**
 * Block 8: read the streak. Returns { streakCount, incrementStreak, resetStreak }.
 * Throws when used outside <StreakProvider> so a missing provider fails loudly
 * at mount rather than silently no-op'ing.
 */
export default function useStreak() {
  const ctx = useContext(StreakContext)
  if (!ctx) throw new Error('useStreak must be inside StreakProvider')
  return ctx
}

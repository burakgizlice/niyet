import React from 'react'
import { readDone, writeDone, clearDone as clearDoneStorage } from '../lib/storage'
import { useAuth } from './useAuth'
import { syncDoneAdd, syncDoneClear } from '../lib/sync'

/** @typedef {{ id: string, text: string, completedAt: number }} DoneItem */

/**
 * Block 4: owns the `done` array, decoupled from the queue. Lifted to App.jsx
 * so Block 8 (fire streak) and Block 10 (done log) share one instance.
 *
 * Block 14: persisted to localStorage. State reads once via a lazy initialiser
 * (readDone); addDone and clearDone each pair their state update with a matching
 * storage write in the same synchronous call so the two never drift. completedAt
 * stays epoch-ms here — the ISO conversion is the Supabase layer's job (Block 16+).
 *
 * @returns {{ done: DoneItem[], addDone: (item: DoneItem) => void, clearDone: () => void }}
 */
export function useDone() {
  const [done, setDone] = React.useState(() => readDone())
  const doneRef = React.useRef(done)
  React.useEffect(() => {
    doneRef.current = done
  }, [done])

  // Block 18: current user id (null = anon) in a ref so callbacks stay stable.
  const { user } = useAuth()
  const userIdRef = React.useRef(user?.id ?? null)
  React.useEffect(() => {
    userIdRef.current = user?.id ?? null
  }, [user])

  const addDone = React.useCallback((item) => {
    const entry = {
      id: item.id,
      text: item.text,
      completedAt: item.completedAt ?? Date.now(),
    }
    const next = [...doneRef.current, entry]
    writeDone(next)
    setDone(next)
    syncDoneAdd(userIdRef.current, entry)
  }, [])

  const clearDone = React.useCallback(() => {
    clearDoneStorage()
    setDone([])
    syncDoneClear(userIdRef.current)
  }, [])

  // Block 18: replace the done log wholesale with mergeOnLogin's merged result.
  const hydrate = React.useCallback((nextDone) => {
    setDone(nextDone)
  }, [])

  return { done, addDone, clearDone, hydrate }
}

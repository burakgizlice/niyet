import React from 'react'

/** @typedef {{ id: string, text: string, completedAt: number }} DoneItem */

/**
 * Block 4: owns the in-memory `done` array, decoupled from the queue.
 * Lifted to App.jsx so Block 8 (fire streak) and Block 10 (done log) can share
 * one instance. Block 14 will add localStorage here without touching useQueue.
 *
 * @returns {{ done: DoneItem[], addDone: (item: DoneItem) => void, clearDone: () => void }}
 */
export function useDone() {
  const [done, setDone] = React.useState([])

  const addDone = React.useCallback((item) => {
    const entry = {
      id: item.id,
      text: item.text,
      completedAt: item.completedAt ?? Date.now(),
    }
    setDone((prev) => [...prev, entry])
  }, [])

  const clearDone = React.useCallback(() => {
    setDone([])
  }, [])

  return { done, addDone, clearDone }
}

import React from 'react'
import { playCutSound } from '../lib/audio'
import { REWARD_WINDOW_MS } from '../constants/animation'
import { readQueue, writeQueue } from '../lib/storage'
import { useAuth } from './useAuth'
import { syncQueueAdd, syncQueueRemove, syncQueueClear } from '../lib/sync'

/** @typedef {{ id: string, text: string }} Task */

/**
 * Block 4: real queue state + the split start/commit completion actions.
 *
 * `completeTask(id)` only STARTS the exit animation (adds id to completingIds).
 * `finalizeComplete(id)` does the actual mutation (push to done, remove from
 * queue, clear the flag) and is invoked from TaskCard's transitionend handler,
 * never from a timer — so the animation->commit ordering stays correct.
 *
 * `addDone` is injected from App.jsx (wired to useDone) so this hook stays
 * decoupled from the done store.
 *
 * Block 14: the queue is the localStorage source of truth. State is read once
 * via a lazy initialiser (readQueue) and every mutation is persisted with a
 * paired writeQueue in the same synchronous call — never via an effect — so
 * storage can't drift from state. (showCount moved to App.jsx, see decision C7.)
 *
 * @param {{ addDone: (item: { id: string, text: string, completedAt: number }) => void }} deps
 */
export function useQueue({ addDone } = {}) {
  const [queue, setQueue] = React.useState(() => readQueue())
  const [completingIds, setCompletingIds] = React.useState(() => new Set())

  // Block 18: the signed-in user's id (null when anonymous), held in a ref so the
  // mutation callbacks stay stable while still firing remote mirrors for the
  // current user. The sync wrappers no-op when userId is null (anon = local only).
  const { user } = useAuth()
  const userIdRef = React.useRef(user?.id ?? null)
  React.useEffect(() => {
    userIdRef.current = user?.id ?? null
  }, [user])

  // Mirror of queue for reads inside finalizeComplete, so addDone (a side effect)
  // can run OUTSIDE the setQueue updater. Updaters must be pure: StrictMode
  // double-invokes them in dev, which would call addDone twice per completion.
  const queueRef = React.useRef(queue)
  React.useEffect(() => {
    queueRef.current = queue
  }, [queue])

  // Mirror of completingIds so the mutex check + the playCutSound() side effect
  // run OUTSIDE the setCompletingIds updater. Updaters must stay pure: StrictMode
  // double-invokes them in dev, which would fire the cut twice per completion.
  const completingIdsRef = React.useRef(completingIds)
  React.useEffect(() => {
    completingIdsRef.current = completingIds
  }, [completingIds])

  // Block 6: re-entry guard for the reward-hold phase. During the hold,
  // completingIds is still empty, so the completingIdsRef mutex does not cover
  // it — this Set bridges tap -> exit-start. Map tracks the outstanding hold
  // timers so they can be cleared on unmount (avoid setting state after unmount).
  const rewardingIdsRef = React.useRef(new Set())
  const rewardTimersRef = React.useRef(new Map())
  React.useEffect(() => {
    const timers = rewardTimersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  // Starts the completion sequence. Plays the cut sound immediately, then HOLDS the
  // card stationary for REWARD_WINDOW_MS (so the checkmark draw + glow register)
  // before adding the id to completingIds — which is what kicks off the exit
  // animation. No-op while the task is already rewarding or animating out
  // (double-tap mutex). Does NOT mutate the queue.
  const completeTask = React.useCallback((id) => {
    if (rewardingIdsRef.current.has(id) || completingIdsRef.current.has(id)) {
      return // mutex: ignore re-entry during hold or exit
    }
    rewardingIdsRef.current.add(id)
    playCutSound() // real completion start -> fire the calligraphic-cut sound
    const timer = setTimeout(() => {
      rewardingIdsRef.current.delete(id)
      rewardTimersRef.current.delete(id)
      setCompletingIds((prev) => new Set(prev).add(id))
    }, REWARD_WINDOW_MS)
    rewardTimersRef.current.set(id, timer)
  }, [])

  // Commits the completion. Invoked once the exit animation ends. Idempotent:
  // once the task has been filtered out, a repeat call finds nothing and is a
  // no-op (no double addDone). addDone runs in the callback body, never in an
  // updater.
  const finalizeComplete = React.useCallback(
    (id) => {
      const task = queueRef.current.find((t) => t.id === id)
      if (!task) return // already removed -> idempotent
      addDone?.({ id: task.id, text: task.text, completedAt: Date.now() })
      const nextQueue = queueRef.current.filter((t) => t.id !== id)
      writeQueue(nextQueue)
      setQueue(nextQueue)
      // Mirror the removal remotely (done insertion is mirrored by useDone). The
      // shifted positions of the remaining items are left as a remote gap — the
      // next mergeOnLogin reindexes, so per-completion reorder upserts are wasteful.
      syncQueueRemove(userIdRef.current, id)
      setCompletingIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    [addDone],
  )

  // Block 9: canonical append contract. Accepts pre-split, pre-trimmed,
  // non-empty strings (the caller does the splitting). Chains-load (Block 12)
  // and sync (Block 18) call this same function with a string[], so it must
  // stay stable. One setQueue call keeps the appended batch to a single render.
  const appendSteps = React.useCallback((lines) => {
    const base = queueRef.current.length
    const newItems = lines.map((text) => ({ id: crypto.randomUUID(), text }))
    const nextQueue = [...queueRef.current, ...newItems]
    writeQueue(nextQueue)
    setQueue(nextQueue)
    // Mirror each appended item with its final position (= array index).
    const userId = userIdRef.current
    newItems.forEach((item, j) => {
      syncQueueAdd(userId, { id: item.id, text: item.text, position: base + j })
    })
  }, [])

  // Edit a queued item's text in place. Trims and guards against empty/unchanged
  // text (the caller treats an empty save as a cancel, but we double-guard here).
  // syncQueueAdd is an upsert by id, so re-mirroring with the same id updates the
  // remote row's text; position is the item's current array index.
  const editTask = React.useCallback((id, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const index = queueRef.current.findIndex((t) => t.id === id)
    if (index === -1) return
    if (queueRef.current[index].text === trimmed) return
    const nextQueue = queueRef.current.map((t) =>
      t.id === id ? { ...t, text: trimmed } : t,
    )
    writeQueue(nextQueue)
    setQueue(nextQueue)
    syncQueueAdd(userIdRef.current, { id, text: trimmed, position: index })
  }, [])

  // Silent removal: drop a queued item without completing it — NOT pushed to the
  // done store, so no streak, celebration, or tulip. Distinct from
  // finalizeComplete. Idempotent: a missing id is a no-op.
  const removeTask = React.useCallback((id) => {
    if (!queueRef.current.some((t) => t.id === id)) return
    const nextQueue = queueRef.current.filter((t) => t.id !== id)
    writeQueue(nextQueue)
    setQueue(nextQueue)
    syncQueueRemove(userIdRef.current, id)
  }, [])

  // Wipe the entire queue in one gesture (the 'Sıfırla' control). Like
  // removeTask, completed items are untouched — this only empties the active
  // queue. The remote mirror is a single DELETE (syncQueueClear), not N removes.
  const clearQueue = React.useCallback(() => {
    if (queueRef.current.length === 0) return
    writeQueue([])
    setQueue([])
    syncQueueClear(userIdRef.current)
  }, [])

  // Block 18: replace the queue wholesale with mergeOnLogin's merged result.
  // localStorage was already written by mergeOnLogin (setAll) — this only syncs
  // React state. queueRef catches up via its effect.
  const hydrate = React.useCallback((nextQueue) => {
    setQueue(nextQueue)
  }, [])

  return {
    queue,
    completingIds,
    completeTask,
    finalizeComplete,
    appendSteps,
    editTask,
    removeTask,
    clearQueue,
    hydrate,
  }
}

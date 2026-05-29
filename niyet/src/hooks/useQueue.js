import React from 'react'
import { playTickSound } from '../lib/audio'
import { REWARD_WINDOW_MS } from '../constants/animation'

/** @typedef {{ id: string, text: string, createdAt?: number }} Task */

/** @type {Task[]} */
const SEED_TASKS = [
  { id: '1', text: 'banyoya git (abdest için)' },
  { id: '2', text: 'abdest al' },
  { id: '3', text: 'odana su getir' },
  { id: '4', text: 'su iç' },
  { id: '5', text: 'seccadenin önünde dur' },
]

// Block 9: the queue now starts empty — users add their own steps via AddSteps.
// Flip to true to seed demo tasks for manual testing (off in normal use, so a
// page reload yields an empty queue until Block 14 adds localStorage).
const DEV_SEED = false

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
 * TODO Block 14: persist queue + showCount over a localStorage source-of-truth layer.
 *
 * @param {{ addDone: (item: { id: string, text: string, completedAt: number }) => void }} deps
 */
export function useQueue({ addDone } = {}) {
  const [queue, setQueue] = React.useState(DEV_SEED ? SEED_TASKS : [])
  const [showCount, setShowCount] = React.useState(1)
  const [completingIds, setCompletingIds] = React.useState(() => new Set())

  // Mirror of queue for reads inside finalizeComplete, so addDone (a side effect)
  // can run OUTSIDE the setQueue updater. Updaters must be pure: StrictMode
  // double-invokes them in dev, which would call addDone twice per completion.
  const queueRef = React.useRef(queue)
  React.useEffect(() => {
    queueRef.current = queue
  }, [queue])

  // Mirror of completingIds so the mutex check + the playTickSound() side effect
  // run OUTSIDE the setCompletingIds updater. Updaters must stay pure: StrictMode
  // double-invokes them in dev, which would fire the tick twice per completion.
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

  // Starts the completion sequence. Plays the tick immediately, then HOLDS the
  // card stationary for REWARD_WINDOW_MS (so the checkmark draw + glow register)
  // before adding the id to completingIds — which is what kicks off the exit
  // animation. No-op while the task is already rewarding or animating out
  // (double-tap mutex). Does NOT mutate the queue.
  const completeTask = React.useCallback((id) => {
    if (rewardingIdsRef.current.has(id) || completingIdsRef.current.has(id)) {
      return // mutex: ignore re-entry during hold or exit
    }
    rewardingIdsRef.current.add(id)
    playTickSound() // real completion start -> fire the reward tick
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
      setQueue((q) => q.filter((t) => t.id !== id))
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
    const newItems = lines.map((text) => ({
      id: crypto.randomUUID(),
      text,
      createdAt: Date.now(),
    }))
    setQueue((prev) => [...prev, ...newItems])
  }, [])

  return {
    queue,
    showCount,
    setShowCount,
    completingIds,
    completeTask,
    finalizeComplete,
    appendSteps,
  }
}

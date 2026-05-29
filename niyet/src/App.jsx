import { useEffect, useRef, useState } from 'react'
import Queue from './components/Queue'
import AddSteps from './components/AddSteps'
import CelebrationBurst from './components/CelebrationBurst'
import { useDone } from './hooks/useDone'
import { useQueue } from './hooks/useQueue'
import useStreak from './hooks/useStreak'
import { unlockAudio } from './lib/audio'

function App() {
  // `done` / `clearDone` are held here for Blocks 8 (fire streak) and 10 (done
  // log). `done` is read here as the burst trigger source; addDone is wired into
  // useQueue so the queue commits completed tasks into the shared done store.
  const { done, addDone } = useDone()
  const queueApi = useQueue({ addDone })
  const { incrementStreak } = useStreak()

  // View router (Block 9). Valid views: 'main' | 'add' | 'chains' | 'chain-edit'
  // | 'auth'. Only 'main' and 'add' are rendered here; the other three are
  // reserved for later blocks (12/13 chains, 17 auth). Navigation state is
  // intentionally not persisted — a reload resets to 'main'.
  const [view, setView] = useState('main')

  // Block 7 (burst) + Block 8 (streak): `done.length` grows only on a committed
  // completion, so a rising-edge guard ensures we react only on real completions
  // (never on mount). The streak increments on every committed completion; the
  // burst fires on every 3rd completion or whenever a completion empties the
  // queue. Driving both from this one signal keeps all reward effects (sound,
  // checkmark, streak, burst) synchronized — they all land after the completion
  // animation's REWARD_WINDOW + exit, since that's when done.length grows.
  const [burstActive, setBurstActive] = useState(false)
  const prevDoneLength = useRef(done.length)
  useEffect(() => {
    if (done.length <= prevDoneLength.current) return
    prevDoneLength.current = done.length
    incrementStreak()
    if (done.length % 3 === 0 || queueApi.queue.length === 0) {
      setBurstActive(true)
    }
  }, [done.length, queueApi.queue.length, incrementStreak])

  // Unlock the AudioContext on the first user gesture (iOS Safari autoplay
  // policy). One-time per event; cleaned up on unmount.
  useEffect(() => {
    const handler = () => unlockAudio()
    window.addEventListener('touchstart', handler, { once: true })
    window.addEventListener('mousedown', handler, { once: true })
    return () => {
      window.removeEventListener('touchstart', handler)
      window.removeEventListener('mousedown', handler)
    }
  }, [])

  if (view === 'add') {
    return (
      <AddSteps
        onBack={() => setView('main')}
        onSubmit={(lines) => {
          queueApi.appendSteps(lines)
          setView('main')
        }}
      />
    )
  }

  return (
    <>
      <Queue {...queueApi} onAddSteps={() => setView('add')} />
      <CelebrationBurst active={burstActive} onDone={() => setBurstActive(false)} />
    </>
  )
}

export default App

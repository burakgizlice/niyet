import { useEffect, useRef, useState } from 'react'
import Queue from './components/Queue'
import CelebrationBurst from './components/CelebrationBurst'
import { useDone } from './hooks/useDone'
import { useQueue } from './hooks/useQueue'
import { unlockAudio } from './lib/audio'

function App() {
  // `done` / `clearDone` are held here for Blocks 8 (fire streak) and 10 (done
  // log). `done` is read here as the burst trigger source; addDone is wired into
  // useQueue so the queue commits completed tasks into the shared done store.
  const { done, addDone } = useDone()
  const queueApi = useQueue({ addDone })

  // Block 7: celebration burst. `done.length` grows only on a committed
  // completion, so a rising-edge guard ensures we fire only on real completions
  // (never on mount). Fire on every 3rd completion or whenever a completion
  // empties the queue; a single OR collapses simultaneous conditions into one
  // burst. burstActive resets only via onDone, suppressing overlapping bursts.
  const [burstActive, setBurstActive] = useState(false)
  const prevDoneLength = useRef(done.length)
  useEffect(() => {
    if (done.length <= prevDoneLength.current) return
    prevDoneLength.current = done.length
    if (done.length % 3 === 0 || queueApi.queue.length === 0) {
      setBurstActive(true)
    }
  }, [done.length, queueApi.queue.length])

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

  return (
    <>
      <Queue {...queueApi} />
      <CelebrationBurst active={burstActive} onDone={() => setBurstActive(false)} />
    </>
  )
}

export default App

import { useEffect } from 'react'
import Queue from './components/Queue'
import { useDone } from './hooks/useDone'
import { useQueue } from './hooks/useQueue'
import { unlockAudio } from './lib/audio'

function App() {
  // `done` / `clearDone` are held here for Blocks 8 (fire streak) and 10 (done
  // log); not yet rendered. addDone is wired into useQueue so the queue commits
  // completed tasks into the shared done store.
  const { addDone } = useDone()
  const queueApi = useQueue({ addDone })

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

  return <Queue {...queueApi} />
}

export default App

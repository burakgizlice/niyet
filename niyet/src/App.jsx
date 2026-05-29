import { useEffect, useRef, useState } from 'react'
import Queue from './components/Queue'
import AddSteps from './components/AddSteps'
import Chains from './components/Chains'
import ChainEdit from './components/ChainEdit'
import CelebrationBurst from './components/CelebrationBurst'
import { useDone } from './hooks/useDone'
import { useQueue } from './hooks/useQueue'
import { useChains } from './hooks/useChains'
import useStreak from './hooks/useStreak'
import { unlockAudio } from './lib/audio'
import { readShowCount, writeShowCount } from './lib/storage'

function App() {
  // `done` / `clearDone` are held here for Blocks 8 (fire streak) and 10 (done
  // log). `done` is read here as the burst trigger source; addDone is wired into
  // useQueue so the queue commits completed tasks into the shared done store.
  const { done, addDone, clearDone } = useDone()
  const queueApi = useQueue({ addDone })
  const { incrementStreak, resetStreak } = useStreak()

  // useChains is stateful (Block 13 CRUD), so it lives here as a single instance
  // and is prop-drilled to Chains/ChainEdit — calling it in each component would
  // fork the collection. selectedChain carries the edit target: null = create.
  const { chains, createChain, updateChain, deleteChain, resetChain } = useChains()
  const [selectedChain, setSelectedChain] = useState(null)

  // View router (Block 9). Valid views: 'main' | 'add' | 'chains' | 'chain-edit'
  // | 'auth'. Only 'main' and 'add' are rendered here; the other three are
  // reserved for later blocks (12/13 chains, 17 auth). Navigation state is
  // intentionally not persisted — a reload resets to 'main'.
  const [view, setView] = useState('main')

  // Block 14 (decision C7): show_count lives here, not in useQueue/Queue, so
  // Block 18 can sync profiles.show_count from App without reaching into Queue.
  // The handler pairs the persist with the state update (no useEffect, which
  // would fire spuriously under StrictMode's double render).
  const [showCount, setShowCount] = useState(() => readShowCount())
  const handleCountChange = (n) => {
    writeShowCount(n)
    setShowCount(n)
  }

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

  // Block 10: Temizle clears the done log and resets the streak in one gesture.
  // Composed here (not inside a hook) because resetStreak is only reachable
  // through useStreak's return — see spec Q2. prevDoneLength is rewound to 0 so
  // the rising-edge guard above still fires on the next completion (otherwise the
  // stale high-water mark would swallow the first post-clear increment).
  const handleTemizle = () => {
    clearDone()
    resetStreak()
    prevDoneLength.current = 0
  }

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

  if (view === 'chains') {
    return (
      <Chains
        chains={chains}
        setView={setView}
        setSelectedChain={setSelectedChain}
        appendSteps={queueApi.appendSteps}
        deleteChain={deleteChain}
      />
    )
  }

  if (view === 'chain-edit') {
    const handleChainSave = ({ name, emoji, steps }) => {
      if (selectedChain === null) {
        createChain(name, emoji, steps)
      } else {
        updateChain(selectedChain.id, { name, emoji, steps })
      }
      setView('chains')
    }
    return (
      <ChainEdit
        chain={selectedChain}
        onSave={handleChainSave}
        onCancel={() => setView('chains')}
        onDelete={deleteChain}
        onReset={resetChain}
      />
    )
  }

  return (
    <>
      <Queue
        {...queueApi}
        showCount={showCount}
        setShowCount={handleCountChange}
        doneItems={done}
        onTemizle={handleTemizle}
        onAddSteps={() => setView('add')}
        onShowChains={() => setView('chains')}
      />
      <CelebrationBurst active={burstActive} onDone={() => setBurstActive(false)} />
    </>
  )
}

export default App

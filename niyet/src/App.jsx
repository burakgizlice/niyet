import { useEffect, useRef, useState } from 'react'
import Queue from './components/Queue'
import AddSteps from './components/AddSteps'
import Chains from './components/Chains'
import ChainEdit from './components/ChainEdit'
import AuthView from './components/AuthView'
import CelebrationBurst from './components/CelebrationBurst'
import { useDone } from './hooks/useDone'
import { useQueue } from './hooks/useQueue'
import { useChains } from './hooks/useChains'
import useStreak from './hooks/useStreak'
import { useAuth } from './hooks/useAuth'
import { unlockAudio } from './lib/audio'
import { TOKENS } from './tokens'
import { readShowCount, writeShowCount } from './lib/storage'
import { mergeOnLogin, bootstrapOfflineListener } from './lib/sync'

function App() {
  // `done` / `clearDone` are held here for Blocks 8 (fire streak) and 10 (done
  // log). `done` is read here as the burst trigger source; addDone is wired into
  // useQueue so the queue commits completed tasks into the shared done store.
  const { done, addDone, clearDone, hydrate: hydrateDone } = useDone()
  const queueApi = useQueue({ addDone })
  const { incrementStreak, resetStreak } = useStreak()

  // useChains is stateful (Block 13 CRUD), so it lives here as a single instance
  // and is prop-drilled to Chains/ChainEdit — calling it in each component would
  // fork the collection. selectedChain carries the edit target: null = create.
  const { chains, createChain, updateChain, deleteChain, resetChain, hydrate: hydrateChains } =
    useChains()
  const [selectedChain, setSelectedChain] = useState(null)

  // View router (Block 9). Valid views: 'main' | 'add' | 'chains' | 'chain-edit'
  // | 'auth'. Only 'main' and 'add' are rendered here; the other three are
  // reserved for later blocks (12/13 chains, 17 auth). Navigation state is
  // intentionally not persisted — a reload resets to 'main'.
  const [view, setView] = useState('main')

  // Block 17 (C4): App consumes auth state from context — it does not own it.
  // `loading` gates the initial loading screen; `session` lets the app leave the
  // auth view once sign-in completes so the user is never stranded there — most
  // visibly when sign-in lands in another tab and Supabase broadcasts SIGNED_IN
  // across tabs. Syncing local view state to that external auth event is exactly
  // what an effect is for, hence the targeted rule suppression.
  const { loading, session, user, signInWithMagicLink, signInWithGoogle } = useAuth()
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing view to cross-tab auth state
    if (session && view === 'auth') setView('main')
  }, [session, view])

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

  // Block 18: merge-on-login. userIdRef always tracks the current uid for the
  // offline listener's getUserId closure. mergeStartedRef is a synchronous
  // once-per-uid guard so mergeOnLogin runs exactly once per sign-in despite
  // StrictMode's dev double-mount and cross-tab SIGNED_IN rebroadcasts; it is
  // set before the async call (not in .then) so the second mount sees it and
  // skips, while the first call's hydrate still lands. Reset on sign-out.
  const userIdRef = useRef(null)
  const mergeStartedRef = useRef(null)
  useEffect(() => {
    bootstrapOfflineListener(() => userIdRef.current)
  }, [])

  useEffect(() => {
    const uid = user?.id ?? null
    userIdRef.current = uid
    if (!uid) {
      mergeStartedRef.current = null
      return
    }
    if (mergeStartedRef.current === uid) return
    mergeStartedRef.current = uid
    mergeOnLogin(user).then((merged) => {
      queueApi.hydrate(merged.queue)
      hydrateDone(merged.done)
      hydrateChains(merged.chains)
      setShowCount(merged.show_count)
      // The merged done log grows React state without a real completion, so
      // advance the rising-edge high-water mark to suppress a spurious streak
      // increment / celebration burst on login.
      prevDoneLength.current = merged.done.length
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed off user.id only; hydrate fns are stable
  }, [user?.id])

  // Block 17: hold the first paint until Supabase has restored any persisted
  // session, so a signed-in reload never flashes the anonymous main view.
  if (loading) {
    return <LoadingScreen />
  }

  if (view === 'auth') {
    return (
      <AuthView
        onBack={() => setView('main')}
        signInWithMagicLink={signInWithMagicLink}
        signInWithGoogle={signInWithGoogle}
      />
    )
  }

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
        onOpenAuth={() => setView('auth')}
      />
      <CelebrationBurst active={burstActive} onDone={() => setBurstActive(false)} />
    </>
  )
}

// Full-screen mount state shown while the persisted Supabase session is being
// restored. The Arabic نية wordmark breathes via a slow opacity pulse — no
// spinner, no layout jank, consistent with the emerald/calligraphy theme.
function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: TOKENS.colors.bg,
      }}
    >
      <style>{`@keyframes niyetWordmarkPulse { 0%,100% { opacity: 0.35 } 50% { opacity: 1 } }`}</style>
      <span
        lang="ar"
        dir="rtl"
        style={{
          color: TOKENS.colors.gold,
          fontSize: '3.5rem',
          fontWeight: 600,
          animation: 'niyetWordmarkPulse 1.8s ease-in-out infinite',
        }}
      >
        نية
      </span>
    </div>
  )
}

export default App

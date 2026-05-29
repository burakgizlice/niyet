import { useState, useRef, useEffect } from 'react'
import { TOKENS } from '../tokens'
import CountSelector from './CountSelector'
import TaskCard from './TaskCard'
import Bostan from './Bostan'
import AuthHeader from './AuthHeader'
import DoneLog from './DoneLog'
import EmptyState from './EmptyState'
import RefreshButton from './RefreshButton'
import PullToRefresh from './PullToRefresh'

// Resolve the pointer type once at module load: desktop (fine) gets the refresh
// button, touch (coarse) gets pull-to-refresh. Pointer type is fixed for a
// session in practice, so a single read is enough (and SSR-safe).
const IS_COARSE_POINTER =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches

/** @typedef {{ id: string, text: string }} Task */

/**
 * Block 4: queue state is now sourced from the useQueue hook (hosted in App.jsx
 * and prop-drilled here). Every visible card is completable. Queue drains
 * gracefully to the empty state.
 *
 * @param {{
 *   queue: Task[],
 *   showCount: number,
 *   setShowCount: (n: number) => void,
 *   completingIds: Set<string>,
 *   completeTask: (id: string) => void,
 *   finalizeComplete: (id: string) => void,
 *   editTask: (id: string, text: string) => void,
 *   removeTask: (id: string) => void,
 *   clearQueue: () => void,
 *   doneItems: { id: string, text: string, completedAt: number }[],
 *   onTemizle: () => void,
 *   onAddSteps: () => void,
 *   onShowChains: () => void,
 *   onOpenAuth: () => void,
 *   onRefresh: () => void,
 *   refreshing: boolean,
 *   isSignedIn: boolean,
 * }} props
 */
export default function Queue({
  queue,
  showCount,
  setShowCount,
  completingIds,
  completeTask,
  finalizeComplete,
  editTask,
  removeTask,
  clearQueue,
  doneItems,
  onTemizle,
  onAddSteps,
  onShowChains,
  onOpenAuth,
  onRefresh,
  refreshing,
  isSignedIn,
}) {
  // Block 19: pull-to-refresh on touch devices, refresh button on desktop. Both
  // gated on a signed-in user — anonymous state is local-only. The gesture lives
  // in the PullToRefresh child so its per-frame updates don't re-render Queue.
  const canPull = isSignedIn && IS_COARSE_POINTER
  const showButton = isSignedIn && !IS_COARSE_POINTER
  const current = queue[0] ?? null
  const visibleTasks = queue.slice(0, showCount)
  const queued = queue.length - showCount

  // 'Sıfırla' (clear the whole queue) is a two-tap inline confirm: the first tap
  // arms it ('Emin misin?') for CLEAR_CONFIRM_MS, the second tap wipes. A lone
  // accidental tap reverts on its own — no off-brand confirm() dialog.
  const [confirmingClear, setConfirmingClear] = useState(false)
  const confirmTimerRef = useRef(null)
  useEffect(
    () => () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    },
    [],
  )
  const CLEAR_CONFIRM_MS = 3000
  const handleClearClick = () => {
    if (confirmingClear) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      setConfirmingClear(false)
      clearQueue()
    } else {
      setConfirmingClear(true)
      confirmTimerRef.current = setTimeout(() => setConfirmingClear(false), CLEAR_CONFIRM_MS)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: TOKENS.colors.bg,
        padding: '1.5rem 1rem',
      }}
    >
      <PullToRefresh onRefresh={onRefresh} refreshing={refreshing} enabled={canPull} />
      <div style={{ maxWidth: TOKENS.spacing.containerMaxWidth, width: '100%' }}>
        {/* Brand mark — the Aref Ruqaa wordmark on cream, the app's signature. */}
        <div
          className="niyet-fade-up"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <img
            src="/wordmark-cream.svg"
            alt="niyet"
            style={{ height: '34px', width: 'auto', opacity: 0.96 }}
          />
          <div className="niyet-gold-rule" style={{ maxWidth: '180px' }} />
        </div>
        {/* Auth affordance (Eşitle ↔ avatar pill). The streak now lives in its
            own full-width bostan strip below, so this row holds only auth. */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '48px',
            marginBottom: '8px',
          }}
        >
          <AuthHeader onOpenAuth={onOpenAuth} />
          {showButton && <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />}
        </header>
        {/* The bostan: a garden bed that fills with gold-line tulips, one per
            completed micro-action. Renders nothing at count 0. */}
        <Bostan />
        {current !== null ? (
          <>
            <CountSelector value={showCount} onChange={setShowCount} />
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {visibleTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  text={task.text}
                  index={index}
                  isCompleting={completingIds.has(task.id)}
                  onComplete={completeTask}
                  onCompleteEnd={finalizeComplete}
                  onEdit={editTask}
                  onDelete={removeTask}
                  isInteractive
                />
              ))}
            </div>
            {queued > 0 && (
              <p
                style={{
                  textAlign: 'center',
                  color: TOKENS.colors.textMuted,
                  fontSize: '0.85rem',
                  marginTop: '12px',
                  letterSpacing: '0.02em',
                }}
              >
                +{queued} adım sırada
              </p>
            )}
          </>
        ) : (
          <EmptyState hasDone={doneItems.length > 0} />
        )}
        {/* Action bar: '+ Ekle' (ad-hoc entry) and 'Zincirler' (load a chain)
            are the two entry points, kept visible whether the queue is full or
            empty. Ekle is the gold-bordered primary; Zincirler is the muted
            secondary. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '2rem',
          }}
        >
          <button
            type="button"
            onClick={onAddSteps}
            className="niyet-shimmer"
            style={{
              background: TOKENS.gradients.goldButton,
              color: '#2a1e05',
              fontFamily: TOKENS.fonts.ui,
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.01em',
              border: 'none',
              borderRadius: TOKENS.radii.pill,
              padding: '12px 28px',
              minHeight: '46px',
              cursor: 'pointer',
              boxShadow: TOKENS.shadows.gold,
            }}
          >
            + Ekle
          </button>
          <button
            type="button"
            onClick={onShowChains}
            style={{
              background: 'rgba(31,177,121,0.06)',
              color: TOKENS.colors.textPrimary,
              fontFamily: TOKENS.fonts.ui,
              fontWeight: 600,
              fontSize: '1rem',
              border: `1px solid ${TOKENS.lines.emerald}`,
              borderRadius: TOKENS.radii.pill,
              padding: '12px 28px',
              minHeight: '46px',
              cursor: 'pointer',
            }}
          >
            Zincirler
          </button>
        </div>
        {current !== null && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={handleClearClick}
              style={{
                background: 'transparent',
                color: confirmingClear ? TOKENS.colors.error : TOKENS.colors.textDim,
                fontFamily: TOKENS.fonts.ui,
                fontSize: '0.8rem',
                letterSpacing: '0.02em',
                border: `1px solid ${confirmingClear ? TOKENS.colors.error : TOKENS.lines.hair}`,
                borderRadius: TOKENS.radii.pill,
                padding: '0.4rem 1rem',
                minHeight: '34px',
                cursor: 'pointer',
                transition: `color 160ms ${TOKENS.motion.easeOut}, border-color 160ms ${TOKENS.motion.easeOut}`,
              }}
            >
              {confirmingClear ? 'Emin misin?' : 'Sıfırla'}
            </button>
          </div>
        )}
        <DoneLog doneItems={doneItems} onTemizle={onTemizle} />
      </div>
    </div>
  )
}

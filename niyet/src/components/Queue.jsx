import { TOKENS } from '../tokens'
import CountSelector from './CountSelector'
import TaskCard from './TaskCard'
import FireBadge from './FireBadge'
import AuthHeader from './AuthHeader'
import DoneLog from './DoneLog'
import EmptyState from './EmptyState'

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
 *   doneItems: { id: string, text: string, completedAt: number }[],
 *   onTemizle: () => void,
 *   onAddSteps: () => void,
 *   onShowChains: () => void,
 *   onOpenAuth: () => void,
 * }} props
 */
export default function Queue({
  queue,
  showCount,
  setShowCount,
  completingIds,
  completeTask,
  finalizeComplete,
  doneItems,
  onTemizle,
  onAddSteps,
  onShowChains,
  onOpenAuth,
}) {
  const current = queue[0] ?? null
  const visibleTasks = queue.slice(0, showCount)
  const queued = queue.length - showCount

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
      <div style={{ maxWidth: TOKENS.spacing.containerMaxWidth, width: '100%' }}>
        {/* Header seam: fixed minHeight reserves space so the badge appearing /
            growing across tiers never shifts the cards down (glow overflows
            visually). space-between pins the FireBadge to the right edge so the
            auth affordance on the left can change width (Eşitle ↔ avatar pill)
            without nudging the streak (Block 17, step 17.7). */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '56px',
            overflow: 'visible',
            marginBottom: '8px',
          }}
        >
          <AuthHeader onOpenAuth={onOpenAuth} />
          <FireBadge />
        </header>
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
            style={{
              background: TOKENS.colors.surfaceRaised,
              color: TOKENS.colors.gold,
              fontWeight: 600,
              fontSize: '1rem',
              border: `1px solid ${TOKENS.colors.gold}`,
              borderRadius: '999px',
              padding: '10px 24px',
              minHeight: '44px',
              cursor: 'pointer',
            }}
          >
            + Ekle
          </button>
          <button
            type="button"
            onClick={onShowChains}
            style={{
              background: 'transparent',
              color: TOKENS.colors.textMuted,
              fontWeight: 600,
              fontSize: '1rem',
              border: `1px solid ${TOKENS.colors.emeraldDim}`,
              borderRadius: '999px',
              padding: '10px 24px',
              minHeight: '44px',
              cursor: 'pointer',
            }}
          >
            Zincirler
          </button>
        </div>
        <DoneLog doneItems={doneItems} onTemizle={onTemizle} />
      </div>
    </div>
  )
}

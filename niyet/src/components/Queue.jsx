import React from 'react'
import { TOKENS } from '../tokens'
import CountSelector from './CountSelector'
import TaskCard from './TaskCard'
import FireBadge from './FireBadge'

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
 *   onAddSteps: () => void,
 * }} props
 */
export default function Queue({
  queue,
  showCount,
  setShowCount,
  completingIds,
  completeTask,
  finalizeComplete,
  onAddSteps,
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
            visually). Right-aligned to leave room for a future wordmark. */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            minHeight: '56px',
            overflow: 'visible',
            marginBottom: '8px',
          }}
        >
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
          <p
            style={{
              color: TOKENS.colors.textMuted,
              fontSize: TOKENS.typography.uiFontSize,
              textAlign: 'center',
              paddingTop: '4rem',
            }}
          >
            Sırada bir şey yok — bir adım ekle ya da bir zincir yükle.
          </p>
        )}
        {/* Action bar: the '+ Ekle' affordance is the primary entry point for
            ad-hoc task entry, so it stays visible whether the queue is full or
            empty. Block 12 will add a 'Zincirler' button alongside it. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
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
        </div>
      </div>
    </div>
  )
}

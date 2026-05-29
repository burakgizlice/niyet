import React from 'react'
import { TOKENS } from '../tokens'
import CountSelector from './CountSelector'
import TaskCard from './TaskCard'

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
 * }} props
 */
export default function Queue({
  queue,
  showCount,
  setShowCount,
  completingIds,
  completeTask,
  finalizeComplete,
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
      </div>
    </div>
  )
}

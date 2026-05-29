import { useEffect, useRef, useState } from 'react'
import '../styles/burst.css'

// Block 7: ephemeral dopamine-reward burst. Parent owns a single `active`
// boolean; flipping it false->true fires one burst. The component renders 18
// emoji particles that radiate from screen centre, self-remove on
// animationend, and signal `onDone` once cleanup is complete so the parent can
// reset `active`. No persistence, no sound, no streak counter (other blocks).

const EMOJIS = ['⭐', '✨', '🌟', '💫', '🎉', '🚀', '💎', '🔥', '🌙', '⚡']
const PARTICLE_COUNT = 18
// 1.4s anim + up to 0.28s delay = 1.68s worst case; clear at 1.75s as a hard
// fallback against dropped animationend events (e.g. backgrounded tab).
const CLEANUP_FALLBACK_MS = 1750

// Monotonic id source for React keys. Avoids crypto.randomUUID(), which is
// undefined in non-secure contexts (e.g. testing on a phone over a LAN http
// dev server) — a key only needs to be unique and stable across the per-particle
// filter, not globally random.
let particleSeq = 0

/** @typedef {{ id: number, emoji: string, dx: number, dy: number, spinDeg: number, sizeRem: number, delayMs: number }} ParticleDescriptor */

/** @returns {ParticleDescriptor[]} */
function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angleRad = Math.random() * Math.PI * 2
    const distancePx = 120 + Math.random() * 140
    return {
      id: particleSeq++,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      dx: distancePx * Math.cos(angleRad),
      dy: distancePx * Math.sin(angleRad),
      spinDeg: (Math.random() - 0.5) * 1080,
      sizeRem: 1.4 + Math.random() * 1.2,
      delayMs: Math.random() * 280,
    }
  })
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * @param {{ active: boolean, onDone?: () => void }} props
 */
export default function CelebrationBurst({ active, onDone }) {
  const [particles, setParticles] = useState([])
  // Keep the latest onDone without making it an effect dependency, so a parent
  // passing a fresh inline callback each render doesn't restart the burst.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (!active) return

    // Honor reduced motion: skip the animation entirely but still resolve so
    // the parent's active flag resets cleanly. particles is already empty here
    // (cleared by the prior burst's onDone), so no reset is needed.
    if (prefersReducedMotion()) {
      const t = setTimeout(() => onDoneRef.current?.(), 0)
      return () => clearTimeout(t)
    }

    setParticles(generateParticles())
    const t = setTimeout(() => {
      setParticles([])
      onDoneRef.current?.()
    }, CLEANUP_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [active])

  if (particles.length === 0) return null

  const removeParticle = (id) =>
    setParticles((prev) => prev.filter((p) => p.id !== id))

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="niyet-burst-particle"
          style={{
            fontSize: `${p.sizeRem}rem`,
            animationDelay: `${p.delayMs}ms`,
            '--dx': p.dx,
            '--dy': p.dy,
            '--spin': p.spinDeg,
          }}
          onAnimationEnd={() => removeParticle(p.id)}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}

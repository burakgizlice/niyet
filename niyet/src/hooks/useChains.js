import React from 'react'
import { DEFAULT_CHAINS } from '../data/defaultChains'
import { readChains, writeChains, seedDefaultChainsIfAbsent } from '../lib/storage'

// Seed the 7 defaults on first ever run, before any hook instance reads. Module
// scope so it runs exactly once per load, ahead of the lazy initialiser below.
seedDefaultChainsIfAbsent()

/**
 * Block 12: read side (chains list). Block 13: CRUD + reset.
 *
 * Owns the chains collection as React state. Like useQueue, this hook is
 * stateful — call it ONCE (in App.jsx) and prop-drill the result. Calling it in
 * two places would fork the collection.
 *
 * Any chain can be deleted, defaults included. resetChain still restores a
 * default to its seed values (keyed by the fixed UUID shared across Blocks
 * 12/14/18) for users who edited a default but want it back rather than gone.
 *
 * Block 14: chains are the localStorage source of truth. Defaults are seeded
 * once at module load; state reads once via a lazy initialiser, and every
 * mutation pairs its state update with a writeChains in the same synchronous
 * call. writeChains re-derives position from array order, so callers don't set
 * it. The ?? [] guards the (post-seed impossible) null case defensively.
 *
 * @returns {{
 *   chains: import('../data/defaultChains').Chain[],
 *   createChain: (name: string, emoji: string, steps: string[]) => void,
 *   updateChain: (id: string, fields: Partial<import('../data/defaultChains').Chain>) => void,
 *   deleteChain: (id: string) => void,
 *   resetChain: (id: string) => void,
 * }}
 */
export function useChains() {
  const [chains, setChains] = React.useState(() => readChains() ?? [])
  const chainsRef = React.useRef(chains)
  React.useEffect(() => {
    chainsRef.current = chains
  }, [chains])

  const persist = React.useCallback((next) => {
    writeChains(next)
    setChains(next)
  }, [])

  const createChain = React.useCallback(
    (name, emoji, steps) => {
      const newChain = {
        id: crypto.randomUUID(),
        name,
        emoji,
        steps,
        position: chainsRef.current.length,
        is_default: false,
        created_at: new Date().toISOString(),
      }
      persist([...chainsRef.current, newChain])
    },
    [persist],
  )

  const updateChain = React.useCallback(
    (id, fields) => {
      persist(chainsRef.current.map((c) => (c.id === id ? { ...c, ...fields } : c)))
    },
    [persist],
  )

  const deleteChain = React.useCallback(
    (id) => {
      persist(chainsRef.current.filter((c) => c.id !== id))
    },
    [persist],
  )

  const resetChain = React.useCallback(
    (id) => {
      const seed = DEFAULT_CHAINS.find((c) => c.id === id)
      if (!seed) return
      persist(
        chainsRef.current.map((c) =>
          c.id === id ? { ...c, name: seed.name, emoji: seed.emoji, steps: [...seed.steps] } : c,
        ),
      )
    },
    [persist],
  )

  return { chains, createChain, updateChain, deleteChain, resetChain }
}

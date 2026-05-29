import React from 'react'
import { DEFAULT_CHAINS } from '../data/defaultChains'

/**
 * Block 12: read side (chains list). Block 13: in-memory CRUD + reset.
 *
 * Owns the chains collection as React state, seeded from the frozen
 * DEFAULT_CHAINS. Like useQueue, this hook is stateful — call it ONCE (in
 * App.jsx) and prop-drill the result. Calling it in two places would create two
 * independent collections.
 *
 * is_default chains are editable (updateChain/resetChain) but never deletable —
 * deleteChain guards against them. resetChain restores a default to its seed
 * values, keyed by the fixed UUID shared across Blocks 12/14/18.
 *
 * TODO Block 14: persist mutations through lib/storage (localStorage source of
 * truth). Each mutation below is where the storage write will hook in.
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
  const [chains, setChains] = React.useState(() => DEFAULT_CHAINS.map((c) => ({ ...c })))

  const createChain = React.useCallback((name, emoji, steps) => {
    setChains((prev) => {
      const position = prev.reduce((max, c) => Math.max(max, c.position), -1) + 1
      const newChain = {
        id: crypto.randomUUID(),
        name,
        emoji,
        steps,
        position,
        is_default: false,
        created_at: new Date().toISOString(),
      }
      return [...prev, newChain]
    })
  }, [])

  const updateChain = React.useCallback((id, fields) => {
    setChains((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)))
  }, [])

  const deleteChain = React.useCallback((id) => {
    setChains((prev) => {
      const target = prev.find((c) => c.id === id)
      if (!target || target.is_default) return prev // defaults are protected (use resetChain)
      return prev.filter((c) => c.id !== id)
    })
  }, [])

  const resetChain = React.useCallback((id) => {
    const seed = DEFAULT_CHAINS.find((c) => c.id === id)
    if (!seed) return
    setChains((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, name: seed.name, emoji: seed.emoji, steps: [...seed.steps] } : c,
      ),
    )
  }, [])

  return { chains, createChain, updateChain, deleteChain, resetChain }
}

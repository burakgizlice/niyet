import { DEFAULT_CHAINS } from '../data/defaultChains'

/**
 * Block 12: read-only chains hook. For now it just surfaces the frozen
 * DEFAULT_CHAINS seed — this is the seam Block 13 (CRUD) and Block 14
 * (localStorage) extend with write + persistence behaviour.
 *
 * Intentionally does NOT call useQueue here: useQueue is stateful, so calling it
 * inside this hook would spawn a second, independent queue. The load action
 * (appendSteps + navigate) lives at the call-site in Chains.jsx, fed by the
 * single queueApi held in App.jsx (spec Q1 recommendation).
 *
 * @returns {{ chains: import('../data/defaultChains').Chain[] }}
 */
export function useChains() {
  return { chains: DEFAULT_CHAINS }
}
